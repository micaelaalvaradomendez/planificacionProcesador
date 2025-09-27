// src/lib/engine/types.ts

/** Tipos de evento del motor (notación canónica N,L,C,B,F) */
export type EventType = 'C→T' | 'C→B' | 'C→L' | 'B→L' | 'N→L' | 'L→C';

/**
 * Prioridad de eventos (1 = mayor prioridad)
 * Regla de la consigna:
 *   1:C→T, 2:C→B, 3:C→L, 4:B→L, 5:N→L, 6:L→C
 */
export const EVENT_PRIORITY: Record<EventType, number> = {
  'C→T': 1,
  'C→B': 2,
  'C→L': 3,
  'B→L': 4,
  'N→L': 5,
  'L→C': 6
};

/** Evento de simulación (mínimo necesario para el loop) */
export interface SimEvent {
  t: number;            // instante del evento (tick/ms)
  type: EventType;      // tipo de transición
  pid?: number;         // proceso afectado (si aplica)
  data?: Record<string, unknown>; // payload opcional (quantum, idxRáfaga, etc.)
}

/** Trazas para depurar: cortes del Gantt + eventos ocurridos */
export interface TraceSlice {
  pid: number;
  start: number;
  end: number;
}

export interface TraceEvent {
  t: number;
  type: EventType;
  pid?: number;
  data?: Record<string, unknown>;
}

export interface Trace {
  slices: TraceSlice[];
  events: TraceEvent[];
}
