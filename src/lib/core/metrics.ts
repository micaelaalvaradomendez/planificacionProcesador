/**
 * Cálculo de métricas de rendimiento del simulador
 * @deprecated Usar MetricsCalculator directamente desde domain/services
 */

import type { SimState } from './state';
import { MetricsCalculator } from '../domain/services';

/**
 * Calcula métricas completas de la simulación
 * @deprecated Usar MetricsCalculator.calcularMetricasCompletas directamente
 */
export function calcularMetricasCompletas(estadoFinal: SimState) {
  return MetricsCalculator.calcularMetricasCompletas(estadoFinal);
}

/**
 * Calcula métricas individuales para cada proceso
 * @deprecated Usar MetricsCalculator.calcularMetricasPorProceso directamente
 */
export function calcularMetricasPorProceso(estadoFinal: SimState) {
  return MetricsCalculator.calcularMetricasPorProceso(estadoFinal);
}

/**
 * Calcula métricas a nivel de tanda
 * @deprecated Usar MetricsCalculator.calcularMetricasTanda directamente
 */
export function calcularMetricasTanda(estadoFinal: SimState, metricasPorProceso: any[]) {
  return MetricsCalculator.calcularMetricasTanda(estadoFinal, metricasPorProceso);
}
