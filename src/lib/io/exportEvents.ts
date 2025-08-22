import type { SimEvent } from '../model/types';
import { eventToCsvLine, sortEventsForExport } from '../sim/events';

export function exportEventsCsv(events: SimEvent[]): Blob {
  const header = 'time;eventType;process;extra';
  const lines = sortEventsForExport(events).map(eventToCsvLine);
  const csv = [header, ...lines].join('\n');
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}
