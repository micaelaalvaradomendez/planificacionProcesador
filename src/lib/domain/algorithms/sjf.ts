import { EstrategiaSchedulerBase } from './Scheduler';
import type { Proceso } from '../entities/Proceso';

/**
 * Shortest Job First (SJF) / Shortest Process Next (SPN) Scheduler Strategy
 * 
 * Características:
 * - No expropiativo
 * - Selecciona proceso con menor tiempo total de CPU
 * - Minimiza tiempo promedio de retorno
 * - Puede causar inanición de procesos largos
 */
export class EstrategiaSchedulerSjf extends EstrategiaSchedulerBase {
  public readonly nombre = 'SJF (SPN)';
  public readonly soportaExpropiacion = false;
  public readonly requiereQuantum = false;

  /**
   * Selecciona el proceso con menor tiempo total de CPU
   */
  public elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined {
    if (colaListos.length === 0) {
      return undefined;
    }

    // Ordenar por tiempo total de CPU (más corto primero)
    this.ordenarColaListos(colaListos);
    
    return colaListos[0];
  }

  /**
   * Ordena la cola por tiempo total de CPU (SJF)
   */
  public ordenarColaListos(colaListos: Proceso[]): void {
    colaListos.sort((a, b) => a.duracionCPU - b.duracionCPU);
  }

  /**
   * SJF no es expropiativo, por lo que no preempt por llegada de procesos
   */
  public debeExpropiar(procesoActual: Proceso, procesoCandidato: Proceso, tiempoActual: number): boolean {
    return false;
  }

  public reiniciar(): void {
    // SJF no mantiene estado interno
  }
}
