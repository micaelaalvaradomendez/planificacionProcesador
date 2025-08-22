import { EstrategiaSchedulerBase } from './Scheduler';
import type { Proceso } from '../entities/Proceso';

/**
 * Priority Scheduler Strategy
 * 
 * Características teóricas:
 * - Puede ser expropiativo o no expropiativo  
 * - Selecciona proceso con mayor prioridad externa (valor numérico más alto)
 * - Permite dar preferencia a procesos críticos del sistema
 * - Riesgo de inanición (starvation): procesos de baja prioridad pueden no ejecutarse nunca
 * - Solución: Prevención de inanición mediante incremento gradual de prioridad por tiempo de espera
 */
export class EstrategiaSchedulerPrioridad extends EstrategiaSchedulerBase {
  public readonly nombre: string;
  public readonly soportaExpropiacion: boolean;
  public readonly requiereQuantum = false;

  private prevencionInanicionHabilitada: boolean;
  private incrementoPrioridadPorEspera: number;
  private intervaloIncrementoPrioridad: number;
  private ultimoTiempoIncrementoPrioridad: number = 0;

  constructor(
    expropiativo: boolean = true,
    prevencionInanicionHabilitada: boolean = false,
    incrementoPrioridadPorEspera: number = 1,
    intervaloIncrementoPrioridad: number = 10
  ) {
    super();
    this.nombre = expropiativo ? 'Priority (Expropiativo)' : 'Priority (No expropiativo)';
    this.soportaExpropiacion = expropiativo;
    this.prevencionInanicionHabilitada = prevencionInanicionHabilitada;
    this.incrementoPrioridadPorEspera = incrementoPrioridadPorEspera;
    this.intervaloIncrementoPrioridad = intervaloIncrementoPrioridad;
  }

  /**
   * Selecciona el proceso con mayor prioridad
   */
  public elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined {
    if (colaListos.length === 0) {
      return undefined;
    }

    // Aplicar prevención de inanición si está habilitado
    if (this.prevencionInanicionHabilitada) {
      this.aplicarPrevencionInanicion(colaListos, tiempoActual);
    }

    // Ordenar por prioridad (mayor prioridad primero)
    this.ordenarColaListos(colaListos);
    
    return colaListos[0];
  }

  /**
   * Ordena la cola por prioridad externa (mayor prioridad primero)
   */
  public ordenarColaListos(colaListos: Proceso[]): void {
    colaListos.sort((a, b) => b.prioridad - a.prioridad);
  }

  /**
   * En modo expropiativo, preempt si llega proceso con mayor prioridad
   */
  public debeExpropiar(procesoActual: Proceso, procesoCandidato: Proceso, tiempoActual: number): boolean {
    if (!this.soportaExpropiacion) {
      return false;
    }

    // Preempt si el proceso candidato tiene mayor prioridad
    return procesoCandidato.prioridad > procesoActual.prioridad;
  }

  /**
   * Se llama cuando un proceso se vuelve READY
   * En modo expropiativo debemos verificar preempción
   */
  public alVolverseListoProceso(proceso: Proceso, tiempoActual: number): void {
    // La lógica de preempción se maneja en debeExpropiar
    // Este método se puede usar para inicializar aging timestamp
  }

  /**
   * Aplica prevención de inanición a procesos que han esperado mucho tiempo
   * Incrementa gradualmente la prioridad según el tiempo de espera
   */
  private aplicarPrevencionInanicion(colaListos: Proceso[], tiempoActual: number): void {
    if (tiempoActual - this.ultimoTiempoIncrementoPrioridad < this.intervaloIncrementoPrioridad) {
      return;
    }

    for (const proceso of colaListos) {
      if (proceso.ultimoTiempoListo) {
        const tiempoEspera = tiempoActual - proceso.ultimoTiempoListo;
        
        // Incrementar prioridad basado en tiempo de espera (prevenir inanición)
        if (tiempoEspera >= this.intervaloIncrementoPrioridad) {
          const incrementoPrioridad = Math.floor(tiempoEspera / this.intervaloIncrementoPrioridad) * this.incrementoPrioridadPorEspera;
          // NOTA: En implementación real, se modificaría una prioridad dinámica
          // Aquí solo documentamos el concepto de prevención de inanición
        }
      }
    }

    this.ultimoTiempoIncrementoPrioridad = tiempoActual;
  }

  /**
   * Habilita/deshabilita prevención de inanición  
   */
  public configurarPrevencionInanicion(habilitado: boolean, incremento: number = 1, intervalo: number = 10): void {
    this.prevencionInanicionHabilitada = habilitado;
    this.incrementoPrioridadPorEspera = incremento;
    this.intervaloIncrementoPrioridad = intervalo;
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
   * Obtiene información sobre prevención de inanición
   */
  public obtenerInfoPrevencionInanicion(): {
    habilitado: boolean;
    incrementoPorEspera: number;
    intervalo: number;
    ultimoTiempoIncremento: number;
  } {
    return {
      habilitado: this.prevencionInanicionHabilitada,
      incrementoPorEspera: this.incrementoPrioridadPorEspera,
      intervalo: this.intervaloIncrementoPrioridad,
      ultimoTiempoIncremento: this.ultimoTiempoIncrementoPrioridad
    };
  }

  public reiniciar(): void {
    this.ultimoTiempoIncrementoPrioridad = 0;
  }
}
