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
  tiempoES: number;      // Tiempo en E/S (entrada/salida)
  tiempoEspera: number;  // Tiempo en estado Listo (espera)
  overheads: number;     // Suma de TIP + TCP + TFP para este proceso
  TRp: number;           // Tiempo de Retorno (turnaround) = fin - arribo
  TE: number;            // Tiempo de Espera total en Listo
  TRn: number;           // Tiempo de Respuesta Normalizada = TRp/servicioCPU
  tiempoRespuesta: number; // Tiempo de Respuesta = primer L→C - arribo
}

/**
 * Métricas globales del sistema
 */
export interface GlobalMetrics {
  TRpPromedio: number;
  TEPromedio: number;  
  TRnPromedio: number;
  tiempoRespuestaPromedio: number;
  throughput: number;
  cambiosDeContexto: number;
  expropiaciones: number;
  tiempoTotalSimulacion: number;
  // Nuevas métricas de CPU
  cpuOciosa: number;           // Tiempo CPU ociosa
  cpuOciosaPorc: number;       // % CPU ociosa
  utilizacionCPU: number;      // % Utilización CPU (busy + overheads)
  utilizacionCPUBusy: number;  // % Utilización CPU solo busy (sin overheads)
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
      
      // Tiempos calculados
      const fin = this.finUltimaActividad(pid, trace);
      const servicioCPU = this.servicioCPU(pid, trace);
      const tiempoES = this.tiempoES(pid, trace);
      const tiempoEspera = this.tiempoListo(pid, trace);
      const overheads = this.overheadsProceso(pid, trace);
      
      // Primer despacho a CPU (para tiempo de respuesta)
      const primerDespacho = trace.events
        .filter(e => e.pid === pid && e.type === 'L→C')
        .sort((a, b) => a.t - b.t)[0];
      const tiempoRespuesta = primerDespacho ? Math.max(0, primerDespacho.t - arribo) : 0;

      // Métricas clásicas
      const TRp = fin - arribo;              // Tiempo de Retorno (turnaround)
      const TE = tiempoEspera;               // Tiempo de Espera (en Listo)
      const TRn = servicioCPU > 0 ? TRp / servicioCPU : 0; // Respuesta Normalizada
      
      metricas.push({
        pid,
        arribo,
        fin,
        servicioCPU,
        tiempoES,
        tiempoEspera,
        overheads,
        TRp,
        TE,
        TRn,
        tiempoRespuesta
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
        tiempoRespuestaPromedio: 0,
        throughput: 0,
        cambiosDeContexto: 0,
        expropiaciones: 0,
        tiempoTotalSimulacion: 0,
        cpuOciosa: 0,
        cpuOciosaPorc: 0,
        utilizacionCPU: 0,
        utilizacionCPUBusy: 0
      };
    }
    
    // Promedios
    const TRpPromedio = processMetrics.reduce((sum, m) => sum + m.TRp, 0) / count;
    const TEPromedio = processMetrics.reduce((sum, m) => sum + m.TE, 0) / count;
    const TRnPromedio = processMetrics.reduce((sum, m) => sum + m.TRn, 0) / count;
    const tiempoRespuestaPromedio = processMetrics.reduce((sum, m) => sum + m.tiempoRespuesta, 0) / count;
    
    // Tiempo total de simulación (desde el primer arribo hasta el fin del último proceso)
    const minArribo = Math.min(...processMetrics.map(m => m.arribo));
    const maxFin = Math.max(...processMetrics.map(m => m.fin));
    const tiempoTotalSimulacion = Math.max(0, maxFin - minArribo);
    
    // Throughput (procesos por unidad de tiempo de la tanda)
    const throughput = tiempoTotalSimulacion > 0 ? count / tiempoTotalSimulacion : 0;
    
    // Contadores de eventos
    const cambiosDeContexto = this.contarCambiosContexto(trace);
    const expropiaciones = this.contarExpropiaciones(trace);

    // CPU ociosa y utilización calculadas sobre el horizonte de la tanda [minArribo, maxFin]
    const cpuMetrics = this.cpuOciosa(trace, minArribo, maxFin);
    const cpuOciosa = cpuMetrics.idle;
    const cpuOciosaPorc = cpuMetrics.total > 0 ? (cpuMetrics.idle / cpuMetrics.total) * 100 : 0;
    // Utilización = (total - idle) / total = tiempo ocupado real / tiempo total
    const utilizacionCPU = cpuMetrics.total > 0 ? ((cpuMetrics.total - cpuMetrics.idle) / cpuMetrics.total) * 100 : 0;
    const utilizacionCPUBusy = cpuMetrics.total > 0 ? (cpuMetrics.busy / cpuMetrics.total) * 100 : 0;
    
