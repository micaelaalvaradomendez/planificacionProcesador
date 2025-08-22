/**
 * Adaptadores para convertir entre los tipos nuevos (I/O) y los existentes (dominio)
 */

import type { Workload, ProcessSpec, RunConfig } from '../model/types';
import type { ProcesData, ParametrosSimulacion, Algoritmo } from '../domain/types';
import { POLICY_MAP, ALGORITHM_MAP } from '../model/types';

/**
 * Convierte ProcessSpec (nuevo) a ProcesData (dominio existente)
 */
export function convertirEspecificacionAProcesData(spec: ProcessSpec): ProcesData {
  return {
    nombre: spec.name,
    arribo: spec.tiempoArribo,
    rafagasCPU: spec.rafagasCPU,
    duracionCPU: spec.duracionRafagaCPU,
    duracionIO: spec.duracionRafagaES,
    prioridad: spec.prioridad
  };
}

/**
 * Convierte ProcesData (dominio) a ProcessSpec (nuevo)
 */
export function convertirProcesDataAEspecificacion(data: ProcesData): ProcessSpec {
  return {
    name: data.nombre,
    tiempoArribo: data.arribo,
    rafagasCPU: data.rafagasCPU,
    duracionRafagaCPU: data.duracionCPU,
    duracionRafagaES: data.duracionIO,
    prioridad: data.prioridad
  };
}

/**
 * Convierte RunConfig (nuevo) a ParametrosSimulacion (dominio existente)
 */
export function convertirConfiguracionAParametrosSimulacion(config: RunConfig): ParametrosSimulacion {
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
export function convertirParametrosSimulacionAConfiguracion(params: ParametrosSimulacion): RunConfig {
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
export function convertirTandaAFormatoDominio(workload: Workload): {
  procesos: ProcesData[];
  parametros: ParametrosSimulacion;
} {
  return {
    procesos: workload.processes.map(convertirEspecificacionAProcesData),
    parametros: convertirConfiguracionAParametrosSimulacion(workload.config)
  };
}
