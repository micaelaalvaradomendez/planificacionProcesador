/**
 * Caso de uso: Construir datos para diagrama de Gantt
 * Convierte eventos de simulación en segmentos visualizables del diagrama de Gantt
 */

import type { SimEvent, RunConfig } from '../../domain/types';
import { GanttBuilder } from '../../domain/services';

/**
 * Construye un diagrama de Gantt completo a partir de eventos de simulación
 * @deprecated Usar GanttBuilder.construirDiagramaGantt directamente
 */
export function construirDiagramaGantt(eventos: SimEvent[], config?: RunConfig) {
  return GanttBuilder.construirDiagramaGantt(eventos, config);
}

// Re-exportar tipos para compatibilidad
export type { 
  DiagramaGantt, 
  EstadisticasGantt 
} from '../../domain/services';
