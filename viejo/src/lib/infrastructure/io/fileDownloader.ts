/**
 * Utilidades para descarga de archivos en el navegador
 * Funciones para descargar resultados de simulación en diferentes formatos
 */

import type { Metrics, Workload, SimEvent } from '../../domain/types';
import { exportarEventosCsv } from './exportEvents';
import { exportarMetricasJson, conPorcentajes } from './exportMetrics';

/**
 * Descarga un blob como archivo con el nombre especificado
 */
function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Descarga eventos de simulación como archivo CSV
 */
export function descargarEventos(events: SimEvent[], workloadName?: string): void {
  const blob = exportarEventosCsv(events);
  const nombreArchivo = `eventos_${workloadName || 'simulacion'}.csv`;
  descargarBlob(blob, nombreArchivo);
}

/**
 * Descarga métricas de simulación como archivo JSON
 */
export function descargarMetricas(metrics: Metrics, workloadName?: string): void {
  const blob = exportarMetricasJson(conPorcentajes(metrics));
  const nombreArchivo = `metricas_${workloadName || 'simulacion'}.json`;
  descargarBlob(blob, nombreArchivo);
}

/**
 * Descarga workload como archivo JSON
 */
export function descargarWorkload(workload: Workload, nombreArchivo?: string): void {
  const json = JSON.stringify(workload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const nombre = nombreArchivo || `${workload.workloadName || 'workload'}.json`;
  descargarBlob(blob, nombre);
}

/**
 * Descarga contenido de texto como archivo
 */
export function descargarTexto(contenido: string, nombreArchivo: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([contenido], { type: `${mimeType};charset=utf-8` });
  descargarBlob(blob, nombreArchivo);
}

/**
 * Descarga diagrama de Gantt como JSON
 */
export function descargarGanttJSON(gantt: any, nombreBase: string): void {
  const json = JSON.stringify(gantt, null, 2);
  descargarTexto(json, `${nombreBase}_gantt.json`, 'application/json');
}
