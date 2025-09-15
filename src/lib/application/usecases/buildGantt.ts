/**
 * Caso de uso: Construir datos para diagrama de Gantt
 * Convierte eventos de simulación en segmentos visualizables del diagrama de Gantt
 */

import type { SimEvent } from '../../domain/types';
import { GanttBuilder } from '../../domain/services';

/**
 * Construye un diagrama de Gantt completo a partir de eventos de simulación
 * @deprecated Usar GanttBuilder.construirDiagramaGantt directamente
 */
export function construirDiagramaGantt(eventos: SimEvent[]) {
  return GanttBuilder.construirDiagramaGantt(eventos);
}

// Re-exportar tipos para compatibilidad
export type { 
  DiagramaGantt, 
  EstadisticasGantt 
} from '../../domain/services';
