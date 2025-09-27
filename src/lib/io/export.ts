// src/lib/io/export.ts
import type { Trace } from '../engine/types';
import type { ProcessMetrics, GlobalMetrics } from '../metrics/metricas';
import type { GanttModel } from '../gantt/schema';

/**
 * Formato de exportación completo de resultados de simulación
 */
export interface SimulationExport {
  metadata: {
    timestamp: string;
    politica: string;
    configuracion: Record<string, unknown>;
  };
  trace: Trace;
  metricas: {
    porProceso: ProcessMetrics[];
    global: GlobalMetrics;
  };
  gantt: GanttModel;
}

/**
 * Exporta resultados de simulación a JSON
 */
export function exportToJSON(
  result: SimulationExport,
  filename?: string
): string {
  const json = JSON.stringify(result, null, 2);
  
  if (filename && typeof window !== 'undefined') {
    downloadJSON(json, filename);
  }
  
  return json;
}

/**
 * Exporta métricas a CSV
 */
export function exportMetricsToCSV(
  metricas: ProcessMetrics[],
  filename?: string
): string {
  const headers = ['PID', 'Arribo', 'Fin', 'ServicioCPU', 'TRp', 'TE', 'TRn'];
  const rows = metricas.map(m => [
    m.pid,
    m.arribo,
    m.fin,
    m.servicioCPU,
    m.TRp,
    m.TE,
    m.TRn.toFixed(2)
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\\n');
  
  if (filename && typeof window !== 'undefined') {
    downloadCSV(csv, filename);
  }
  
  return csv;
}

/**
 * Exporta trace a CSV
 */
export function exportTraceToCSV(
  trace: Trace,
  filename?: string
): string {
  const headers = ['Tipo', 'Tiempo', 'PID', 'Evento', 'Data'];
  const rows: string[] = [];
  
  // Eventos
  trace.events.forEach(e => {
    rows.push([
      'Evento',
      e.t.toString(),
      e.pid?.toString() || '',
      e.type,
      e.data ? JSON.stringify(e.data) : ''
    ].join(','));
  });
  
  // Slices
  trace.slices.forEach(s => {
    rows.push([
      'Slice',
      s.start.toString(),
      s.pid.toString(),
      `CPU ${s.start}-${s.end}`,
      `Duración: ${s.end - s.start}`
    ].join(','));
  });
  
  const csv = [headers.join(','), ...rows].join('\\n');
  
  if (filename && typeof window !== 'undefined') {
    downloadCSV(csv, filename);
  }
  
  return csv;
}

/**
 * Helper para descargar JSON en el browser
 */
function downloadJSON(content: string, filename: string): void {
  if (typeof window === 'undefined') return;
  
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper para descargar CSV en el browser
 */
function downloadCSV(content: string, filename: string): void {
  if (typeof window === 'undefined') return;
  
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
