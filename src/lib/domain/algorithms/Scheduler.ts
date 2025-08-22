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
 * Interfaz para estrategias de planificación más granulares
 * Permite control evento por evento
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
   * Se llama cuando un proceso se vuelve READY
   */
  alVolverseListoProceso(proceso: Proceso, tiempoActual: number): void;

  /**
   * Selecciona el próximo proceso a ejecutar de la cola de READY
   */
  elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined;

  /**
   * Se llama en cada tick del quantum (solo para RR)
   */
  alTickQuantum?(tiempoActual: number, proceso: Proceso): boolean; // true = continuar, false = preempt

  /**
   * Determina si se debe expropiar el proceso actual
   */
  debeExpropiar?(procesoActual: Proceso, procesoCandidato: Proceso, tiempoActual: number): boolean;

  /**
   * Ordena la cola de READY según la estrategia
   */
  ordenarColaListos(colaListos: Proceso[]): void;

  /**
   * Reinicia el estado interno de la estrategia
   */
  reiniciar(): void;
}

/**
 * Implementación base para estrategias de planificación
 */
export abstract class EstrategiaSchedulerBase implements EstrategiaScheduler {
  public abstract readonly nombre: string;
  public abstract readonly soportaExpropiacion: boolean;
  public abstract readonly requiereQuantum: boolean;

  public alLlegarProceso(proceso: Proceso, tiempoActual: number): void {
    // Implementación por defecto vacía
  }

  public alVolverseListoProceso(proceso: Proceso, tiempoActual: number): void {
    // Implementación por defecto vacía  
  }

  public abstract elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined;

  public abstract ordenarColaListos(colaListos: Proceso[]): void;

  public debeExpropiar?(procesoActual: Proceso, procesoCandidato: Proceso, tiempoActual: number): boolean {
    return false; // Por defecto no expropiativo
  }

  public reiniciar(): void {
    // Implementación por defecto vacía
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
