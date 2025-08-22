import type { SimEvent } from '../model/types';

export function sortEventsForExport(events: SimEvent[]): SimEvent[] {
  // Orden cronológico; si empatan en time, mantené el orden de creación (estable)
  return [...events].sort((a, b) => a.time - b.time);
}

export function eventToCsvLine(e: SimEvent): string {
  const extra = e.extra ? e.extra.replaceAll(';', ',') : '';
  return `${e.time};${e.type};${e.process};${extra}`;
}
