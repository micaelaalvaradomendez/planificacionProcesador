import { EstrategiaSchedulerBase } from './Scheduler';
import type { Proceso } from '../entities/Proceso';

/**
 * Priority Scheduler Strategy según estadomejorado.puml
 * Implementa reglas académicamente correctas con aging opcional
 * 
 * Características:
 * - Expropiativo o no expropiativo
 * - Criterio: Mayor prioridad (MENOR número = MAYOR prioridad)
 * - Tie-breaker: Mantener proceso actual (NO expropiar en empates)
 * - Anti-starvation: Aging solo mientras está en LISTO
 * - Convención académica: prioridad 1 > prioridad 2 > ... > prioridad N
 */
export class EstrategiaSchedulerPrioridad extends EstrategiaSchedulerBase {
  public readonly nombre: string;
  public readonly soportaExpropiacion: boolean;
  public readonly requiereQuantum = false;

  private habilitarAging: boolean;
  private incrementoAging: number;
  private intervaloAging: number;
  private ultimoTiempoAging: number = 0;
  
  // Mapa para tracking del aging por proceso
  private agingPorProceso: Map<string, { prioridadOriginal: number; prioridadActual: number }> = new Map();

  constructor(
    expropiativo: boolean = true,
    habilitarAging: boolean = false,
    incrementoAging: number = 1,
    intervaloAging: number = 10
  ) {
    super();
    this.nombre = expropiativo ? 'Priority (Expropiativo)' : 'Priority (No expropiativo)';
    this.soportaExpropiacion = expropiativo;
    this.habilitarAging = habilitarAging;
    this.incrementoAging = incrementoAging;
    this.intervaloAging = intervaloAging;
  }

  /**
   * Selecciona proceso con MAYOR prioridad (menor número)
   * CONVENCIÓN: prioridad 1 > prioridad 2 > ... > prioridad N
   */
  public elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined {
    if (colaListos.length === 0) {
      return undefined;
    }

    // Aplicar aging si está habilitado
    if (this.habilitarAging) {
      this.aplicarAging(colaListos, tiempoActual);
    }

    // Encontrar proceso con mayor prioridad (menor número)
    return colaListos.reduce((mejor, actual) => {
      const prioridadMejor = this.obtenerPrioridadEfectiva(mejor);
      const prioridadActual = this.obtenerPrioridadEfectiva(actual);
      
      if (prioridadActual < prioridadMejor) {
        return actual;
      } else if (prioridadActual === prioridadMejor) {
        // Tie-breaker: orden de llegada a READY
        return this.compararPorTiempoLlegadaReady(actual, mejor) < 0 ? actual : mejor;
      }
      return mejor;
    });
  }

  /**
   * REGLA CRÍTICA Priority: Solo expropia si prioridad_nuevo < prioridad_actual
   * En empates: mantener proceso actual (NO expropiar)
   */
  public debeExpropiar(procesoActual: Proceso, procesoCandidato: Proceso, tiempoActual: number): boolean {
    if (!this.soportaExpropiacion) {
      return false;
    }

    // IMPORTANTE: Solo expropiar si el candidato tiene ESTRICTAMENTE mayor prioridad (menor número)
    // En empates, mantener el proceso actual
    const prioridadActual = this.obtenerPrioridadEfectiva(procesoActual);
    const prioridadCandidato = this.obtenerPrioridadEfectiva(procesoCandidato);
    
    return prioridadCandidato < prioridadActual;
  }

  /**
   * Se llama cuando un proceso se vuelve READY
   * Inicializa tracking de aging si está habilitado
   */
  public alVolverseListoProceso(proceso: Proceso, tiempoActual: number): void {
    if (this.habilitarAging && !this.agingPorProceso.has(proceso.id)) {
      this.agingPorProceso.set(proceso.id, {
        prioridadOriginal: proceso.prioridad,
        prioridadActual: proceso.prioridad
      });
    }
  }

  /**
   * Implementa aging: Solo aplica mientras está en LISTO (regla crítica)
   * Mejora gradualmente la prioridad para prevenir starvation
   */
  public aplicarAging(colaListos: Proceso[], tiempoActual: number): void {
    if (tiempoActual - this.ultimoTiempoAging < this.intervaloAging) {
      return;
    }

    for (const proceso of colaListos) {
      if (proceso.ultimoTiempoListo !== undefined) {
        const tiempoEnListo = tiempoActual - proceso.ultimoTiempoListo;
        
        if (tiempoEnListo >= this.intervaloAging) {
          const aging = this.agingPorProceso.get(proceso.id);
          if (aging) {
            // Mejorar prioridad (menor número = mayor prioridad)
            const mejora = Math.floor(tiempoEnListo / this.intervaloAging) * this.incrementoAging;
            aging.prioridadActual = Math.max(1, aging.prioridadOriginal - mejora);
            this.agingPorProceso.set(proceso.id, aging);
          }
        }
      }
    }

    this.ultimoTiempoAging = tiempoActual;
  }

  /**
   * Obtiene la prioridad efectiva (incluyendo aging si aplica)
   */
  private obtenerPrioridadEfectiva(proceso: Proceso): number {
    if (!this.habilitarAging) {
      return proceso.prioridad;
    }
    
    const aging = this.agingPorProceso.get(proceso.id);
    return aging ? aging.prioridadActual : proceso.prioridad;
  }

  /**
   * Configura parámetros de aging
   */
  public configurarAging(habilitado: boolean, incremento: number = 1, intervalo: number = 10): void {
    this.habilitarAging = habilitado;
    this.incrementoAging = incremento;
    this.intervaloAging = intervalo;
  }

  /**
   * Verifica si un proceso debe ser expropiado inmediatamente
   */
  public verificarExpropiacionInmediata(
    procesoActual: Proceso | undefined,
    colaListos: Proceso[],
    tiempoActual: number
  ): boolean {
    if (!this.soportaExpropiacion || !procesoActual || colaListos.length === 0) {
      return false;
    }

    // Buscar el proceso con mayor prioridad en READY
    const mayorPrioridadPorLlegar = colaListos.reduce((mayor, proceso) =>
      proceso.prioridad > mayor.prioridad ? proceso : mayor
    );

    return mayorPrioridadPorLlegar.prioridad > procesoActual.prioridad;
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

    const mayorPrioridadPorLlegar = this.elegirSiguiente(colaListos, tiempoActual);
    
    if (!procesoActual) {
      return { siguienteProceso: mayorPrioridadPorLlegar, debeExpropiar: false };
    }

    const debeExpropiar = mayorPrioridadPorLlegar ? 
      this.debeExpropiar(procesoActual, mayorPrioridadPorLlegar, tiempoActual) : false;

    return {
      siguienteProceso: debeExpropiar ? mayorPrioridadPorLlegar : procesoActual,
      debeExpropiar
    };
  }

  /**
   * Obtiene información sobre aging
   */
  public obtenerInfoAging(): {
    habilitado: boolean;
    incremento: number;
    intervalo: number;
    ultimoTiempo: number;
  } {
    return {
      habilitado: this.habilitarAging,
      incremento: this.incrementoAging,
      intervalo: this.intervaloAging,
      ultimoTiempo: this.ultimoTiempoAging
    };
  }

  public reiniciar(): void {
    this.ultimoTiempoAging = 0;
    this.agingPorProceso.clear();
  }
}
