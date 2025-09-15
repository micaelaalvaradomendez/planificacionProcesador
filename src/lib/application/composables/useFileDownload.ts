import { descargarEventos, descargarMetricas } from '$lib/infrastructure/io/fileDownloader';
import type { SimEvent, Metrics } from '$lib/domain/types';

export function useFileDownload() {
  function descargarEventosUI(events: SimEvent[]) {
    if (events && events.length > 0) {
      descargarEventos(events);
    }
  }

  function descargarMetricasUI(metrics: Metrics) {
    if (metrics) {
      descargarMetricas(metrics);
    }
  }

  return {
    descargarEventosUI,
    descargarMetricasUI
  };
}