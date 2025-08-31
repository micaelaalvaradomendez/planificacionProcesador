import type { GanttSlice } from '../../model/types';

export function ordenarGantt(segmentos: GanttSlice[]): GanttSlice[] {
  return [...segmentos].sort((a, b) => a.tStart - b.tStart || a.tEnd - b.tEnd);
}

// Utilidad para verificar solapes (opcional)
export function validarSinSolapes(segmentos: GanttSlice[]): string[] {
  const e: string[] = [];
  const ordenados = ordenarGantt(segmentos);
  for (let i = 1; i < ordenados.length; i++) {
    const anterior = ordenados[i-1], actual = ordenados[i];
    if (actual.tStart < anterior.tEnd && actual.process === anterior.process) {
      e.push(`Solape de Gantt para ${actual.process} entre ${anterior.tStart}-${anterior.tEnd} y ${actual.tStart}-${actual.tEnd}`);
    }
  }
  return e;
}
