import type { Proceso } from '../entities/Proceso';
import type { EventoGantt } from '../events/gantt.types';
import type { ParametrosSimulacion } from '../types';

/**
 * Interfaz común para todas las estrategias de planificación
 */
export interface Scheduler {
  readonly nombre: string;
  
  /**
   * Ejecuta la simulación completa con la estrategia específica
   */
  ejecutar(entrada: {
    procesos: Proceso[];
    quantum?: number;
    tcp?: number;
    tip?: number;
    tfp?: number;
  }): ResultadoScheduler;
}

/**
 * Resultado de la ejecución de un scheduler
 */
export interface ResultadoScheduler {
  timeline: EventoGantt[];
  tiempoTotal: number;
  finalizados: Proceso[];
  logEventos: string[];
  estadisticas: {
    tiempoInactivo: number;
    tiempoOS: number;
    tiempoUsuario: number;
  };
}

/**
 * Interfaz para estrategias de planificación según diagrama estadomejorado.puml
 * Implementa reglas académicamente correctas con validaciones estrictas
 */
export interface EstrategiaScheduler {
  readonly nombre: string;
  readonly soportaExpropiacion: boolean;
  readonly requiereQuantum: boolean;

  /**
   * Se llama cuando un proceso arriba al sistema
   */
  alLlegarProceso(proceso: Proceso, tiempoActual: number): void;

  /**
   * Se llama cuando un proceso se vuelve READY (desde NUEVO o BLOQUEADO)
   * CRÍTICO: Para Priority, aquí se aplica aging solo mientras está en LISTO
   */
  alVolverseListoProceso(proceso: Proceso, tiempoActual: number): void;

  /**
   * Selecciona el próximo proceso a ejecutar de la cola de READY
   * REGLAS ESTRICTAS:
   * - FCFS: Orden estricto FIFO
   * - SJF: Menor ráfaga CPU (NO tiempo total)
   * - SRTF: Menor tiempo restante de ráfaga ACTUAL
   * - RR: FIFO circular
   * - Priority: Mayor prioridad (menor número)
   */
  elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined;

  /**
   * Evalúa si un proceso debe expropiar al actual (solo políticas expropiativas)
   * REGLA CRÍTICA: En empates, mantener proceso actual (NO expropiar)
   * @param procesoActual - Proceso ejecutando en CPU
   * @param procesoCandidato - Proceso que podría expropiar
   * @returns true si debe expropiar, false en caso contrario
   */
  debeExpropiar?(procesoActual: Proceso, procesoCandidato: Proceso, tiempoActual: number): boolean;

  /**
   * Reinicia el estado interno de la estrategia para nueva simulación
   */
  reiniciar(): void;

  /**
   * Maneja el aging para prevenir starvation (solo Priority)
   * Se llama periódicamente solo para procesos en estado LISTO
   */
  aplicarAging?(colaListos: Proceso[], tiempoActual: number): void;

  /**
   * Obtiene criterio de ordenamiento para tie-breaker
   * Por defecto: orden de llegada a READY queue
   */
  obtenerCriterioOrden?(proceso: Proceso): number;
}

/**
 * Implementación base para estrategias de planificación según estadomejorado.puml
 * Proporciona comportamientos por defecto y validaciones comunes
 */
export abstract class EstrategiaSchedulerBase implements EstrategiaScheduler {
  public abstract readonly nombre: string;
  public abstract readonly soportaExpropiacion: boolean;
  public abstract readonly requiereQuantum: boolean;

  public alLlegarProceso(proceso: Proceso, tiempoActual: number): void {
    // Implementación por defecto vacía - sobrescribir si se necesita
  }

  public alVolverseListoProceso(proceso: Proceso, tiempoActual: number): void {
    // Implementación por defecto vacía - sobrescribir si se necesita
  }

  public abstract elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined;

  public debeExpropiar?(procesoActual: Proceso, procesoCandidato: Proceso, tiempoActual: number): boolean {
    return false; // Por defecto no expropiativo - sobrescribir en políticas expropiativas
  }

  public reiniciar(): void {
    // Implementación por defecto vacía - sobrescribir si se maneja estado interno
  }

  public aplicarAging?(colaListos: Proceso[], tiempoActual: number): void {
    // Solo Priority implementa aging
  }

  public obtenerCriterioOrden?(proceso: Proceso): number {
    // Por defecto: orden de llegada a READY (tiempo cuando se volvió LISTO)
    return proceso.ultimoTiempoListo || proceso.arribo;
  }

  /**
   * Utilidad para tie-breaking: mantener orden estable por tiempo de llegada a READY
   */
  protected compararPorTiempoLlegadaReady(a: Proceso, b: Proceso): number {
    const tiempoA = a.ultimoTiempoListo || a.arribo;
    const tiempoB = b.ultimoTiempoListo || b.arribo;
    return tiempoA - tiempoB;
  }
}

/**
 * Configuración para schedulers
 */
export interface ConfiguracionScheduler {
  estrategia: EstrategiaScheduler;
  parametros: ParametrosSimulacion;
}

/**
 * Context para el patrón Strategy
 */
export class ContextoScheduler {
  private estrategia: EstrategiaScheduler;

  constructor(estrategia: EstrategiaScheduler) {
    this.estrategia = estrategia;
  }

  public asignarEstrategia(estrategia: EstrategiaScheduler): void {
    this.estrategia = estrategia;
  }

  public obtenerEstrategia(): EstrategiaScheduler {
    return this.estrategia;
  }

  public ejecutar(colaListos: Proceso[], tiempoActual: number): Proceso | undefined {
    return this.estrategia.elegirSiguiente(colaListos, tiempoActual);
  }
}
