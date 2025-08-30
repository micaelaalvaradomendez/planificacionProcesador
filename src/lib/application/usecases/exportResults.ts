import { exportarEventosCsv } from '$lib/io/exportEvents';
import { exportarMetricasJson, conPorcentajes } from '$lib/io/exportMetrics';
import type { Metrics, Workload, SimEvent } from '$lib/model/types';

export function descargarEventos(events: SimEvent[], workloadName?: string) {
  const blob = exportarEventosCsv(events);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `eventos_${workloadName || 'simulacion'}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function descargarMetricas(metrics: Metrics, workloadName?: string) {
  const blob = exportarMetricasJson(conPorcentajes(metrics));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `metricas_${workloadName || 'simulacion'}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
