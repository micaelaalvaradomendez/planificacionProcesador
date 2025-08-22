import type { GanttSlice } from '../model/types';

export function sortGantt(slices: GanttSlice[]): GanttSlice[] {
  return [...slices].sort((a, b) => a.tStart - b.tStart || a.tEnd - b.tEnd);
}

// Utilidad para verificar solapes (opcional)
export function validateNoOverlap(slices: GanttSlice[]): string[] {
  const e: string[] = [];
  const sorted = sortGantt(slices);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i-1], cur = sorted[i];
    if (cur.tStart < prev.tEnd && cur.process === prev.process) {
      e.push(`Solape de Gantt para ${cur.process} entre ${prev.tStart}-${prev.tEnd} y ${cur.tStart}-${cur.tEnd}`);
    }
  }
  return e;
}
