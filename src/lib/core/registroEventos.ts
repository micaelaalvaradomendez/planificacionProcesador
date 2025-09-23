/**
 * Sistema Centralizado de Eventos - Unifica registro y proyección
 * 
 * PROBLEMA RESUELTO:
 * - Antes: Doble registro (eventosInternos + eventosExportacion)
 * - Ahora: Fuente única (eventos crudos) + proyección bajo demanda
 */

import type { SimEvent } from '../domain/types';
import { TipoEvento } from '../domain/types';

// Tipos de eventos internos (crudos)
export type TipoEventoInterno =
  | 'Arribo'                    // Nuevo→Listo (con TIP si corresponde)
  | 'FinTIP'                    // Nuevo→Listo (fin del tiempo de incorporación)
  | 'Despacho'                  // Listo→Corriendo (consume TCP)
  | 'FinRafagaCPU'              // Corriendo→(Bloqueado|Terminado)
  | 'AgotamientoQuantum'        // Corriendo→Listo (RR)
  | 'FinES'                     // Bloqueado→Listo (INSTANTÁNEO: Δt=0, NO consume TCP)
  | 'FinTFP';                   // cierre contable del proceso

// Evento crudo interno (fuente única de verdad)
export interface EventoInterno {
  tiempo: number;
  tipo: TipoEventoInterno;
  proceso?: string;             // name del proceso
  extra?: string;               // detalles adicionales
}

/**
 * Mapea eventos internos a tipos canónicos de exportación
 */
const MAPEO_EVENTOS_EXPORTACION: Record<TipoEventoInterno, TipoEvento> = {
  'Arribo': TipoEvento.JOB_LLEGA,
  'FinTIP': TipoEvento.NUEVO_A_LISTO,
  'Despacho': TipoEvento.LISTO_A_CORRIENDO,
  'FinRafagaCPU': TipoEvento.FIN_RAFAGA_CPU,
  'AgotamientoQuantum': TipoEvento.QUANTUM_EXPIRES,
  'FinES': TipoEvento.BLOQUEADO_A_LISTO,
  'FinTFP': TipoEvento.PROCESO_TERMINA
};

/**
 * Registro centralizado de eventos
 */
export class RegistroEventos {
  private eventos: EventoInterno[] = [];

  /**
   * Registra un evento interno (fuente única)
   */
  registrar(tiempo: number, tipo: TipoEventoInterno, proceso?: string, extra?: string): void {
    this.eventos.push({
      tiempo,
      tipo,
      proceso,
      extra
    });
  }

  /**
   * Obtiene todos los eventos internos (crudos)
   */
  obtenerEventosInternos(): EventoInterno[] {
    return [...this.eventos]; // copia defensiva
  }

  /**
   * Proyecta eventos internos a formato de exportación
   */
  proyectarEventosExportacion(): SimEvent[] {
    return this.eventos.map(evento => ({
      tiempo: evento.tiempo,
      tipo: MAPEO_EVENTOS_EXPORTACION[evento.tipo],
      proceso: evento.proceso || 'SISTEMA',
      extra: evento.extra
    }));
  }

  /**
   * Limpia todos los eventos registrados
   */
  limpiar(): void {
    this.eventos = [];
  }

  /**
   * Filtra eventos por tipo específico
   */
  filtrarPorTipo(tipos: TipoEventoInterno[]): EventoInterno[] {
    return this.eventos.filter(evento => tipos.includes(evento.tipo));
  }

  /**
   * Filtra eventos por proceso específico
   */
  filtrarPorProceso(procesos: string[]): EventoInterno[] {
    return this.eventos.filter(evento => 
      evento.proceso && procesos.includes(evento.proceso)
    );
  }

  /**
   * Filtra eventos por rango de tiempo
   */
  filtrarPorTiempo(inicio: number, fin: number): EventoInterno[] {
    return this.eventos.filter(evento => 
      evento.tiempo >= inicio && evento.tiempo <= fin
    );
  }

  /**
   * Obtiene estadísticas de eventos
   */
  obtenerEstadisticas(): {
    totalEventos: number;
    eventosPorTipo: Record<TipoEventoInterno, number>;
    eventosPorProceso: Record<string, number>;
    tiempoInicio: number;
    tiempoFin: number;
  } {
    const eventosPorTipo = {} as Record<TipoEventoInterno, number>;
    const eventosPorProceso = {} as Record<string, number>;

    for (const evento of this.eventos) {
      eventosPorTipo[evento.tipo] = (eventosPorTipo[evento.tipo] || 0) + 1;
      if (evento.proceso) {
        eventosPorProceso[evento.proceso] = (eventosPorProceso[evento.proceso] || 0) + 1;
      }
    }

    const tiempos = this.eventos.map(e => e.tiempo);
    const tiempoInicio = tiempos.length > 0 ? Math.min(...tiempos) : 0;
    const tiempoFin = tiempos.length > 0 ? Math.max(...tiempos) : 0;

    return {
      totalEventos: this.eventos.length,
      eventosPorTipo,
      eventosPorProceso,
      tiempoInicio,
      tiempoFin
    };
  }
}

/**
 * Instancia global del registro de eventos
 */
export const registroEventos = new RegistroEventos();

/**
 * Función de conveniencia para registrar eventos
 */
export function registrarEvento(tiempo: number, tipo: TipoEventoInterno, proceso?: string, extra?: string): void {
  registroEventos.registrar(tiempo, tipo, proceso, extra);
}