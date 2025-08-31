import { descargarEventos, descargarMetricas } from '../usecases/exportResults';
import type { SimulationEvent, Metrics } from '../usecases/simulationState';

export function useFileDownload() {
  function descargarEventosUI(events: SimulationEvent[]) {
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