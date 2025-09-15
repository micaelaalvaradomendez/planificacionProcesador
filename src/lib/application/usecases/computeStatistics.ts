/**
 * Caso de uso: Calcular estadísticas y KPIs de la simulación
 * Proporciona análisis detallado de rendimiento y métricas comparativas
 */

import type { Metrics, SimEvent } from '../../domain/types';
import { MetricsCalculator } from '../../domain/services';

/**
 * Calcula estadísticas extendidas de la simulación
 * @deprecated Usar MetricsCalculator.calcularEstadisticasExtendidas directamente
 */
export function calcularEstadisticasExtendidas(metricas: Metrics, eventos: SimEvent[] = []) {
  return MetricsCalculator.calcularEstadisticasExtendidas(metricas, eventos);
}

// Re-exportar tipos para compatibilidad
export type { 
  EstadisticasExtendidas, 
  AnalisisRendimiento, 
  MetricasComparativas 
} from '../../domain/services';
