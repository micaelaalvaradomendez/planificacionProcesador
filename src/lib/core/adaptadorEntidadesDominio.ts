/**
 * Utilitarios para trabajar con entidades del dominio
 */

import { Proceso } from '../domain/entities/Proceso';
import { EstadoProceso, type ParametrosSimulacion, type ProcesData, type Algoritmo } from '../domain/types';
import type { Workload, Policy } from '../domain/types';

export class AdaptadorEntidadesDominio {
  
  static workloadAProcesos(workload: Workload): Proceso[] {
    return workload.processes.map(processSpec => {
      const data: ProcesData = {
        nombre: processSpec.id,
        arribo: processSpec.arribo,
        rafagasCPU: processSpec.rafagasCPU,
        duracionCPU: processSpec.duracionCPU,
        duracionIO: processSpec.duracionIO,
        prioridad: processSpec.prioridad
      };
      return new Proceso(data);
    });
  }
  
  static workloadAParametrosSimulacion(workload: Workload): ParametrosSimulacion {
    return {
      TIP: workload.config.tip,
      TFP: workload.config.tfp,
      TCP: workload.config.tcp,
      quantum: workload.config.quantum,
      algoritmo: mapearPolicyAAlgoritmo(workload.config.policy)
    };
  }
}

function mapearPolicyAAlgoritmo(policy: Policy): Algoritmo {
  const mapeo: Record<Policy, Algoritmo> = {
    'FCFS': 'FCFS',
    'PRIORITY': 'PRIORITY',
    'RR': 'RR',
    'SPN': 'SJF',
    'SRTN': 'SRTF'
  };
  return mapeo[policy];
}
