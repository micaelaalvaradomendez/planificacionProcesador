/**
 * Cálculo de métricas de rendimiento del simulador
 * Genera indicadores por proceso y por tanda según la teoría de sistemas operativos
 */

import type { 
  SimState, 
  ProcesoRT 
} from './state';
import type { 
  MetricsPerProcess, 
  BatchMetrics, 
  Metrics 
} from '../model/types';

/**
 * Calcula métricas completas de la simulación
 */
export function calcularMetricasCompletas(estadoFinal: SimState): Metrics {
  const metricasPorProceso = calcularMetricasPorProceso(estadoFinal);
  const metricasTanda = calcularMetricasTanda(estadoFinal, metricasPorProceso);

  return {
    porProceso: metricasPorProceso,
    tanda: metricasTanda
  };
}

/**
 * Calcula métricas individuales para cada proceso
 */
export function calcularMetricasPorProceso(estadoFinal: SimState): MetricsPerProcess[] {
  const metricas: MetricsPerProcess[] = [];

  for (const [nombreProceso, proceso] of estadoFinal.procesos) {
    if (proceso.estado !== 'Terminado' || !proceso.finTFP) {
      // Solo procesar procesos que terminaron completamente
      continue;
    }

    const tiempoRetorno = calcularTiempoRetorno(proceso);
    const tiempoServicio = calcularTiempoServicio(proceso);
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
 * Calcula métricas de la tanda completa
 */
export function calcularMetricasTanda(
  estadoFinal: SimState, 
  metricasPorProceso: MetricsPerProcess[]
): BatchMetrics {
  if (metricasPorProceso.length === 0) {
    return {
      tiempoRetornoTanda: 0,
      tiempoMedioRetorno: 0,
      cpuOcioso: estadoFinal.contadoresCPU.ocioso,
      cpuSO: estadoFinal.contadoresCPU.sistemaOperativo,
      cpuProcesos: estadoFinal.contadoresCPU.procesos
    };
  }

  // Tiempo de retorno de la tanda: desde primer arribo hasta último TFP
  const tiempoRetornoTanda = calcularTiempoRetornoTanda(estadoFinal);

  // Tiempo medio de retorno
  const sumaTiemposRetorno = metricasPorProceso.reduce(
    (suma, metrica) => suma + metrica.tiempoRetorno, 
    0
  );
  const tiempoMedioRetorno = sumaTiemposRetorno / metricasPorProceso.length;

  return {
    tiempoRetornoTanda,
    tiempoMedioRetorno,
    cpuOcioso: estadoFinal.contadoresCPU.ocioso,
    cpuSO: estadoFinal.contadoresCPU.sistemaOperativo,
    cpuProcesos: estadoFinal.contadoresCPU.procesos
  };
}

/**
 * Calcula el tiempo de retorno de un proceso individual
 * TRp = tiempo desde arribo hasta finalización completa (incluye TFP)
 */
function calcularTiempoRetorno(proceso: ProcesoRT): number {
  if (!proceso.finTFP) {
    return 0; // Proceso no terminado
  }
  
  return proceso.finTFP - proceso.tiempoArribo;
}

/**
 * Calcula el tiempo de servicio de un proceso
 * Tiempo efectivo de CPU que necesita el proceso
 */
function calcularTiempoServicio(proceso: ProcesoRT): number {
  const tiempoCPUTotal = proceso.rafagasCPU * proceso.duracionRafagaCPU;
  const tiempoESTetal = Math.max(0, proceso.rafagasCPU - 1) * proceso.duracionRafagaES;
  
  return tiempoCPUTotal + tiempoESTetal;
}

/**
 * Calcula el tiempo de retorno de la tanda completa
 * TRt = desde primer arribo hasta último TFP
 */
function calcularTiempoRetornoTanda(estadoFinal: SimState): number {
  let primerArribo = Infinity;
  let ultimoTFP = 0;

  for (const [_, proceso] of estadoFinal.procesos) {
    primerArribo = Math.min(primerArribo, proceso.tiempoArribo);
    
    if (proceso.finTFP) {
      ultimoTFP = Math.max(ultimoTFP, proceso.finTFP);
    }
  }

  return primerArribo === Infinity ? 0 : ultimoTFP - primerArribo;
}

/**
 * Agrega porcentajes de uso de CPU a las métricas de tanda
 */
export function agregarPorcentajesCPU(metricas: BatchMetrics): BatchMetrics {
  const tiempoTotal = metricas.cpuOcioso + metricas.cpuSO + metricas.cpuProcesos;
  
  if (tiempoTotal === 0) {
    return {
      ...metricas,
      porcentajeCpuOcioso: 0,
      porcentajeCpuSO: 0,
      porcentajeCpuProcesos: 0
    };
  }

  return {
    ...metricas,
    porcentajeCpuOcioso: (metricas.cpuOcioso / tiempoTotal) * 100,
    porcentajeCpuSO: (metricas.cpuSO / tiempoTotal) * 100,
    porcentajeCpuProcesos: (metricas.cpuProcesos / tiempoTotal) * 100
  };
}

/**
 * Valida que las métricas calculadas sean consistentes
 */
export function validarConsistenciaMetricas(
  metricas: Metrics, 
  estadoFinal: SimState
): { validas: boolean; errores: string[] } {
  const errores: string[] = [];

  // Verificar que todos los procesos terminados tienen métricas
  const procesosTerminados = Array.from(estadoFinal.procesos.values())
    .filter(p => p.estado === 'Terminado' && p.finTFP);
  
  if (metricas.porProceso.length !== procesosTerminados.length) {
    errores.push(
      `Inconsistencia: ${procesosTerminados.length} procesos terminados, ` +
      `pero ${metricas.porProceso.length} métricas calculadas`
    );
  }

  // Verificar tiempos de retorno positivos
  for (const metrica of metricas.porProceso) {
    if (metrica.tiempoRetorno <= 0) {
      errores.push(`Proceso ${metrica.name}: tiempo de retorno debe ser positivo`);
    }
    
    if (metrica.tiempoRetornoNormalizado <= 0) {
      errores.push(`Proceso ${metrica.name}: tiempo de retorno normalizado debe ser positivo`);
    }
    
    if (metrica.tiempoEnListo < 0) {
      errores.push(`Proceso ${metrica.name}: tiempo en listo no puede ser negativo`);
    }
  }

  // Verificar uso de CPU
  const totalCPU = metricas.tanda.cpuOcioso + 
                   metricas.tanda.cpuSO + 
                   metricas.tanda.cpuProcesos;
  
  if (totalCPU <= 0) {
    errores.push('El tiempo total de CPU debe ser positivo');
  }

  return {
    validas: errores.length === 0,
    errores
  };
}

/**
 * Genera resumen textual de las métricas para debugging
 */
export function generarResumenMetricas(metricas: Metrics): string {
  const lineas: string[] = [];
  
  lineas.push('=== MÉTRICAS DE SIMULACIÓN ===');
  lineas.push('');
  
  // Métricas por proceso
  lineas.push('Métricas por Proceso:');
  for (const metrica of metricas.porProceso) {
    lineas.push(
      `  ${metrica.name}: TR=${metrica.tiempoRetorno.toFixed(2)}, ` +
      `TRn=${metrica.tiempoRetornoNormalizado.toFixed(2)}, ` +
      `T_Listo=${metrica.tiempoEnListo.toFixed(2)}`
    );
  }
  
  lineas.push('');
  
  // Métricas de tanda
  const tanda = metricas.tanda;
  lineas.push('Métricas de Tanda:');
  lineas.push(`  Tiempo Retorno Tanda: ${tanda.tiempoRetornoTanda.toFixed(2)}`);
  lineas.push(`  Tiempo Medio Retorno: ${tanda.tiempoMedioRetorno.toFixed(2)}`);
  lineas.push('');
  lineas.push('Uso de CPU:');
  lineas.push(`  Ocioso: ${tanda.cpuOcioso.toFixed(2)} (${(tanda.porcentajeCpuOcioso || 0).toFixed(1)}%)`);
  lineas.push(`  SO: ${tanda.cpuSO.toFixed(2)} (${(tanda.porcentajeCpuSO || 0).toFixed(1)}%)`);
  lineas.push(`  Procesos: ${tanda.cpuProcesos.toFixed(2)} (${(tanda.porcentajeCpuProcesos || 0).toFixed(1)}%)`);
  
  return lineas.join('\n');
}
