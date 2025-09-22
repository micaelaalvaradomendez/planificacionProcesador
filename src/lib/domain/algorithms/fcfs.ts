import { EstrategiaSchedulerBase } from './Scheduler';
import type { Proceso } from '../entities/Proceso';

/**
 * First Come, First Served (FCFS) Scheduler Strategy
 * 
 * Características:
 * - No expropiativo
 * - Atiende procesos en orden FIFO de ingreso a la cola READY
 * - Simple de implementar
 * - Puede causar efecto convoy
 * 
 * IMPORTANTE: FCFS es FIFO de la cola READY, NO ordenamiento por tiempo de arribo.
 * Un proceso que retorna de I/O va al FINAL de la cola, no se reordena por arribo original.
 */
export class EstrategiaSchedulerFcfs extends EstrategiaSchedulerBase {
  public readonly nombre = 'FCFS';
  public readonly soportaExpropiacion = false;
  public readonly requiereQuantum = false;

  /**
   * En FCFS, simplemente toma el primer proceso de la cola (FIFO puro)
   * NO reordena - la cola ya está en orden FIFO de inserción
   */
  public elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined {
    if (colaListos.length === 0) {
      return undefined;
    }

    // CORRECCIÓN: NO reordenar. FCFS es FIFO estricto de la cola READY
    // El primer proceso en la cola es el que debe ejecutar
    return colaListos[0];
  }

  /**
   * CORRECCIÓN: FCFS NO debe reordenar la cola
   * La cola READY debe mantenerse en orden FIFO de inserción
   * Este método se mantiene para compatibilidad pero no hace nada
   */
  public ordenarColaListos(colaListos: Proceso[]): void {
    // FCFS no reordena - mantiene orden FIFO de inserción a READY
    // Si necesitas ordenamiento determinista para empates en otros algoritmos,
    // debe manejarse en el momento de inserción, no aquí
  }

  public reiniciar(): void {
    // FCFS no mantiene estado interno
  }
}
