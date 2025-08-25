/**
 * Caso de uso: Calcular estadísticas y KPIs de la simulación
 * Proporciona análisis detallado de rendimiento y métricas comparativas
 */

import type { Metrics, SimEvent, MetricsPerProcess, BatchMetrics } from '../../model/types';

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
      q1: number;
      mediana: number;
      q3: number;
    };
    rango: number;
  };
}

/**
 * Calcula estadísticas completas y análisis de rendimiento
 */
export function calcularEstadisticasExtendidas(
  metricas: Metrics,
  eventos: SimEvent[],
  tiempoTotal: number
): EstadisticasExtendidas {
  const analisis = analizarRendimiento(metricas, tiempoTotal);
  const comparativas = calcularMetricasComparativas(metricas.porProceso);
  const recomendaciones = generarRecomendaciones(metricas, analisis, comparativas);

  return {
    metricas,
    analisis,
    comparativas,
    recomendaciones
  };
}

/**
 * Analiza el rendimiento general del sistema
 */
function analizarRendimiento(metricas: Metrics, tiempoTotal: number): AnalisisRendimiento {
  const tanda = metricas.tanda;
  
  // Eficiencia de CPU
  const eficienciaCPU = tiempoTotal > 0 ? (tanda.cpuProcesos / tiempoTotal) * 100 : 0;
  
  // Overhead del sistema
  const overhead = tiempoTotal > 0 ? (tanda.cpuSO / tiempoTotal) * 100 : 0;
  
  // Throughput (procesos por unidad de tiempo)
  const throughput = tanda.tiempoRetornoTanda > 0 ? 
    metricas.porProceso.length / tanda.tiempoRetornoTanda : 0;
  
  // Utilización de memoria simulada (simplificada)
  const utilizacionMemoria = Math.min(100, metricas.porProceso.length * 10);
  
  // Balance de carga
  const balanceCarga = determinarBalanceCarga(eficienciaCPU, tanda.porcentajeCpuOcioso || 0);
  
  // Equidad basada en varianza de TRn
  const equidad = determinarEquidad(metricas.porProceso);

  return {
    eficienciaCPU,
    overhead,
    throughput,
    utilizacionMemoria,
    balanceCarga,
    equidad
  };
}

/**
 * Calcula métricas comparativas entre procesos
 */
function calcularMetricasComparativas(procesos: MetricsPerProcess[]): MetricasComparativas {
  if (procesos.length === 0) {
    return {
      procesoMasRapido: { nombre: 'N/A', tiempoRetorno: 0, tiempoRetornoNormalizado: 0 },
      procesoMasLento: { nombre: 'N/A', tiempoRetorno: 0, tiempoRetornoNormalizado: 0 },
      variabilidad: { desviacionEstandarTR: 0, desviacionEstandarTRn: 0, coeficienteVariacion: 0 },
      distribucion: { cuartiles: { q1: 0, mediana: 0, q3: 0 }, rango: 0 }
    };
  }

  // Encontrar extremos
  const procesoMasRapido = procesos.reduce((min, p) => 
    p.tiempoRetornoNormalizado < min.tiempoRetornoNormalizado ? p : min
  );
  const procesoMasLento = procesos.reduce((max, p) => 
    p.tiempoRetornoNormalizado > max.tiempoRetornoNormalizado ? p : max
  );

  // Calcular variabilidad
  const tiemposRetorno = procesos.map(p => p.tiempoRetorno);
  const tiemposRetornoNorm = procesos.map(p => p.tiempoRetornoNormalizado);
  
  const variabilidad = {
    desviacionEstandarTR: calcularDesviacionEstandar(tiemposRetorno),
    desviacionEstandarTRn: calcularDesviacionEstandar(tiemposRetornoNorm),
    coeficienteVariacion: calcularCoeficienteVariacion(tiemposRetornoNorm)
  };

  // Calcular distribución
  const tiemposOrdenados = [...tiemposRetornoNorm].sort((a, b) => a - b);
  const distribucion = {
    cuartiles: {
      q1: calcularCuartil(tiemposOrdenados, 0.25),
      mediana: calcularCuartil(tiemposOrdenados, 0.5),
      q3: calcularCuartil(tiemposOrdenados, 0.75)
    },
    rango: Math.max(...tiemposRetornoNorm) - Math.min(...tiemposRetornoNorm)
  };

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
    variabilidad,
    distribucion
  };
}

