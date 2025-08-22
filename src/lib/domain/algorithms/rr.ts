import { EstrategiaSchedulerBase } from './Scheduler';
import type { Proceso } from '../entities/Proceso';

/**
 * Round Robin (RR) Scheduler Strategy
 * 
 * Características teóricas:
 * - Expropiativo por rodaja de tiempo (quantum/time slice)
 * - Reparte tiempo de CPU equitativamente entre procesos
 * - Ideal para sistemas interactivos y tiempo compartido
 * - El quantum determina el balance overhead vs. tiempo de respuesta:
 *   • Quantum grande ≈ FCFS (menor overhead, peor respuesta)
 *   • Quantum pequeño ≈ mayor overhead por cambios de contexto
 *   • Valor típico: 20-50ms como compromiso óptimo
 */
export class EstrategiaSchedulerRoundRobin extends EstrategiaSchedulerBase {
  public readonly nombre = 'Round Robin';
  public readonly soportaExpropiacion = true;
  public readonly requiereQuantum = true;

  private tiempoInicioQuantum?: number;
  private quantum: number;  // Rodaja de tiempo en unidades de simulación

  constructor(quantum: number = 4) {
    super();
    this.quantum = quantum;
  }

  /**
   * Configura la rodaja de tiempo (quantum)
   * @param quantum Tiempo máximo que un proceso puede ejecutar sin interrupción
   */
  public asignarQuantum(quantum: number): void {
    if (quantum <= 0) {
      throw new Error('El quantum debe ser mayor que 0 unidades de tiempo');
    }
    this.quantum = quantum;
  }

  public obtenerQuantum(): number {
    return this.quantum;
  }

  /**
   * En RR, toma el primer proceso de la cola (FIFO circular)
   */
  public elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined {
    if (colaListos.length === 0) {
      return undefined;
    }

    // En Round Robin, tomamos el primer proceso (orden de llegada a READY)
    const siguienteProceso = colaListos[0];
    this.tiempoInicioQuantum = tiempoActual;
    
    return siguienteProceso;
  }

  /**
   * Regla específica de la consigna TP para RR:
   * "En RR al producirse el cambio de bloqueado a listo de un proceso 
   * mientras otro se estaba ejecutando no nos afecta y debemos terminar el tiempo de quantum"
   */
  public debeCompletarQuantumSinInterrupcion(procesoLlegaAListo: Proceso): boolean {
    // Si un proceso pasa de Bloqueado a Listo mientras otro ejecuta,
    // NO interrumpimos el quantum del proceso actual
    return true; 
  }

  /**
   * Verifica si el quantum ha expirado
   */
  public alTickQuantum(tiempoActual: number, proceso: Proceso): boolean {
    if (this.tiempoInicioQuantum === undefined) {
      return true; // No se ha iniciado quantum, continuar
    }

    const tiempoTranscurrido = tiempoActual - this.tiempoInicioQuantum;
    
    // Si el quantum ha expirado, preempt
    return tiempoTranscurrido < this.quantum;
  }

  /**
   * En RR no se usa preempción por prioridad, solo por quantum
   */
  public debeExpropiar(procesoActual: Proceso, procesoCandidato: Proceso, tiempoActual: number): boolean {
    // En RR la preempción se maneja por quantum, no por llegada de otros procesos
    return false;
  }

  /**
   * RR mantiene orden FIFO en la cola de READY
   */
  public ordenarColaListos(colaListos: Proceso[]): void {
    // En Round Robin, mantenemos el orden de llegada a READY
    // No necesitamos reordenar
  }

  /**
   * Marca que un proceso ha agotado su quantum
   */
  public quantumExpirado(tiempoActual: number): void {
    this.tiempoInicioQuantum = undefined;
  }

  /**
   * Obtiene el tiempo restante del quantum actual
   */
  public obtenerQuantumRestante(tiempoActual: number): number {
    if (this.tiempoInicioQuantum === undefined) {
      return this.quantum;
    }

    const transcurrido = tiempoActual - this.tiempoInicioQuantum;
    return Math.max(0, this.quantum - transcurrido);
  }

  /**
   * Verifica si hay quantum activo
   */
  public tieneQuantumActivo(): boolean {
    return this.tiempoInicioQuantum !== undefined;
  }

  public reiniciar(): void {
    this.tiempoInicioQuantum = undefined;
  }

  /**
   * Maneja el caso especial de RR con un solo proceso
   * Según consigna TP: si el único proceso agota quantum, va a Listo y vuelve (consume TCP)
   */
  public manejarExpiracionQuantumProcesoUnico(proceso: Proceso, tiempoActual: number): {
    debeExpropiar: boolean;
    debeReencolar: boolean;
    consumeTCP: boolean;
  } {
    // Según consigna: "si tenemos un único proceso y su q termina, 
    // lo pasamos a listo y luego le volvemos a asignar la cpu (usamos un TCP)"
    return {
      debeExpropiar: true,
      debeReencolar: true,
      consumeTCP: true  // ¡CRÍTICO! Consume TCP según consigna
    };
  }

  /**
   * Para el primer despacho también se usa TCP según consigna
   */
  public requiereTCPParaPrimerDespacho(): boolean {
    return true; // "Para despachar el primer proceso también usamos un TCP"
  }
}
