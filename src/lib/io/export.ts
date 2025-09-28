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
    downloadJSONLegacy(json, filename);
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
 * Helper para descargar JSON en el browser (versión legacy)
 */
function downloadJSONLegacy(content: string, filename: string): void {
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

// ==================== PASO 12: NUEVAS FUNCIONES ====================

import type { Proceso } from '../model/proceso';
import type { Costos } from '../model/costos';

/**
 * Configuración de simulación para export/import
 */
export type ExportSimulationConfig = {
  algoritmo: string;
  costos: Partial<Costos>;
  quantum?: number;
};

/**
 * Resultado completo para exportar
 */
export type ResultadoExport = {
  kind: 'sim-result';
  version: 1;
  timestamp: string;
  cfg: ExportSimulationConfig;
  procesos: Proceso[];
  trace: Trace;
  metricas: {
    porProceso: ProcessMetrics[];
    global: GlobalMetrics;
  };
  gantt: GanttModel;
};

/**
 * Construye JSON completo del resultado
 */
export function buildResultadoJSON(
  cfg: ExportSimulationConfig,
  procesos: Proceso[],
  trace: Trace,
  metricas: { porProceso: ProcessMetrics[]; global: GlobalMetrics },
  gantt: GanttModel
): ResultadoExport {
  return {
    kind: 'sim-result',
    version: 1,
    timestamp: new Date().toISOString(),
    cfg,
    procesos,
    trace,
    metricas,
    gantt
  };
}

/**
 * Descarga un blob genérico
 */
export function downloadBlob(filename: string, blob: Blob) {
  if (typeof window === 'undefined') return;
  
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
}

/**
 * Descarga JSON usando la nueva función downloadBlob
 */
export function downloadJSON(filenameBase: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  downloadBlob(`${filenameBase}.json`, new Blob([json], { type: 'application/json' }));
}

/**
 * CSV escaper mejorado
 */
const csvEscape = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Convierte métricas a CSV con separador ;
 */
export function metricasToCSV(metricas: { porProceso: ProcessMetrics[] }): string {
  const rows: string[] = [];
  rows.push(['pid', 'retorno', 'espera', 'normalizado'].join(';'));
  for (const m of metricas?.porProceso ?? []) {
    rows.push([m.pid, m.TRp, m.TE, m.TRn].map(csvEscape).join(';'));
  }
  return rows.join('\n');
}

/**
 * Convierte trace a CSV con separador ;
 */
export function traceToCSV(trace: Trace): string {
  const rows: string[] = [];
  rows.push(['t', 'type', 'pid', 'data'].join(';'));
  for (const ev of trace?.events ?? []) {
    rows.push([ev.t, ev.type, ev.pid ?? '', ev.data ? JSON.stringify(ev.data) : ''].map(csvEscape).join(';'));
  }
  return rows.join('\n');
}

/**
 * Descarga métricas como CSV
 */
export function downloadMetricasCSV(filenameBase: string, metricas: { porProceso: ProcessMetrics[] }) {
  downloadBlob(`${filenameBase}-metricas.csv`, new Blob([metricasToCSV(metricas)], { type: 'text/csv' }));
}

/**
 * Descarga trace como CSV
 */
export function downloadTraceCSV(filenameBase: string, trace: Trace) {
  downloadBlob(`${filenameBase}-trace.csv`, new Blob([traceToCSV(trace)], { type: 'text/csv' }));
}