    return {
      TRpPromedio,
      TEPromedio, 
      TRnPromedio,
      tiempoRespuestaPromedio,
      throughput,
      cambiosDeContexto,
      expropiaciones,
      tiempoTotalSimulacion,
      cpuOciosa,
      cpuOciosaPorc,
      utilizacionCPU,
      utilizacionCPUBusy
    };
  }
  
  /**
   * Encuentra el momento de finalización de un proceso
   * Orden de prioridad: ADMIN_FINISH → TFP overhead → C→T → último slice
   */
  private static finUltimaActividad(pid: number, trace: Trace): number {
    // 1) ADMIN_FINISH si existe para el pid
    const adminFinish = trace.events
      .filter(e => e.pid === pid && e.type === 'ADMIN_FINISH')
      .sort((a, b) => b.t - a.t)[0];
    if (adminFinish) return adminFinish.t;

    // 2) Overhead TFP (fin del overhead)
    const tfp = (trace.overheads ?? [])
      .filter(o => o.pid === pid && o.kind === 'TFP')
      .sort((a, b) => b.t1 - a.t1)[0];
    if (tfp) return tfp.t1;

    // 3) Último C→T
    const finCT = trace.events
      .filter(e => e.pid === pid && e.type === 'C→T')
      .sort((a, b) => b.t - a.t)[0];
    if (finCT) return finCT.t;

    // 4) Fallback: fin del último slice
    const lastSlice = trace.slices
      .filter(s => s.pid === pid)
      .sort((a, b) => b.end - a.end)[0];
    return lastSlice ? lastSlice.end : 0;
  }

  /**
   * Calcula tiempo total en E/S para un proceso
   */
  private static tiempoES(pid: number, trace: Trace): number {
    const evs = [...trace.events].sort((a,b) => a.t - b.t);
    let pend: number[] = [];
    let total = 0;
    
    for (const e of evs) {
      if (e.pid !== pid) continue;
      if (e.type === 'C→B') pend.push(e.t);
      else if (e.type === 'B→L' && pend.length) {
        total += e.t - pend.shift()!;
      }
    }
    
    return total;
  }

  /**
   * Calcula tiempo total en estado Listo (espera) para un proceso
   */
  private static tiempoListo(pid: number, trace: Trace): number {
    const evs = [...trace.events].filter(e => e.pid === pid).sort((a,b) => a.t - b.t);
    let enListoDesde: number | null = null;
    let total = 0;
    
    for (const e of evs) {
      // CORREGIDO: incluir C→L (expropiaciones) como entrada a Listo
      if ((e.type === 'N→L') || (e.type === 'B→L') || (e.type === 'C→L')) {
        enListoDesde = e.t;
      } else if (e.type === 'L→C' && enListoDesde !== null) {
        total += (e.t - enListoDesde);
        enListoDesde = null;
      }
    }
    
    return total;
  }

  /**
   * Calcula overheads totales para un proceso
   */
  private static overheadsProceso(pid: number, trace: Trace): number {
    return (trace.overheads ?? [])
      .filter(o => o.pid === pid)
      .reduce((sum, o) => sum + (o.t1 - o.t0), 0);
  }

  /**
   * Fusiona un conjunto de intervalos [start, end) y devuelve la duración total cubierta
   */
  private static duracionIntervalos(intervalos: Array<{ start: number; end: number }>): number {
    if (intervalos.length === 0) return 0;
    const sorted = [...intervalos]
      .filter(i => i.end > i.start)
      .sort((a, b) => a.start - b.start);
    if (sorted.length === 0) return 0;

    let duracion = 0;
    let currStart = sorted[0].start;
    let currEnd = sorted[0].end;

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      if (next.start <= currEnd) {
        currEnd = Math.max(currEnd, next.end);
      } else {
        duracion += currEnd - currStart;
        currStart = next.start;
        currEnd = next.end;
      }
    }
    duracion += currEnd - currStart;
    return duracion;
  }

  /**
   * Calcula métricas de CPU ociosa y utilización mediante unión de intervalos continuos
   */
  private static cpuOciosa(trace: Trace, minT: number = 0, maxT?: number): { idle: number; overheadCPU: number; busy: number; total: number } {
    const calculatedMaxT = maxT !== undefined ? maxT : Math.max(
      minT,
      ...trace.slices.map(s => s.end),
      ...trace.events.map(e => e.t),
      ...(trace.overheads ?? []).map(o => o.t1)
    );

    const total = Math.max(0, calculatedMaxT - minT);

    // Intervalos de CPU ocupada por procesos (slices) dentro del horizonte
    const slicesIntervals = trace.slices
      .map(s => ({
        start: Math.max(minT, s.start),
        end: Math.min(calculatedMaxT, s.end)
      }))
      .filter(i => i.end > i.start);

    // Intervalos de overhead CPU (TCP, TFP) dentro del horizonte
    const overheadsIntervals = (trace.overheads ?? [])
      .filter(o => o.kind === 'TCP' || o.kind === 'TFP')
      .map(o => ({
        start: Math.max(minT, o.t0),
        end: Math.min(calculatedMaxT, o.t1)
      }))
      .filter(i => i.end > i.start);

    // CPU ocupada total (slices + overheads combinados sin solapamientos ni doble conteo)
    const totalOcupadoIntervals = [...slicesIntervals, ...overheadsIntervals];
    const totalBusyTime = this.duracionIntervalos(totalOcupadoIntervals);
    const overheadTime = this.duracionIntervalos(overheadsIntervals);
    const cpuBusyPuro = this.duracionIntervalos(slicesIntervals);

    const idle = Math.max(0, total - totalBusyTime);

    return { 
      idle, 
      overheadCPU: overheadTime, 
      busy: cpuBusyPuro, 
      total 
    };
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
   * Cuenta expropiaciones (eventos C→L por preemption o quantum)
   * Incluye tanto reason='preempt' (SRTN) como reason='quantum' (RR)
   */
  private static contarExpropiaciones(trace: Trace): number {
    return trace.events
      .filter(e => e.type === 'C→L' && 
               (e.data?.reason === 'preempt' || e.data?.reason === 'quantum'))
      .length;
  }
}
