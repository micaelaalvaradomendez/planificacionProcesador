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
    
    // Tiempo total de simulación (máximo fin de todos los procesos)
    const tiempoTotalSimulacion = processMetrics.length > 0 
      ? Math.max(...processMetrics.map(m => m.fin))
      : 0;
    
    // Throughput (procesos por unidad de tiempo)
    const throughput = tiempoTotalSimulacion > 0 ? count / tiempoTotalSimulacion : 0;
    
    // Contadores de eventos
    const cambiosDeContexto = this.contarCambiosContexto(trace);
    const expropiaciones = this.contarExpropiaciones(trace);

    // CPU ociosa y utilización (corregidas para evitar >100%)
    const cpuMetrics = this.cpuOciosa(trace);
    const cpuOciosa = cpuMetrics.idle;
    const cpuOciosaPorc = cpuMetrics.total > 0 ? (cpuMetrics.idle / cpuMetrics.total) * 100 : 0;
    // Utilización = (total - idle) / total = tiempo ocupado real / tiempo total
    const utilizacionCPU = cpuMetrics.total > 0 ? ((cpuMetrics.total - cpuMetrics.idle) / cpuMetrics.total) * 100 : 0;
    const utilizacionCPUBusy = cpuMetrics.total > 0 ? (cpuMetrics.busy / cpuMetrics.total) * 100 : 0;
    
    return {
      TRpPromedio,
      TEPromedio, 
      TRnPromedio,
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
   * Calcula métricas de CPU ociosa y utilización
   * CORRIGE: No suma tiempos que se superponen, calcula ocupación real
   */
  private static cpuOciosa(trace: Trace): { idle: number; overheadCPU: number; busy: number; total: number } {
    const maxT = Math.max(
      0,
      ...trace.slices.map(s => s.end),
      ...trace.events.map(e => e.t),
      ...(trace.overheads ?? []).map(o => o.t1)
    );

    // Crear un array de ocupación temporal para evitar doble conteo
    const ocupacion = new Array(maxT).fill(false);
    const ocupacionOverhead = new Array(maxT).fill(false);

    // Marcar períodos de CPU busy (slices)
    for (const slice of trace.slices) {
      for (let t = slice.start; t < slice.end; t++) {
        ocupacion[t] = true;
      }
    }

    // Marcar períodos de overhead CPU (TCP, TFP)
    const overheadsCPU = (trace.overheads ?? []).filter(o => o.kind === 'TCP' || o.kind === 'TFP');
    for (const overhead of overheadsCPU) {
      for (let t = overhead.t0; t < overhead.t1; t++) {
        ocupacionOverhead[t] = true;
        ocupacion[t] = true; // Los overheads también ocupan CPU
      }
    }

    // Contar tiempos reales
    const busyTicks = ocupacion.filter(Boolean).length;
    const overheadTicks = ocupacionOverhead.filter(Boolean).length;
    const cpuBusyPuro = trace.slices.reduce((sum, s) => sum + (s.end - s.start), 0);
    const idle = maxT - busyTicks;

    return { 
      idle, 
      overheadCPU: overheadTicks, 
      busy: cpuBusyPuro, 
      total: maxT 
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
