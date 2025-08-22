import { TipoEvento } from '../types';

/**
 * Evento discreto del sistema con prioridad para el ordenamiento
 */
export class Evento {
  constructor(
    public readonly tiempo: number,
    public readonly tipo: TipoEvento,
    public readonly idProceso: string,
    public readonly descripcion: string = ''
  ) {}

  obtenerPrioridad(): number {
    // Orden según consigna TP integrador:
    switch (this.tipo) {
      case TipoEvento.CORRIENDO_A_TERMINADO: return 1;  // 1. Corriendo a Terminado
      case TipoEvento.CORRIENDO_A_BLOQUEADO: return 2;  // 2. Corriendo a Bloqueado  
      case TipoEvento.CORRIENDO_A_LISTO: return 3;      // 3. Corriendo a Listo
      case TipoEvento.BLOQUEADO_A_LISTO: return 4;      // 4. Bloqueado a Listo
      case TipoEvento.NUEVO_A_LISTO: return 5;          // 5. Nuevo a Listo
      case TipoEvento.LISTO_A_CORRIENDO: return 6;      // 6. Listo a Corriendo (despacho)
      // Eventos principales del sistema
      case TipoEvento.JOB_LLEGA: return 0;              // Llegada de trabajo (antes que todo)
      case TipoEvento.DISPATCH: return 6;               // Mismo nivel que LISTO_A_CORRIENDO
      case TipoEvento.QUANTUM_EXPIRES: return 3;        // Tratado como expropiación
      case TipoEvento.IO_COMPLETA: return 4;            // Mismo que BLOQUEADO_A_LISTO
      default: return 10;
    }
  }

  compare(otro: Evento): number {
    if (this.tiempo !== otro.tiempo) {
      return this.tiempo - otro.tiempo;
    }
    return this.obtenerPrioridad() - otro.obtenerPrioridad();
  }
}

/**
 * Evento para la visualización del diagrama de Gantt
 */
export interface EventoGantt {
  tiempo: number;
  tipo: TipoEvento;
  idProceso: string;
  descripcion: string;
  duracion?: number;
}

/**
 * Segmento de tiempo en la línea temporal del diagrama de Gantt
 */
export interface SegmentoTimeline {
  tiempoInicio: number;
  tiempoFin: number;
  idProceso: string | null;  // null para tiempo idle
  tipo: 'CPU' | 'IDLE' | 'OS';
  descripcion?: string;
}

/**
 * Datos completos para la visualización del diagrama de Gantt
 */
export interface DatosGantt {
  eventos: EventoGantt[];
  segmentosTimeline: SegmentoTimeline[];
  duracionTotal: number;
  estadisticas: {
    tiempoTotalCPU: number;
    tiempoIdleCPU: number;
    tiempoOS: number;
    utilizacionCPU: number;
  };
}

/**
 * Estado de la CPU en un momento determinado
 */
export interface EstadoCPU {
  tiempo: number;
  procesoActual: string | null;
  colaListos: string[];
  colaBloqueados: string[];
  descripcion: string;
}

/**
 * Información del contexto de un evento para debugging/logging
 */
export interface ContextoEvento {
  tiempo: number;
  evento: TipoEvento;
  procesoAfectado: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  detallesAdicionales?: Record<string, any>;
}

/**
 * Comparador para eventos discretos considerando tiempo y prioridad
 */
export const comparadorEventos = (a: Evento, b: Evento): number => {
  return a.compare(b);
};