/**
 * Genera recomendaciones basadas en el análisis
 */
function generarRecomendaciones(
  metricas: Metrics,
  analisis: AnalisisRendimiento,
  comparativas: MetricasComparativas
): string[] {
  const recomendaciones: string[] = [];

  // Recomendaciones de eficiencia
  if (analisis.eficienciaCPU < 70) {
    recomendaciones.push(
      `Baja eficiencia de CPU (${analisis.eficienciaCPU.toFixed(1)}%). ` +
      'Considere reducir TIP, TFP y TCP, o cambiar la política de planificación.'
    );
  }

  if (analisis.overhead > 25) {
    recomendaciones.push(
      `Alto overhead del sistema (${analisis.overhead.toFixed(1)}%). ` +
      'Reduzca los parámetros TIP, TFP y TCP para mejorar la eficiencia.'
    );
  }

  // Recomendaciones de equidad
  if (analisis.equidad === 'Baja') {
    recomendaciones.push(
      'Baja equidad entre procesos. Considere usar Round Robin o ajustar prioridades.'
    );
  }

  if (comparativas.variabilidad.coeficienteVariacion > 0.5) {
    recomendaciones.push(
      'Alta variabilidad en tiempos de retorno. Revise la distribución de la carga de trabajo.'
    );
  }

  // Recomendaciones específicas por política
  const tiempoMedioRetorno = metricas.tanda.tiempoMedioRetorno;
  if (tiempoMedioRetorno > 50) {
    recomendaciones.push(
      'Tiempo medio de retorno alto. Considere políticas más eficientes como SPN o SRTN.'
    );
  }

  // Recomendaciones de balance
  if (analisis.balanceCarga === 'Deficiente') {
    recomendaciones.push(
      'Balance de carga deficiente. Distribuya mejor los arribos de procesos en el tiempo.'
    );
  }

  if (recomendaciones.length === 0) {
    recomendaciones.push('Sistema funcionando de manera óptima. No se requieren ajustes.');
  }

  return recomendaciones;
}

// Funciones auxiliares de cálculo
function calcularDesviacionEstandar(valores: number[]): number {
  if (valores.length === 0) return 0;
  
  const media = valores.reduce((sum, val) => sum + val, 0) / valores.length;
  const varianza = valores.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / valores.length;
  
  return Math.sqrt(varianza);
}

function calcularCoeficienteVariacion(valores: number[]): number {
  if (valores.length === 0) return 0;
  
  const media = valores.reduce((sum, val) => sum + val, 0) / valores.length;
  const desviacion = calcularDesviacionEstandar(valores);
  
  return media > 0 ? desviacion / media : 0;
}

function calcularCuartil(valoresOrdenados: number[], percentil: number): number {
  if (valoresOrdenados.length === 0) return 0;
  
  const indice = percentil * (valoresOrdenados.length - 1);
  const indiceInferior = Math.floor(indice);
  const indiceSuperior = Math.ceil(indice);
  
  if (indiceInferior === indiceSuperior) {
    return valoresOrdenados[indiceInferior];
  }
  
  const peso = indice - indiceInferior;
  return valoresOrdenados[indiceInferior] * (1 - peso) + valoresOrdenados[indiceSuperior] * peso;
}

function determinarBalanceCarga(eficiencia: number, ociosidad: number): 'Excelente' | 'Bueno' | 'Regular' | 'Deficiente' {
  if (eficiencia > 80 && ociosidad < 10) return 'Excelente';
  if (eficiencia > 60 && ociosidad < 25) return 'Bueno';
  if (eficiencia > 40 && ociosidad < 40) return 'Regular';
  return 'Deficiente';
}

function determinarEquidad(procesos: MetricsPerProcess[]): 'Alta' | 'Media' | 'Baja' {
  if (procesos.length === 0) return 'Alta';
  
  const tiemposNormalizados = procesos.map(p => p.tiempoRetornoNormalizado);
  const coeficienteVariacion = calcularCoeficienteVariacion(tiemposNormalizados);
  
  if (coeficienteVariacion < 0.2) return 'Alta';
  if (coeficienteVariacion < 0.5) return 'Media';
  return 'Baja';
}
