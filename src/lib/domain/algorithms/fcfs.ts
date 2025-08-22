import { EstrategiaSchedulerBase } from './Scheduler';
import type { Proceso } from '../entities/Proceso';

/**
 * First Come, First Served (FCFS) Scheduler Strategy
 * 
 * Características:
 * - No expropiativo
 * - Atiende procesos en orden de llegada (FIFO)
 * - Simple de implementar
 * - Puede causar efecto convoy
 */
export class EstrategiaSchedulerFcfs extends EstrategiaSchedulerBase {
  public readonly nombre = 'FCFS';
  public readonly soportaExpropiacion = false;
  public readonly requiereQuantum = false;

  /**
   * En FCFS, simplemente toma el primer proceso de la cola ordenada por arribo
   */
  public elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined {
    if (colaListos.length === 0) {
      return undefined;
    }

    // La cola ya debería estar ordenada, pero nos aseguramos
    this.ordenarColaListos(colaListos);
    
    return colaListos[0];
  }

  /**
   * Ordena la cola por tiempo de arribo (FIFO)
   */
  public ordenarColaListos(colaListos: Proceso[]): void {
    colaListos.sort((a, b) => a.arribo - b.arribo);
  }

  public reiniciar(): void {
    // FCFS no mantiene estado interno
  }
}
