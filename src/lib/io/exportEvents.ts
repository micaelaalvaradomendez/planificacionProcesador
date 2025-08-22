import type { SimEvent } from '../model/types';
import { eventoALineaCsv, ordenarEventosParaExportar } from '../sim/events';

export function exportarEventosCsv(eventos: SimEvent[]): Blob {
  const encabezado = 'tiempo;tipoEvento;proceso;extra';
  const lineas = ordenarEventosParaExportar(eventos).map(eventoALineaCsv);
  const csv = [encabezado, ...lineas].join('\n');
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}
