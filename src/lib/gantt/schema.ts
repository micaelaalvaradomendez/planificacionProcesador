/**
 * Tipos para el modelo de Gantt de UI
 */

/**
 * Segmento individual en una track del Gantt
 */
export interface GanttSeg {
  start: number;
  end: number;
}

/**
 * Track completa de un proceso en el Gantt
 */
export interface GanttTrack {
  pid: string;
  segments: GanttSeg[];
}

/**
 * Modelo completo del Gantt para renderizado
 */
export interface GanttModel {
  tracks: GanttTrack[];
  tMin: number;  // tiempo mínimo en el diagrama
  tMax: number;  // tiempo máximo en el diagrama
}
