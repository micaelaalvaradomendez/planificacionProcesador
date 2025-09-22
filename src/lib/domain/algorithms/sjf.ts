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
   * Ordena la cola por servicio total restante (SPN - Shortest Process Next)
   * CORRECCIÓN: SPN debe usar servicio total restante = rafagasRestantes * duracionCPU
   * NO solo la duración de la próxima ráfaga
   */
  public ordenarColaListos(colaListos: Proceso[]): void {
    colaListos.sort((a, b) => {
      // Servicio total restante = número de ráfagas restantes × duración de cada ráfaga
      const servicioRestanteA = a.rafagasRestantes * a.duracionCPU;
      const servicioRestanteB = b.rafagasRestantes * b.duracionCPU;
      
      if (servicioRestanteA !== servicioRestanteB) {
        return servicioRestanteA - servicioRestanteB;
      }
      
      // Empate en servicio restante: desempatar por orden de llegada a READY
      // Como no tenemos timestamp de llegada a READY, usamos arribo como aproximación
      if (a.arribo !== b.arribo) {
        return a.arribo - b.arribo;
      }
      
      // Empate final: orden alfabético por nombre (determinístico)
      return a.id.localeCompare(b.id);
    });
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
