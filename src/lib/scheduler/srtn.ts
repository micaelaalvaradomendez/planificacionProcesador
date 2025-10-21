// src/lib/scheduler/srtn.ts
import { BaseScheduler } from './scheduler';
import { TelemetryGuards } from '../engine/telemetry';

/**
 * SRTN (Shortest Remaining Time Next, expropiativo)
 * Mantiene listos en función del RESTANTE.
 * Expropia si arriba/retorna uno con RESTANTE menor al del actual.
 */
export class SchedulerSRTN extends BaseScheduler {
  private seq = 0;
  private ready: Array<{ pid: number; key: number; seq: number }> = [];

  constructor(
    // getRemaining(pid, now) debe retornar restante dinámico.
    private readonly getRemaining: (pid: number, now: number) => number,
    // getNow(): tiempo actual (lo provee el engine cuando encola/elige)
    private readonly getNow: () => number
  ) { super(); }

  override onAdmit(pid: number): void { this.push(pid); }
  override onReady(pid: number): void { this.push(pid); }
  override onDesalojoActual(pid: number): void { this.push(pid); }
  
  override onFinish(pid: number): void {
    // Purgar proceso terminado de la cola ready (purga en origen)
    this.ready = this.ready.filter(item => item.pid !== pid);
  }

  private push(pid: number) {
    const now = this.getNow();
    const key = this.getRemaining(pid, now);
    
    // Guard: no encolar procesos terminados (purga en origen)
    if (key <= 0) {
      TelemetryGuards.assertValidEnqueue(pid, key, 'SRTN.push');
      return; // No encolar si restante <= 0
    }
    
    // CORREGIDO: evitar duplicados - si ya está en ready, no volver a encolar
    const alreadyExists = this.ready.some(item => item.pid === pid);
    if (alreadyExists) {
      return; // Ya está en la cola, no duplicar
    }
    
    this.ready.push({ pid, key, seq: this.seq++ });
  }

  next(): number | undefined {
    if (this.ready.length === 0) return undefined;
    // Antes de elegir, refrescamos keys y filtramos procesos terminados
    const now = this.getNow();
    this.ready = this.ready.filter(item => {
      item.key = this.getRemaining(item.pid, now);
      return item.key > 0; // Solo mantener procesos con tiempo restante
    });
    
    if (this.ready.length === 0) return undefined;
    
    let best = 0;
    for (let i = 1; i < this.ready.length; i++) {
      const a = this.ready[i], b = this.ready[best];
      if (a.key < b.key || (a.key === b.key && a.seq < b.seq)) best = i;
    }
    const { pid } = this.ready.splice(best, 1)[0];
    return pid;
  }

  /**
   * ¿Conviene expropiar al actual por llegada/retorno de pidNew en "now"?
   * SRTN: sí si remaining(pidNew) < remaining(current) - tiempo_ejecutado.
   * REGLA ESTRICTA: solo expropia si el nuevo es ESTRICTAMENTE menor.
   * En empates (igual restante), no expropia para evitar thrashing.
   */
  override compareForPreemption(now: number, pidNew: number, _getRemaining: (pid: number, at: number) => number, currentPid: number): boolean {
    const rNew = this.getRemaining(pidNew, now);
    const rCur = this.getRemaining(currentPid, now);
    
    // Solo expropia si el nuevo proceso tiene ESTRICTAMENTE menor tiempo restante
    // En empates (rNew === rCur), mantiene el actual para evitar thrashing
    return rNew < rCur;
  }
}
