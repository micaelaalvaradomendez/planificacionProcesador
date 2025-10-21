// src/lib/engine/types.ts

/** Tipos de evento del motor (notación canónica N,L,C,B,F) */
export type EventType = 'C→T' | 'C→B' | 'C→L' | 'B→L' | 'N→L' | 'L→C' | 'CPU_DONE' | 'ADMIN_FINISH';

/**
 * Prioridad de eventos (1 = mayor prioridad)
 * Orden correcto para eventos simultáneos:
 *   0: CPU_DONE (fin de ráfaga de CPU)
 *   1: C→T (terminado)
 *   2: C→B (bloqueado)  
 *   3: C→L (preemption/quantum)
 *   4: B→L (retorno de E/S)
 *   5: N→L (nuevo a listo)
 *   6: L→C (despacho)
 *   7: ADMIN_FINISH (overhead administrativo)
 */
export const EVENT_PRIORITY: Record<EventType, number> = {
  'CPU_DONE': 0,     // Fin de ráfaga CPU (mayor prioridad)
  'C→T': 1,          // Terminado
  'C→B': 2,          // Bloqueado
  'C→L': 3,          // Preemption/quantum  
  'B→L': 4,          // Retorno de E/S
  'N→L': 5,          // Nuevo a listo
  'L→C': 6,          // Despacho
  'ADMIN_FINISH': 7  // Overhead administrativo (menor prioridad)
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

/** Tipos de overhead visibles en el Gantt */
export type OverheadKind = 'TIP' | 'TCP' | 'TFP';

export interface OverheadSlice {
  pid: number;
  t0: number;
  t1: number;
  kind: OverheadKind; // TIP | TCP | TFP
}

export interface Trace {
  slices: TraceSlice[];
  events: TraceEvent[];
  overheads?: OverheadSlice[]; // NUEVO: para mostrar TIP/TCP/TFP en Gantt
}
