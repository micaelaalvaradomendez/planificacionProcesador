import type { SimEvent } from '../model/types';

export function ordenarEventosParaExportar(eventos: SimEvent[]): SimEvent[] {
  // Orden cronológico; si empatan en tiempo, mantené el orden de creación (estable)
  return [...eventos].sort((a, b) => a.tiempo - b.tiempo);
}

export function eventoALineaCsv(e: SimEvent): string {
  const extra = e.extra ? e.extra.replaceAll(';', ',') : '';
  return `${e.tiempo};${e.tipo};${e.proceso};${extra}`;
}
