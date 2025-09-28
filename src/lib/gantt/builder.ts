import type { Trace } from '../engine/types';
import type { GanttModel, GanttTrack, GanttSeg } from './schema';

/**
 * Builder para generar modelo Gantt desde trace de simulación
 */
export class GanttBuilder {
  /**
   * Construye modelo Gantt incluyendo slices CPU y overheads (TIP/TCP/TFP)
   */
  static build(trace: Trace): GanttModel {
    // Obtener todos los segmentos agrupados por PID: CPU + overheads
    const segmentosPorPID = this.crearSegmentos(trace);
    
    if (segmentosPorPID.size === 0) {
      return {
        tracks: [],
        tMin: 0,
        tMax: 0
      };
    }
    
    // Crear tracks
    const tracks: GanttTrack[] = [];
    for (const [pidStr, segments] of segmentosPorPID.entries()) {
      const pid = pidStr;
      
      // Ordenar segmentos por tiempo
      const sortedSegments = segments.sort((a, b) => a.start - b.start);
      
      tracks.push({
        pid,
        segments: sortedSegments
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
   * Crea todos los segmentos agrupados por PID: CPU slices + overhead slices
   */
  private static crearSegmentos(trace: Trace): Map<string, GanttSeg[]> {
    const grupos = new Map<string, GanttSeg[]>();
    
    // Helper para agregar segmento a un PID
    const agregarSegmento = (pid: number, segmento: GanttSeg) => {
      const pidStr = pid.toString();
      if (!grupos.has(pidStr)) {
        grupos.set(pidStr, []);
      }
      grupos.get(pidStr)!.push(segmento);
    };
    
    // Agregar slices CPU
    for (const slice of trace.slices) {
      if (slice.end > slice.start && slice.start >= 0) {
        agregarSegmento(slice.pid, {
          start: slice.start,
          end: slice.end,
          type: 'cpu'
        });
      }
    }
    
    // Agregar overhead slices si existen
    if (trace.overheads) {
      for (const overhead of trace.overheads) {
        if (overhead.t1 > overhead.t0 && overhead.t0 >= 0) {
          agregarSegmento(overhead.pid, {
            start: overhead.t0,
            end: overhead.t1,
            type: overhead.kind.toLowerCase() as 'tip' | 'tcp' | 'tfp'
          });
        }
      }
    }
    
    return grupos;
  }

  /**
   * Agrupa segmentos por PID (deprecated, ahora se hace en crearSegmentos)
   */
  private static agruparSegmentosPorPID(segmentos: GanttSeg[]): Map<string, GanttSeg[]> {
    // Este método ya no se usa, la agrupación se hace en crearSegmentos
    return new Map();
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
