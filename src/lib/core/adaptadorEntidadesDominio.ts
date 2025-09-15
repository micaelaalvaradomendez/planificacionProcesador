/**
 * PLAN DE MIGRACIÓN: De Core a Dominio
 * 
 * FASE 1: ✅ COMPLETADA - Migrar algoritmos de scheduling
 * - Crear adaptador para usar algoritmos del dominio
 * - Mantener MotorSimulacion como motor principal
 * - Usar ProcesoRT como entidad de proceso
 * 
 * FASE 2: 🔄 EN CURSO - Migrar entidades de proceso
 * - Crear adaptador bidireccional ProcesoRT <-> Proceso
 * - Permitir que el motor use entidades del dominio internamente
 * - Mantener compatibilidad con APIs existentes
 * 
 * FASE 3: 🔜 PENDIENTE - Migrar motor de simulación
 * - Crear adaptador MotorSimulacion <-> Simulador
 * - Migrar lógica de eventos y métricas
 * - Garantizar mismos resultados
 * 
 * VENTAJAS DE ESTA APROXIMACIÓN:
 * - Migración incremental sin romper funcionalidad
 * - Cada fase es testeable independientemente  
 * - Rollback fácil si algo sale mal
 * - Mantiene compatibilidad hacia atrás
 */

import { Proceso } from '../domain/entities/Proceso';
import { Simulador } from '../domain/entities/Simulador';
import type { ProcesoRT, ProcesoEstado } from './state';
import { EstadoProceso, type ParametrosSimulacion, type ProcesData, type Algoritmo } from '../domain/types';
import type { Workload, Policy } from '../domain/types';

/**
 * Adaptador para usar entidades del dominio manteniendo compatibilidad
 */
export class AdaptadorEntidadesDominio {
  
  /**
   * Convierte ProcesoRT (core) a Proceso (dominio)
   */
  static procesoRTAProceso(procesoRT: ProcesoRT): Proceso {
    const data: ProcesData = {
      nombre: procesoRT.name,
      arribo: procesoRT.tiempoArribo,
      rafagasCPU: procesoRT.rafagasCPU,
      duracionCPU: procesoRT.duracionRafagaCPU,
      duracionIO: procesoRT.duracionRafagaES,
      prioridad: procesoRT.prioridad
    };
    
    const proceso = new Proceso(data);
    
    // Sincronizar estado dinámico
    proceso.estado = mapearEstadoADominio(procesoRT.estado);
    proceso.rafagasRestantes = procesoRT.rafagasRestantes;
    proceso.restanteCPU = procesoRT.restanteEnRafaga;
    proceso.restanteTotalCPU = procesoRT.rafagasRestantes * procesoRT.duracionRafagaCPU;
    proceso.tiempoListoTotal = procesoRT.tiempoListoAcumulado;
    
    // Sincronizar timestamps
    if (procesoRT.inicioTIP !== undefined) {
      proceso.inicioTIP = procesoRT.inicioTIP;
    }
    if (procesoRT.finTIP !== undefined) {
      proceso.finTIP = procesoRT.finTIP;
    }
    if (procesoRT.primerDespacho !== undefined) {
      proceso.inicio = procesoRT.primerDespacho;
      proceso.ultimoDispatch = procesoRT.primerDespacho;
    }
    if (procesoRT.finTFP !== undefined) {
      proceso.fin = procesoRT.finTFP;
    }
    if (procesoRT.ultimoTiempoEnListo !== undefined) {
      proceso.ultimoTiempoListo = procesoRT.ultimoTiempoEnListo;
    }
    
    return proceso;
  }
  
  /**
   * Convierte Proceso (dominio) a ProcesoRT (core)
   */
  static procesoAProcesoRT(proceso: Proceso): ProcesoRT {
    return {
      name: proceso.id,
      tiempoArribo: proceso.arribo,
      rafagasCPU: proceso.rafagasCPU,
      duracionRafagaCPU: proceso.duracionCPU,
      duracionRafagaES: proceso.duracionIO,
      prioridad: proceso.prioridad,
      estado: mapearEstadoACore(proceso.estado),
      rafagasRestantes: proceso.rafagasRestantes,
      restanteEnRafaga: proceso.restanteCPU,
      tiempoListoAcumulado: proceso.tiempoListoTotal,
      tipCumplido: !!proceso.finTIP,
      inicioTIP: proceso.inicioTIP,
      finTIP: proceso.finTIP,
      primerDespacho: proceso.inicio,
      finTFP: proceso.fin,
      ultimoTiempoEnListo: proceso.ultimoTiempoListo,
      tiempoInicioRafaga: proceso.ultimoDispatch
    };
  }
  
  /**
   * Convierte array de ProcesoRT a array de Proceso
   */
  static procesosRTAProcesos(procesosRT: ProcesoRT[]): Proceso[] {
    return procesosRT.map(p => this.procesoRTAProceso(p));
  }
  
  /**
   * Convierte array de Proceso a array de ProcesoRT
   */
  static procesosAProcesosRT(procesos: Proceso[]): ProcesoRT[] {
    return procesos.map(p => this.procesoAProcesoRT(p));
  }
  
  /**
   * Convierte Workload a lista de Procesos del dominio
   */
  static workloadAProcesos(workload: Workload): Proceso[] {
    return workload.processes.map(processSpec => {
      const data: ProcesData = {
        nombre: processSpec.name,
        arribo: processSpec.tiempoArribo,
        rafagasCPU: processSpec.rafagasCPU,
        duracionCPU: processSpec.duracionRafagaCPU,
        duracionIO: processSpec.duracionRafagaES,
        prioridad: processSpec.prioridad
      };
      return new Proceso(data);
    });
  }
  
  /**
   * Convierte Workload a ParametrosSimulacion para el Simulador del dominio
   */
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

// Funciones auxiliares de mapeo
function mapearEstadoACore(estado: EstadoProceso): ProcesoEstado {
  switch (estado) {
    case 'NUEVO': return 'Nuevo';
    case 'LISTO': return 'Listo';
    case 'CORRIENDO': return 'Corriendo';
    case 'BLOQUEADO': return 'Bloqueado';
    case 'TERMINADO': return 'Terminado';
    default: return 'Nuevo';
  }
}

function mapearEstadoADominio(estado: ProcesoEstado): EstadoProceso {
  switch (estado) {
    case 'Nuevo': return EstadoProceso.NUEVO;
    case 'Listo': return EstadoProceso.LISTO;
    case 'Corriendo': return EstadoProceso.CORRIENDO;
    case 'Bloqueado': return EstadoProceso.BLOQUEADO;
    case 'Terminado': return EstadoProceso.TERMINADO;
    default: return EstadoProceso.NUEVO;
  }
}

function mapearPolicyAAlgoritmo(policy: Policy): Algoritmo {
  const mapeo: Record<Policy, Algoritmo> = {
    'FCFS': 'FCFS',
    'PRIORITY': 'PRIORITY',
    'RR': 'RR',
    'SPN': 'SJF',      // SPN en model/types es SJF en domain/types
    'SRTN': 'SRTF'     // SRTN en model/types es SRTF en domain/types
  };
  return mapeo[policy];
}
