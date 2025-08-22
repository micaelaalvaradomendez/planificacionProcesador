/**
 * Adaptadores para convertir entre los tipos nuevos (I/O) y los existentes (dominio)
 */

import type { Workload, ProcessSpec, RunConfig } from '../model/types';
import type { ProcesData, ParametrosSimulacion, Algoritmo } from '../domain/types';
import { POLICY_MAP, ALGORITHM_MAP } from '../model/types';

/**
 * Convierte ProcessSpec (nuevo) a ProcesData (dominio existente)
 */
export function processSpecToProcesData(spec: ProcessSpec): ProcesData {
  return {
    nombre: spec.name,
    arribo: spec.arrivalTime,
    rafagasCPU: spec.cpuBursts,
    duracionCPU: spec.cpuBurstDuration,
    duracionIO: spec.ioBurstDuration,
    prioridad: spec.priority
  };
}

/**
 * Convierte ProcesData (dominio) a ProcessSpec (nuevo)
 */
export function procesDataToProcessSpec(data: ProcesData): ProcessSpec {
  return {
    name: data.nombre,
    arrivalTime: data.arribo,
    cpuBursts: data.rafagasCPU,
    cpuBurstDuration: data.duracionCPU,
    ioBurstDuration: data.duracionIO,
    priority: data.prioridad
  };
}

/**
 * Convierte RunConfig (nuevo) a ParametrosSimulacion (dominio existente)
 */
export function runConfigToParametrosSimulacion(config: RunConfig): ParametrosSimulacion {
  return {
    TIP: config.tip,
    TFP: config.tfp,
    TCP: config.tcp,
    quantum: config.quantum,
    algoritmo: POLICY_MAP[config.policy]
  };
}

/**
 * Convierte ParametrosSimulacion (dominio) a RunConfig (nuevo)
 */
export function parametrosSimulacionToRunConfig(params: ParametrosSimulacion): RunConfig {
  return {
    policy: ALGORITHM_MAP[params.algoritmo],
    tip: params.TIP,
    tfp: params.TFP,
    tcp: params.TCP,
    quantum: params.quantum
  };
}

/**
 * Convierte Workload completo al formato del dominio existente
 */
export function workloadToDomainFormat(workload: Workload): {
  procesos: ProcesData[];
  parametros: ParametrosSimulacion;
} {
  return {
    procesos: workload.processes.map(processSpecToProcesData),
    parametros: runConfigToParametrosSimulacion(workload.config)
  };
}
