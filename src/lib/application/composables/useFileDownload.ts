import { descargarEventos, descargarMetricas } from '../usecases/exportResults';
import type { SimEvent, Metrics } from '$lib/model/types';

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