/**
 * Caso de uso: Ejecutar simulación de planificación de procesos
 * Orquesta la ejecución completa del simulador y el cálculo de métricas
 */

import type { Workload, SimEvent, Metrics } from '../../model/types';
import { ejecutarSimulacion, validarWorkloadParaSimulacion } from '../../core';

export interface ResultadoEjecucion {
  exitoso: boolean;
  eventos: SimEvent[];
  metricas: Metrics;
  tiempoTotal: number;
  error?: string;
  advertencias?: string[];
}

/**
 * Ejecuta una simulación completa del planificador de procesos
 */
export async function ejecutarSimulacionCompleta(
  workload: Workload
): Promise<ResultadoEjecucion> {
  try {
    // Validar entrada
    const validacion = validarWorkloadParaSimulacion(workload);
    if (!validacion.valido) {
      return {
        exitoso: false,
        eventos: [],
        metricas: { porProceso: [], tanda: { 
          tiempoRetornoTanda: 0, 
          tiempoMedioRetorno: 0, 
          cpuOcioso: 0, 
          cpuSO: 0, 
          cpuProcesos: 0 
        }},
        tiempoTotal: 0,
        error: `Errores de validación: ${validacion.errores.join('; ')}`
      };
    }

    // Ejecutar simulación
    const resultado = await ejecutarSimulacion(workload);
    
    // Calcular tiempo total
    const tiempoTotal = resultado.metricas.tanda.cpuOcioso + 
                       resultado.metricas.tanda.cpuSO + 
                       resultado.metricas.tanda.cpuProcesos;

    // Generar advertencias si es necesario
    const advertencias = generarAdvertencias(resultado.metricas);

    return {
      exitoso: true,
      eventos: resultado.eventos,
      metricas: resultado.metricas,
      tiempoTotal,
      advertencias
    };

  } catch (error) {
    return {
      exitoso: false,
      eventos: [],
      metricas: { porProceso: [], tanda: { 
        tiempoRetornoTanda: 0, 
        tiempoMedioRetorno: 0, 
        cpuOcioso: 0, 
        cpuSO: 0, 
        cpuProcesos: 0 
      }},
      tiempoTotal: 0,
      error: error instanceof Error ? error.message : 'Error desconocido durante la simulación'
    };
  }
}

/**
 * Genera advertencias basadas en las métricas obtenidas
 */
function generarAdvertencias(metricas: Metrics): string[] {
  const advertencias: string[] = [];

  // Verificar alta ociosidad de CPU
  if (metricas.tanda.porcentajeCpuOcioso && metricas.tanda.porcentajeCpuOcioso > 50) {
    advertencias.push(
      `Alta ociosidad de CPU (${metricas.tanda.porcentajeCpuOcioso.toFixed(1)}%). ` +
      'Consider reviewing the workload or scheduling policy.'
    );
  }

  // Verificar alto overhead del SO
  if (metricas.tanda.porcentajeCpuSO && metricas.tanda.porcentajeCpuSO > 30) {
    advertencias.push(
      `Alto overhead del sistema operativo (${metricas.tanda.porcentajeCpuSO.toFixed(1)}%). ` +
      'Los parámetros TIP, TFP y TCP pueden ser demasiado altos.'
    );
  }

  // Verificar procesos con tiempos de retorno muy altos
  const tiemposRetornoAltos = metricas.porProceso.filter(
    p => p.tiempoRetornoNormalizado > 10
  );
  
  if (tiemposRetornoAltos.length > 0) {
    const procesos = tiemposRetornoAltos.map(p => p.name).join(', ');
    advertencias.push(
      `Procesos con tiempos de retorno normalizados muy altos (>10): ${procesos}. ` +
      'Puede indicar problemas de planificación o inanición.'
    );
  }

  return advertencias;
}

/**
 * Valida que una configuración de simulación sea viable
 */
export function validarConfiguracionSimulacion(workload: Workload): {
  valida: boolean;
  errores: string[];
  sugerencias: string[];
} {
  const validacion = validarWorkloadParaSimulacion(workload);
  const sugerencias: string[] = [];

  // Sugerencias adicionales
  if (workload.config.policy === 'RR' && workload.config.quantum) {
    const quantumPromedio = workload.processes.reduce(
      (sum, p) => sum + p.duracionRafagaCPU, 0
    ) / workload.processes.length;
    
    if (workload.config.quantum > quantumPromedio * 2) {
      sugerencias.push(
        'El quantum es muy alto comparado con las ráfagas promedio. ' +
        'Considerá reducirlo para mejor multiprogramación.'
      );
    } else if (workload.config.quantum < quantumPromedio / 4) {
      sugerencias.push(
        'El quantum es muy bajo comparado con las ráfagas promedio. ' +
        'Esto puede generar demasiado overhead por cambios de contexto.'
      );
    }
  }

  // Verificar balance de carga
  const tiemposArribo = workload.processes.map(p => p.tiempoArribo);
  const arriboMinimo = Math.min(...tiemposArribo);
  const arriboMaximo = Math.max(...tiemposArribo);
  
  if (arriboMaximo - arriboMinimo === 0 && workload.processes.length > 3) {
    sugerencias.push(
      'Todos los procesos llegan al mismo tiempo. ' +
      'Considerá distribuir los arribos para simular un escenario más realista.'
    );
  }

  return {
    valida: validacion.valido,
    errores: validacion.errores,
    sugerencias
  };
}
