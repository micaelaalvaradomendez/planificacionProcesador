import type { Trace, TraceEvent } from '../engine/types';
import type { Proceso } from '../model/proceso';

/**
 * Métricas por proceso individual
 */
export interface ProcessMetrics {
  pid: number;
  arribo: number;
  fin: number;
  servicioCPU: number;
  TRp: number; // Tiempo Respuesta = fin - arribo
  TE: number;  // Tiempo Espera = TRp - servicioCPU  
  TRn: number; // Tiempo Respuesta Normalizado = TRp/servicioCPU
}

/**
 * Métricas globales del sistema
 */
export interface GlobalMetrics {
  TRpPromedio: number;
  TEPromedio: number;
  TRnPromedio: number;
  throughput: number;
  cambiosDeContexto: number;
  expropiaciones: number;
  tiempoTotalSimulacion: number;
}

/**
 * Builder de métricas basado en trace de simulación
 */
export class MetricsBuilder {
  /**
   * Construye métricas por proceso desde un trace
   */
  static build(trace: Trace, procesos: Proceso[]): ProcessMetrics[] {
    const metricas: ProcessMetrics[] = [];
    
    for (const proceso of procesos) {
      const pid = proceso.pid;
      const arribo = proceso.arribo;
      
      // finUltimaActividad: usar el evento C→T final (incluye TFP)
      const fin = this.finUltimaActividad(pid, trace);
      
      // servicioCPU: suma de slices CPU únicamente
      const servicioCPU = this.servicioCPU(pid, trace);
      
      // Calcular métricas
      const TRp = fin - arribo;
      const TE = TRp - servicioCPU;
      const TRn = servicioCPU > 0 ? TRp / servicioCPU : 0;
      
      metricas.push({
        pid,
        arribo,
        fin,
        servicioCPU,
        TRp,
        TE,
        TRn
      });
    }
    
    return metricas;
  }
  
  /**
   * Construye métricas globales desde métricas de procesos
   */
  static buildGlobal(processMetrics: ProcessMetrics[], trace: Trace): GlobalMetrics {
    const count = processMetrics.length;
    if (count === 0) {
      return {
        TRpPromedio: 0,
        TEPromedio: 0,
        TRnPromedio: 0,
        throughput: 0,
        cambiosDeContexto: 0,
        expropiaciones: 0,
        tiempoTotalSimulacion: 0
      };
    }
    
    // Promedios
    const TRpPromedio = processMetrics.reduce((sum, m) => sum + m.TRp, 0) / count;
    const TEPromedio = processMetrics.reduce((sum, m) => sum + m.TE, 0) / count;
    const TRnPromedio = processMetrics.reduce((sum, m) => sum + m.TRn, 0) / count;
    
    // Tiempo total de simulación (momento del último evento)
    const ultimoEvento = trace.events.length > 0 
      ? Math.max(...trace.events.map(e => e.t))
      : 0;
    const ultimoSlice = trace.slices.length > 0
      ? Math.max(...trace.slices.map(s => s.end))
      : 0;
    const tiempoTotalSimulacion = Math.max(ultimoEvento, ultimoSlice);
    
    // Throughput (procesos por unidad de tiempo)
    const throughput = tiempoTotalSimulacion > 0 ? count / tiempoTotalSimulacion : 0;
    
    // Contadores de eventos
    const cambiosDeContexto = this.contarCambiosContexto(trace);
    const expropiaciones = this.contarExpropiaciones(trace);
    
    return {
      TRpPromedio,
      TEPromedio, 
      TRnPromedio,
      throughput,
      cambiosDeContexto,
      expropiaciones,
      tiempoTotalSimulacion
    };
  }
  
  /**
   * Encuentra el momento de finalización de un proceso
   * Usa el evento C→T final que incluye TFP
   */
  private static finUltimaActividad(pid: number, trace: Trace): number {
    // Buscar el último evento C→T para este pid
    const eventosFinalizacion = trace.events
      .filter(e => e.pid === pid && e.type === 'C→T')
      .sort((a, b) => b.t - a.t); // ordenar por tiempo descendente
    
    if (eventosFinalizacion.length > 0) {
      return eventosFinalizacion[0].t; // el más reciente
    }
    
    // Fallback: usar el final del último slice
    const slicesDelProceso = trace.slices
      .filter(s => s.pid === pid)
      .sort((a, b) => b.end - a.end);
    
    return slicesDelProceso.length > 0 ? slicesDelProceso[0].end : 0;
  }
  
  /**
   * Calcula tiempo total de servicio CPU para un proceso
   * Solo cuenta slices CPU reales, NO TCP/TIP/TFP/IO
   */
  private static servicioCPU(pid: number, trace: Trace): number {
    return trace.slices
      .filter(s => s.pid === pid)
      .reduce((total, slice) => total + (slice.end - slice.start), 0);
  }
  
  /**
   * Cuenta cambios de contexto (eventos L→C)
   */
  private static contarCambiosContexto(trace: Trace): number {
    return trace.events
      .filter(e => e.type === 'L→C')
      .length;
  }
  
  /**
   * Cuenta expropiaciones (eventos C→L por preemption)
   * Solo cuenta C→L con reason='preempt', NO C→L por RR/quantum
   */
  private static contarExpropiaciones(trace: Trace): number {
    return trace.events
      .filter(e => e.type === 'C→L' && e.data?.reason === 'preempt')
      .length;
  }
}
