import type { Trace } from '../engine/types';
import type { GanttModel, GanttTrack, GanttSeg } from './schema';

/**
 * Builder para generar modelo Gantt desde trace de simulación
 */
export class GanttBuilder {
  /**
   * Construye modelo Gantt filtrando solo slices CPU
   * NO incluye TIP/TCP/TFP/IO como barras CPU
   */
  static build(trace: Trace): GanttModel {
    // Filtrar solo slices CPU reales
    const slicesCPU = this.filtrarCPU(trace.slices);
    
    if (slicesCPU.length === 0) {
      return {
        tracks: [],
        tMin: 0,
        tMax: 0
      };
    }
    
    // Agrupar por PID
    const slicesPorPID = this.agruparPorPID(slicesCPU);
    
    // Crear tracks
    const tracks: GanttTrack[] = [];
    for (const [pidStr, slices] of slicesPorPID.entries()) {
      const pid = pidStr;
      
      // Convertir slices a segmentos, ordenados por tiempo
      const segments = slices
        .map(slice => ({
          start: slice.start,
          end: slice.end
        }))
        .sort((a, b) => a.start - b.start);
      
      tracks.push({
        pid,
        segments
      });
    }
    
    // Ordenar tracks por PID para presentación consistente
    tracks.sort((a, b) => a.pid.localeCompare(b.pid));
    
        // Calcular rango temporal
    const allStarts = tracks.flatMap(t => t.segments.map(s => s.start));
    const allEnds = tracks.flatMap(t => t.segments.map(s => s.end));
    
    const tMin = allStarts.length > 0 ? Math.min(...allStarts) : 0;
    const tMax = allEnds.length > 0 ? Math.max(...allEnds) : 0;
    
    return {
      tracks,
      tMin,
      tMax
    };
  }
  
  /**
   * Filtra solo slices que representan tiempo CPU real
   * En el trace actual, todos los slices son CPU, pero podría 
   * expandirse para filtrar por tipo cuando se agreguen otros tipos
   */
  private static filtrarCPU(slices: Array<{pid: number; start: number; end: number}>): Array<{pid: number; start: number; end: number}> {
    // Por ahora todos los slices en trace son CPU
    // En el futuro se podría filtrar por slice.tipo === 'CPU'
    return slices.filter(slice => {
      // Validar que el slice sea válido
      return slice.end > slice.start && slice.start >= 0;
    });
  }
  
  /**
   * Agrupa slices por PID
   */
  private static agruparPorPID(slices: Array<{pid: number; start: number; end: number}>): Map<string, Array<{pid: number; start: number; end: number}>> {
    const grupos = new Map<string, Array<{pid: number; start: number; end: number}>>();
    
    for (const slice of slices) {
      const pidStr = slice.pid.toString();
      
      if (!grupos.has(pidStr)) {
        grupos.set(pidStr, []);
      }
      
      grupos.get(pidStr)!.push(slice);
    }
    
    return grupos;
  }
  
  /**
   * Detecta gaps reales entre segmentos (para debug/análisis)
   * Los "huecos" en el Gantt representan tiempo donde el proceso 
   * no tenía CPU (estaba en ready, blocked, o no había arribado)
   */
  static detectarHuecos(track: GanttTrack): Array<{start: number; end: number}> {
    const huecos: Array<{start: number; end: number}> = [];
    const segments = track.segments.sort((a: GanttSeg, b: GanttSeg) => a.start - b.start);
    
    for (let i = 1; i < segments.length; i++) {
      const prevEnd = segments[i - 1].end;
      const currentStart = segments[i].start;
      
      if (currentStart > prevEnd) {
        huecos.push({
          start: prevEnd,
          end: currentStart
        });
      }
    }
    
    return huecos;
  }
}
