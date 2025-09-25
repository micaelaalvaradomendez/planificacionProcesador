import { EstrategiaSchedulerBase } from './Scheduler';
import type { Proceso } from '../entities/Proceso';

/**
 * Shortest Remaining Time First (SRTF) Scheduler Strategy
 * Implementa reglas académicamente correctas según estadomejorado.puml
 * 
 * Características:
 * - Expropiativo (versión preemptiva de SJF)
 * - Criterio: Resto de ráfaga ACTUAL (NO tiempo total)
 * - Evaluación: En cada N→L y B→L
 * - Tie-breaker: Mantener proceso actual (NO expropiar en empates)
 * - Minimiza tiempo promedio de respuesta (óptimo teórico)
 */
export class EstrategiaSchedulerSrtf extends EstrategiaSchedulerBase {
  public readonly nombre = 'SRTF';
  public readonly soportaExpropiacion = true;
  public readonly requiereQuantum = false;

  /**
   * Selecciona proceso con menor tiempo restante de ráfaga ACTUAL
   * CRÍTICO: restanteCPU (ráfaga actual), NO restanteTotalCPU
   */
  public elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined {
    if (colaListos.length === 0) {
      return undefined;
    }

    // Encontrar proceso con menor tiempo restante de ráfaga actual
    return colaListos.reduce((mejor, actual) => {
      if (actual.restanteCPU < mejor.restanteCPU) {
        return actual;
      } else if (actual.restanteCPU === mejor.restanteCPU) {
        // Tie-breaker: orden de llegada a READY
        return this.compararPorTiempoLlegadaReady(actual, mejor) < 0 ? actual : mejor;
      }
      return mejor;
    });
  }

  /**
   * REGLA CRÍTICA SRTF: Solo expropia si tiempo_restante_nuevo < tiempo_restante_actual
   * En empates: mantener proceso actual (NO expropiar)
   */
  public debeExpropiar(procesoActual: Proceso, procesoCandidato: Proceso, tiempoActual: number): boolean {
    // IMPORTANTE: Solo expropiar si el candidato tiene ESTRICTAMENTE menor tiempo restante
    // En empates, mantener el proceso actual
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

    // Buscar si hay algún proceso en READY con menor tiempo TOTAL restante
    const masCortoPorLlegar = colaListos.reduce((masCorto, proceso) => 
      proceso.restanteTotalCPU < masCorto.restanteTotalCPU ? proceso : masCorto
    );

    return masCortoPorLlegar.restanteTotalCPU < procesoActual.restanteTotalCPU;
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
