/**
 * Servicio de dominio: Calculadora de métricas de simulación
 * Contiene toda la lógica de negocio para calcular KPIs y estadísticas de rendimiento
 */

import type { 
  Metrics, 
  SimEvent, 
  MetricsPerProcess, 
  BatchMetrics
} from '../types';

// Importaciones temporales desde core hasta migrar completamente
import type { SimState, ProcesoRT } from '../../core/state';

/**
 * Estadísticas extendidas de la simulación
 */
export interface EstadisticasExtendidas {
  metricas: Metrics;
  analisis: AnalisisRendimiento;
  comparativas: MetricasComparativas;
  recomendaciones: string[];
}

/**
 * Análisis de rendimiento detallado
 */
export interface AnalisisRendimiento {
  eficienciaCPU: number;           // % tiempo útil de CPU
  overhead: number;                // % tiempo de overhead del SO
  throughput: number;              // procesos terminados por unidad de tiempo
  utilizacionMemoria: number;      // simulada basada en multiprogramación
  balanceCarga: 'Excelente' | 'Bueno' | 'Regular' | 'Deficiente';
  equidad: 'Alta' | 'Media' | 'Baja'; // basado en varianza de TRn
}

/**
 * Métricas comparativas entre procesos
 */
export interface MetricasComparativas {
  procesoMasRapido: {
    nombre: string;
    tiempoRetorno: number;
    tiempoRetornoNormalizado: number;
  };
  procesoMasLento: {
    nombre: string;
    tiempoRetorno: number;
    tiempoRetornoNormalizado: number;
  };
  variabilidad: {
    desviacionEstandarTR: number;
    desviacionEstandarTRn: number;
    coeficienteVariacion: number;
  };
  distribucion: {
    cuartiles: {
      q1TR: number;
      medianaTR: number;
      q3TR: number;
    };
    percentiles: {
      p90TR: number;
      p95TR: number;
      p99TR: number;
    };
  };
}

/**
 * Servicio de dominio para cálculo de métricas
 */
export class MetricsCalculator {
  
  /**
   * Calcula métricas completas de la simulación desde el estado final
   */
  static calcularMetricasCompletas(estadoFinal: SimState): Metrics {
    const metricasPorProceso = this.calcularMetricasPorProceso(estadoFinal);
    const metricasTanda = this.calcularMetricasTanda(estadoFinal, metricasPorProceso);

    return {
      porProceso: metricasPorProceso,
      tanda: metricasTanda
    };
  }

