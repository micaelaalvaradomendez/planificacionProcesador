import { BaseScheduler } from './scheduler';
import { TelemetryGuards } from '../engine/telemetry';

/**
 * Configuración de envejecimiento para SchedulerPriority
 */
export interface AgingConfig {
  /** Cuántas unidades de tiempo para reducir prioridad en 1 */
  ageQuantum: number;
  /** Cuánto reducir prioridad por cada ageQuantum */
  ageStep: number;
  /** Prioridad mínima (más alta) */
  minPriority: number;
  /** Prioridad máxima (más baja) */
  maxPriority: number;
}

/**
 * Entrada en la cola de prioridad con aging lazy
 */
interface PriorityQueueEntry {
  pid: number;
  priorityBase: number;
  tReady: number; // última vez que entró a LISTO
  seq: number; // para desempate estable
}

/**
 * Scheduler de prioridad con envejecimiento lazy
 * 
 * CONVENCIÓN EXPLÍCITA:
 * - Prioridad numérica menor = mayor prioridad (0 es la más alta, 10 la más baja)
 * - Aging: cada ageQuantum ticks reduce prioridad efectiva en ageStep (mejora)
 * - Preemption: proceso de mayor prioridad puede expropiar al CPU
 * - Lazy evaluation: prioridad efectiva se calcula solo cuando se necesita
 * - Guards: TelemetryGuards + purga en origen + defensive filtering
 * 
 * Aging lazy: pEff(pid, t) = clamp(minPri, maxPri, 
 *                                  priBase - floor((t - tReady) / ageQuantum) * ageStep)
 */
export class SchedulerPriority extends BaseScheduler {
  private readyQueue: PriorityQueueEntry[] = [];
  private basePriorities = new Map<number, number>();
  private agingConfig: AgingConfig;
  private sequenceCounter = 0;

  constructor(
    private readonly getPriorityBase: (pid: number) => number,
    private readonly getRemaining: (pid: number, now: number) => number,
    private readonly getNow: () => number,
    agingConfig: AgingConfig = {
      ageQuantum: 5,
      ageStep: 1,
      minPriority: 1,
      maxPriority: 10
    }
  ) {
    super();
    this.agingConfig = agingConfig;
  }

  /**
   * Calcula prioridad efectiva con aging lazy
   */
  private calcEffectivePriority(pid: number, t: number): number {
    const entry = this.readyQueue.find(e => e.pid === pid);
    if (!entry) {
      // Si no está en ready, usar prioridad base
      const base = this.getPriorityBase(pid);
      return base;
    }

    const { priorityBase, tReady } = entry;
    const ageTime = t - tReady;
    const agingReduction = Math.floor(ageTime / this.agingConfig.ageQuantum) * this.agingConfig.ageStep;
    
    // Menor número = mayor prioridad, así que restamos aging
    const pEff = priorityBase - agingReduction;
    
    // Clamp entre min y max
    return Math.max(
      this.agingConfig.minPriority,
      Math.min(this.agingConfig.maxPriority, pEff)
    );
  }

  /**
   * Ordena cola por (priorityEff ASC, seq ASC, pid ASC) para estabilidad
   */
  private sortQueue(t: number): void {
    this.readyQueue.sort((a, b) => {
      const pEffA = this.calcEffectivePriority(a.pid, t);
      const pEffB = this.calcEffectivePriority(b.pid, t);
      
      if (pEffA !== pEffB) return pEffA - pEffB; // menor número = mayor prioridad
      if (a.seq !== b.seq) return a.seq - b.seq;   // desempate por secuencia
      return a.pid - b.pid;                        // desempate final por pid
    });
  }

  private push(pid: number): void {
    const now = this.getNow();
    const remaining = this.getRemaining(pid, now);
    
    // Guard: no encolar procesos terminados (purga en origen)
    if (remaining <= 0) {
      TelemetryGuards.assertValidEnqueue(pid, remaining, 'Priority.push');
      return;
    }
    
    const priorityBase = this.getPriorityBase(pid);
    this.basePriorities.set(pid, priorityBase);
    
    // Actualizar tReady para resetear aging
    const existingIndex = this.readyQueue.findIndex(e => e.pid === pid);
    if (existingIndex >= 0) {
      this.readyQueue[existingIndex].tReady = now;
      this.readyQueue[existingIndex].seq = this.sequenceCounter++;
    } else {
      // Nuevo en ready queue
      this.readyQueue.push({
        pid,
        priorityBase,
        tReady: now,
        seq: this.sequenceCounter++
      });
    }
  }

  override onAdmit(pid: number): void { this.push(pid); }
  override onReady(pid: number): void { this.push(pid); }
  override onDesalojoActual(pid: number): void { this.push(pid); }
  
  override onFinish(pid: number): void {
    // Purgar proceso terminado de la cola ready (purga en origen)
    this.readyQueue = this.readyQueue.filter(item => item.pid !== pid);
    this.basePriorities.delete(pid);
  }

  next(): number | undefined {
    if (this.readyQueue.length === 0) return undefined;
    
    // Antes de elegir, filtrar procesos terminados y re-ordenar
    const now = this.getNow();
    this.readyQueue = this.readyQueue.filter(item => {
      const remaining = this.getRemaining(item.pid, now);
      return remaining > 0; // Solo mantener procesos con tiempo restante
    });
    
    if (this.readyQueue.length === 0) return undefined;
    
    // Re-ordenar con prioridades efectivas actuales
    this.sortQueue(now);
    
    // Tomar el primero (mayor prioridad efectiva)
    const chosen = this.readyQueue.shift()!;
    return chosen.pid;
  }

  /**
   * Hook para expropiación: compara prioridades efectivas
   * Usa < estricto para evitar thrashing en empates
   */
  compareForPreemption?(now: number, pidNew: number, _getRemaining: (pid: number, now: number) => number, currentPid: number): boolean {
    const pEffNew = this.calcEffectivePriority(pidNew, now);
    const pEffCurrent = this.calcEffectivePriority(currentPid, now);
    
    // Menor número = mayor prioridad, y usa < estricto
    const shouldPreempt = pEffNew < pEffCurrent;
    
    TelemetryGuards.logSliceEvent(
      `Priority compareForPreemption: ${pidNew}(pEff=${pEffNew}) vs ${currentPid}(pEff=${pEffCurrent}) => ${shouldPreempt}`,
      now, pidNew, pEffNew, pEffCurrent, false
    );
    
    return shouldPreempt;
  }

  // Métodos de debug/testing
  getEffectivePriority(pid: number, t: number): number {
    return this.calcEffectivePriority(pid, t);
  }

  getReadyQueue(): number[] {
    return this.readyQueue.map(e => e.pid);
  }
}
