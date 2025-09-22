/**
 * Caso de uso: Ejecutar simulación de planificación de procesos
 * USA ÚNICAMENTE las entidades del dominio (Proceso.ts y Simulador.ts)
 */

import type { Workload, SimEvent, Metrics, EventType } from '../../domain/types';
import { TipoEvento } from '../../domain/types';
import { validarWorkloadParaSimulacion } from '../../core';
import { MetricsCalculator } from '../../domain/services/MetricsCalculator';
import { AdaptadorSimuladorDominio } from '../../core/adaptadorSimuladorDominio';
import { convertirEventosInternos } from '../../infrastructure/io/eventLogger';

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
 * USA SOLO EL MOTOR DEL DOMINIO (Proceso.ts + Simulador.ts)
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

    console.log('🏛️ Ejecutando simulación con entidades del dominio...');
    
    // Ejecutar con motor del dominio (ÚNICO MOTOR)
    const motor = new AdaptadorSimuladorDominio(workload);
    const resultado = motor.ejecutar();
    
    if (!resultado.exitoso) {
      throw new Error(resultado.error || 'Error en la simulación');
    }
    
    // Calcular métricas (ya incluye porcentajes)
    const metricas = MetricsCalculator.calcularMetricasCompletas(resultado.estadoFinal);
    
    // Calcular tiempo total
    const tiempoTotal = metricas.tanda.cpuOcioso + 
                       metricas.tanda.cpuSO + 
                       metricas.tanda.cpuProcesos;

    // Generar advertencias si es necesario
    const advertencias = generarAdvertencias(metricas);

    // Mapear tipos de eventos del core hacia tipos del dominio
    const mapeoTiposEventos: Record<string, TipoEvento> = {
      'Arribo': TipoEvento.JOB_LLEGA,
      'FinTIP': TipoEvento.NUEVO_A_LISTO,
      'Despacho': TipoEvento.LISTO_A_CORRIENDO,
      'FinRafagaCPU': TipoEvento.FIN_RAFAGA_CPU,
      'FinTFP': TipoEvento.CORRIENDO_A_TERMINADO,
      'FinES': TipoEvento.BLOQUEADO_A_LISTO,
      'InicioES': TipoEvento.CORRIENDO_A_BLOQUEADO,
      'AgotamientoQuantum': TipoEvento.CORRIENDO_A_LISTO  // Round Robin expropiación
    };

    // Convertir eventos del core a eventos del dominio
    const eventosParaGantt: SimEvent[] = resultado.eventosInternos.map(evento => ({
      tiempo: evento.tiempo,
      tipo: mapeoTiposEventos[evento.tipo] || TipoEvento.DISPATCH,
      proceso: evento.proceso || 'SISTEMA',
      extra: evento.extra
    }));    // Convertir eventos internos a formato SimEvent
    const eventosConvertidos: SimEvent[] = resultado.eventosInternos.map(evento => ({
      tiempo: evento.tiempo,
      tipo: mapeoTiposEventos[evento.tipo] || TipoEvento.DISPATCH as EventType,
      proceso: evento.proceso || 'SISTEMA',
      extra: evento.extra
    }));

    return {
      exitoso: true,
      eventos: eventosConvertidos,
      metricas,
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
 * FUNCIÓN PRINCIPAL: Para compatibilidad con el código existente
 * Usa directamente las entidades del dominio
 */
export async function ejecutarSimulacion(workload: Workload) {
  const resultado = await ejecutarSimulacionCompleta(workload);
  
  if (!resultado.exitoso) {
    throw new Error(resultado.error || 'Error desconocido en la simulación');
  }
  
  return {
    eventos: resultado.eventos,
    metricas: resultado.metricas,
    // Nota: estadoFinal y eventosInternos no están disponibles en el resultado simplificado
    // pero el código UI no los necesita
  };
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
      (sum, p) => sum + p.duracionCPU, 0
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
  const tiemposArribo = workload.processes.map(p => p.arribo);
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