  /**
   * Calcula métricas individuales para cada proceso
   */
  static calcularMetricasPorProceso(estadoFinal: SimState): MetricsPerProcess[] {
    const metricas: MetricsPerProcess[] = [];

    for (const [nombreProceso, proceso] of estadoFinal.procesos) {
      if (proceso.estado !== 'Terminado' || !proceso.finTFP) {
        continue;
      }

      const tiempoRetorno = this.calcularTiempoRetorno(proceso);
      const tiempoServicio = this.calcularTiempoServicio(proceso);
      const tiempoRetornoNormalizado = tiempoServicio > 0 ? tiempoRetorno / tiempoServicio : 0;

      metricas.push({
        name: nombreProceso,
        tiempoRetorno,
        tiempoRetornoNormalizado,
        tiempoEnListo: proceso.tiempoListoAcumulado
      });
    }

    return metricas.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Calcula métricas agregadas de la tanda de procesos
   */
  static calcularMetricasTanda(estado: SimState, metricasPorProceso: MetricsPerProcess[]): BatchMetrics {
    if (metricasPorProceso.length === 0) {
      return {
        tiempoRetornoTanda: 0,
        tiempoMedioRetorno: 0,
        cpuOcioso: 0,
        cpuSO: 0,
        cpuProcesos: 0,
        porcentajeCpuOcioso: 0,
        porcentajeCpuSO: 0,
        porcentajeCpuProcesos: 0
      };
    }

    // Promedios básicos
    const tiempoMedioRetorno = this.calcularPromedio(metricasPorProceso.map(m => m.tiempoRetorno));
    const tiempoEsperaPromedio = this.calcularPromedio(metricasPorProceso.map(m => m.tiempoEnListo));

    // Cálculos de utilización y overhead
    const tiempoTotal = estado.tiempoActual;
    const { cpuProcesos, cpuSO, cpuOcioso } = this.calcularTiemposCPU(estado);

    return {
      tiempoRetornoTanda: metricasPorProceso.reduce((sum, p) => sum + p.tiempoRetorno, 0),
      tiempoMedioRetorno,
      cpuOcioso,
      cpuSO,
      cpuProcesos,
      porcentajeCpuOcioso: tiempoTotal > 0 ? (cpuOcioso / tiempoTotal) * 100 : 0,
      porcentajeCpuSO: tiempoTotal > 0 ? (cpuSO / tiempoTotal) * 100 : 0,
      porcentajeCpuProcesos: tiempoTotal > 0 ? (cpuProcesos / tiempoTotal) * 100 : 0
    };
  }

  /**
   * Calcula estadísticas extendidas con análisis profundo
   */
  static calcularEstadisticasExtendidas(metricas: Metrics, eventos: SimEvent[] = []): EstadisticasExtendidas {
    const analisis = this.analizarRendimiento(metricas, eventos);
    const comparativas = this.calcularMetricasComparativas(metricas.porProceso);
    const recomendaciones = this.generarRecomendaciones(analisis, comparativas);

    return {
      metricas,
      analisis,
      comparativas,
      recomendaciones
    };
  }

  // ========================================
  // MÉTODOS PRIVADOS
  // ========================================

  private static calcularTiempoRetorno(proceso: ProcesoRT): number {
    if (!proceso.tiempoArribo || !proceso.finTFP) return 0;
    return proceso.finTFP - proceso.tiempoArribo;
  }

  private static calcularTiempoServicio(proceso: ProcesoRT): number {
    return (proceso.rafagasCPU || 0) * (proceso.duracionRafagaCPU || 0);
  }

  private static calcularPromedio(valores: number[]): number {
    if (valores.length === 0) return 0;
    return valores.reduce((sum, val) => sum + val, 0) / valores.length;
  }

  private static calcularTiemposCPU(estado: SimState): { cpuProcesos: number; cpuSO: number; cpuOcioso: number } {
    const tiempoTotal = estado.tiempoActual;
    if (tiempoTotal === 0) return { cpuProcesos: 0, cpuSO: 0, cpuOcioso: 0 };

    // Calcular desde los eventos o estado interno
    let cpuProcesos = 0;
    let cpuSO = 0;
    
    // Estimar tiempos basándose en procesos completados
    for (const [, proceso] of estado.procesos) {
      if (proceso.estado === 'Terminado') {
        cpuProcesos += (proceso.rafagasCPU || 0) * (proceso.duracionRafagaCPU || 0);
        // Estimar overhead del SO (TIP + TFP + TCP estimado)
        cpuSO += 2; // TIP + TFP simplificado
      }
    }

    const cpuOcioso = Math.max(0, tiempoTotal - cpuProcesos - cpuSO);
    return { cpuProcesos, cpuSO, cpuOcioso };
  }

  private static analizarRendimiento(metricas: Metrics, eventos: SimEvent[]): AnalisisRendimiento {
    const { porcentajeCpuProcesos = 0, porcentajeCpuSO = 0 } = metricas.tanda;
    
    // Análisis de eficiencia
    const eficienciaCPU = porcentajeCpuProcesos;
    const overhead = porcentajeCpuSO;
    
    // Análisis de throughput (estimado)
    const tiempoTotal = metricas.tanda.tiempoMedioRetorno * metricas.porProceso.length;
    const throughput = tiempoTotal > 0 ? metricas.porProceso.length / tiempoTotal : 0;
    
    // Simulación de utilización de memoria (basada en multiprogramación)
    const utilizacionMemoria = Math.min(100, metricas.porProceso.length * 15 + 20);
    
    // Análisis de balance de carga
    const balanceCarga = this.evaluarBalanceCarga(metricas.porProceso);
    
    // Análisis de equidad
    const equidad = this.evaluarEquidad(metricas.porProceso);

    return {
      eficienciaCPU,
      overhead,
      throughput,
      utilizacionMemoria,
      balanceCarga,
      equidad
    };
  }

  private static evaluarBalanceCarga(procesos: MetricsPerProcess[]): AnalisisRendimiento['balanceCarga'] {
    if (procesos.length === 0) return 'Deficiente';
    
    const tiemposRetorno = procesos.map(p => p.tiempoRetorno);
    const promedio = this.calcularPromedio(tiemposRetorno);
    const desviacion = this.calcularDesviacionEstandar(tiemposRetorno);
    const coeficienteVariacion = promedio > 0 ? desviacion / promedio : 1;

    if (coeficienteVariacion <= 0.2) return 'Excelente';
    if (coeficienteVariacion <= 0.4) return 'Bueno';
    if (coeficienteVariacion <= 0.6) return 'Regular';
    return 'Deficiente';
  }

  private static evaluarEquidad(procesos: MetricsPerProcess[]): AnalisisRendimiento['equidad'] {
    if (procesos.length === 0) return 'Baja';
    
    const tiemposNormalizados = procesos.map(p => p.tiempoRetornoNormalizado);
    const promedio = this.calcularPromedio(tiemposNormalizados);
    const desviacion = this.calcularDesviacionEstandar(tiemposNormalizados);
    const coeficienteVariacion = promedio > 0 ? desviacion / promedio : 1;

    if (coeficienteVariacion <= 0.3) return 'Alta';
    if (coeficienteVariacion <= 0.6) return 'Media';
    return 'Baja';
  }

  private static calcularMetricasComparativas(procesos: MetricsPerProcess[]): MetricasComparativas {
    if (procesos.length === 0) {
      const defaultProceso = { nombre: 'N/A', tiempoRetorno: 0, tiempoRetornoNormalizado: 0 };
      return {
        procesoMasRapido: defaultProceso,
        procesoMasLento: defaultProceso,
        variabilidad: { desviacionEstandarTR: 0, desviacionEstandarTRn: 0, coeficienteVariacion: 0 },
        distribucion: {
          cuartiles: { q1TR: 0, medianaTR: 0, q3TR: 0 },
          percentiles: { p90TR: 0, p95TR: 0, p99TR: 0 }
        }
      };
    }

    // Procesos más rápido y más lento
    const procesoMasRapido = procesos.reduce((min, p) => 
      p.tiempoRetornoNormalizado < min.tiempoRetornoNormalizado ? p : min
    );
    const procesoMasLento = procesos.reduce((max, p) => 
      p.tiempoRetornoNormalizado > max.tiempoRetornoNormalizado ? p : max
    );

    // Variabilidad
    const tiemposRetorno = procesos.map(p => p.tiempoRetorno);
    const tiemposNormalizados = procesos.map(p => p.tiempoRetornoNormalizado);
    
    const desviacionEstandarTR = this.calcularDesviacionEstandar(tiemposRetorno);
    const desviacionEstandarTRn = this.calcularDesviacionEstandar(tiemposNormalizados);
    const promedioTRn = this.calcularPromedio(tiemposNormalizados);
    const coeficienteVariacion = promedioTRn > 0 ? desviacionEstandarTRn / promedioTRn : 0;

    // Distribución
    const tiemposOrdenados = [...tiemposRetorno].sort((a, b) => a - b);
    const cuartiles = this.calcularCuartiles(tiemposOrdenados);
    const percentiles = this.calcularPercentiles(tiemposOrdenados);

    return {
      procesoMasRapido: {
        nombre: procesoMasRapido.name,
        tiempoRetorno: procesoMasRapido.tiempoRetorno,
        tiempoRetornoNormalizado: procesoMasRapido.tiempoRetornoNormalizado
      },
      procesoMasLento: {
        nombre: procesoMasLento.name,
        tiempoRetorno: procesoMasLento.tiempoRetorno,
        tiempoRetornoNormalizado: procesoMasLento.tiempoRetornoNormalizado
      },
      variabilidad: {
        desviacionEstandarTR,
        desviacionEstandarTRn,
        coeficienteVariacion
      },
      distribucion: {
        cuartiles,
        percentiles
      }
    };
  }

  private static generarRecomendaciones(analisis: AnalisisRendimiento, comparativas: MetricasComparativas): string[] {
    const recomendaciones: string[] = [];

    // Análisis de eficiencia
    if (analisis.eficienciaCPU < 70) {
      recomendaciones.push(`Baja eficiencia de CPU (${analisis.eficienciaCPU.toFixed(1)}%). Considere reducir TIP, TFP y TCP, o cambiar la política de planificación.`);
    }

    if (analisis.overhead > 25) {
      recomendaciones.push(`Alto overhead del sistema (${analisis.overhead.toFixed(1)}%). Reduzca los parámetros TIP, TFP y TCP para mejorar la eficiencia.`);
    }

    // Análisis de equidad
    if (analisis.equidad === 'Baja') {
      recomendaciones.push('Baja equidad entre procesos. Considere usar Round Robin o ajustar prioridades.');
    }

    // Análisis de variabilidad
    if (comparativas.variabilidad.coeficienteVariacion > 0.5) {
      recomendaciones.push('Alta variabilidad en tiempos de retorno. Revise la distribución de la carga de trabajo.');
    }

    // Análisis de throughput
    if (analisis.throughput < 0.1) {
      recomendaciones.push('Bajo throughput del sistema. Considere optimizar los parámetros de temporización.');
    }

    // Análisis de balance
    if (analisis.balanceCarga === 'Deficiente') {
      recomendaciones.push('Balance de carga deficiente. Revise la distribución de ráfagas de CPU entre procesos.');
    }

    // Si no hay problemas graves
    if (recomendaciones.length === 0) {
      recomendaciones.push('El sistema presenta un rendimiento óptimo con la configuración actual.');
    }

    return recomendaciones;
  }

  private static calcularDesviacionEstandar(valores: number[]): number {
    if (valores.length === 0) return 0;
    const promedio = this.calcularPromedio(valores);
    const varianza = valores.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) / valores.length;
    return Math.sqrt(varianza);
  }

  private static calcularCuartiles(valoresOrdenados: number[]): MetricasComparativas['distribucion']['cuartiles'] {
    const n = valoresOrdenados.length;
    if (n === 0) return { q1TR: 0, medianaTR: 0, q3TR: 0 };

    const q1Index = Math.floor(n * 0.25);
    const medianIndex = Math.floor(n * 0.5);
    const q3Index = Math.floor(n * 0.75);

    return {
      q1TR: valoresOrdenados[q1Index] || 0,
      medianaTR: valoresOrdenados[medianIndex] || 0,
      q3TR: valoresOrdenados[q3Index] || 0
    };
  }

  private static calcularPercentiles(valoresOrdenados: number[]): MetricasComparativas['distribucion']['percentiles'] {
    const n = valoresOrdenados.length;
    if (n === 0) return { p90TR: 0, p95TR: 0, p99TR: 0 };

    const p90Index = Math.floor(n * 0.9);
    const p95Index = Math.floor(n * 0.95);
    const p99Index = Math.floor(n * 0.99);

    return {
      p90TR: valoresOrdenados[p90Index] || 0,
      p95TR: valoresOrdenados[p95Index] || 0,
      p99TR: valoresOrdenados[p99Index] || 0
    };
  }
}
