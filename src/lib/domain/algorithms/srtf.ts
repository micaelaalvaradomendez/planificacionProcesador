import { EstrategiaSchedulerBase } from './Scheduler';
import type { Proceso } from '../entities/Proceso';

/**
 * Shortest Remaining Time First (SRTF) / Shortest Remaining Time Next (SRTN) Scheduler Strategy
 * 
 * Características:
 * - Expropiativo (versión preemptiva de SJF)
 * - Selecciona proceso con menor tiempo restante de CPU
 * - Minimiza tiempo de respuesta para procesos cortos
 * - Puede causar inanición de procesos largos
 * - Mayor sobrecarga por cambios de contexto
 */
export class EstrategiaSchedulerSrtf extends EstrategiaSchedulerBase {
  public readonly nombre = 'SRTF (SRTN)';
  public readonly soportaExpropiacion = true;
  public readonly requiereQuantum = false;

  /**
   * Selecciona el proceso con menor tiempo restante de CPU
   */
  public elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined {
    if (colaListos.length === 0) {
      return undefined;
    }

    // Ordenar por tiempo restante de CPU (menor primero)
    this.ordenarColaListos(colaListos);
    
    return colaListos[0];
  }

  /**
   * Ordena la cola por tiempo restante de ráfaga de CPU actual (SRTF)
   * NOTA IMPORTANTE: SRTF debe usar restanteCPU (tiempo restante de ráfaga actual),
   * NO restanteTotalCPU (tiempo restante total del proceso)
   */
  public ordenarColaListos(colaListos: Proceso[]): void {
    colaListos.sort((a, b) => a.restanteCPU - b.restanteCPU);
  }

  /**
   * En SRTF, expropia si llega un proceso con menor tiempo restante en su ráfaga actual
   */
  public debeExpropiar(procesoActual: Proceso, procesoCandidato: Proceso, tiempoActual: number): boolean {
    // Preempt si el proceso candidato tiene menor tiempo restante en su ráfaga actual
    return procesoCandidato.restanteCPU < procesoActual.restanteCPU;
  }

  /**
   * Se llama cuando un proceso se vuelve READY
   * En SRTF debemos verificar si debe expropiar al proceso actual
   */
  public alVolverseListoProceso(proceso: Proceso, tiempoActual: number): void {
    // La lógica de preempción se maneja en debeExpropiar
    // Este método se puede usar para logging o estadísticas
  }

  public reiniciar(): void {
    // SRTF no mantiene estado interno
  }

  /**
   * Verifica si un proceso debe ser expropiado inmediatamente
   * al llegar un proceso con menor tiempo restante
   */
  public verificarExpropiacionInmediata(
    procesoActual: Proceso | undefined, 
    colaListos: Proceso[], 
    tiempoActual: number
  ): boolean {
    if (!procesoActual || colaListos.length === 0) {
      return false;
    }

    // Buscar si hay algún proceso en READY con menor tiempo restante DE RÁFAGA ACTUAL
    const masCortoPorLlegar = colaListos.reduce((masCorto, proceso) => 
      proceso.restanteCPU < masCorto.restanteCPU ? proceso : masCorto
    );

    return masCortoPorLlegar.restanteCPU < procesoActual.restanteCPU;
  }

  /**
   * Obtiene el próximo proceso considerando preempción
   */
  public obtenerSiguienteConExpropiacion(
    procesoActual: Proceso | undefined,
    colaListos: Proceso[],
    tiempoActual: number
  ): { siguienteProceso: Proceso | undefined; debeExpropiar: boolean } {
    if (colaListos.length === 0) {
      return { siguienteProceso: undefined, debeExpropiar: false };
    }

    const masCortoPorLlegar = this.elegirSiguiente(colaListos, tiempoActual);
    
    if (!procesoActual) {
      return { siguienteProceso: masCortoPorLlegar, debeExpropiar: false };
    }

    const debeExpropiar = masCortoPorLlegar ? 
      this.debeExpropiar(procesoActual, masCortoPorLlegar, tiempoActual) : false;

    return {
      siguienteProceso: debeExpropiar ? masCortoPorLlegar : procesoActual,
      debeExpropiar
    };
  }
}
