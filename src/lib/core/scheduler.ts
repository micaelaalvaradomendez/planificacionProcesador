/**
 * Interfaz y fábrica para algoritmos de planificación de procesos
 * Implementa el patrón Strategy para diferentes políticas de scheduling
 */

import type { Policy } from '../model/types';
import type { ProcesoRT } from './state';

/**
 * Interfaz común para todos los algoritmos de planificación
 */
export interface Scheduler {
  /**
   * Nombre descriptivo del algoritmo
   */
  readonly nombre: string;
  
  /**
   * Indica si el algoritmo es expropiativo (preemptive)
   */
  readonly esExpropiativo: boolean;
  
  /**
   * Selecciona el próximo proceso a ejecutar de la cola de listos
   * @param colaListos - Array de nombres de procesos en estado listo
   * @param procesoActual - Proceso actualmente ejecutando (si hay alguno)
   * @param obtenerProceso - Función para obtener detalles de un proceso
   * @returns Nombre del proceso seleccionado o undefined si no hay candidatos
   */
  seleccionarProximoProceso(
    colaListos: string[],
    procesoActual: string | undefined,
    obtenerProceso: (name: string) => ProcesoRT
  ): string | undefined;
  
  /**
   * Determina si debe ocurrir una expropiación
   * @param procesoEjecutando - Proceso actualmente ejecutando
   * @param colaListos - Procesos en estado listo
   * @param obtenerProceso - Función para obtener detalles de un proceso
   * @returns true si se debe expropiar el proceso actual
   */
  debeExpropiar(
    procesoEjecutando: string,
    colaListos: string[],
    obtenerProceso: (name: string) => ProcesoRT
  ): boolean;
  
  /**
   * Calcula el quantum o tiempo máximo de ejecución para el proceso
   * @param proceso - Proceso para el cual calcular el quantum
   * @returns Tiempo máximo de ejecución (Infinity para algoritmos no expropiativostemporizados)
   */
  calcularQuantum(proceso: ProcesoRT): number;
}

/**
 * Implementación de First Come, First Served (FCFS)
 * Algoritmo no expropiativo que atiende procesos en orden de llegada
 */
class SchedulerFCFS implements Scheduler {
  readonly nombre = 'First Come, First Served';
  readonly esExpropiativo = false;

  seleccionarProximoProceso(
    colaListos: string[],
    procesoActual: string | undefined,
    obtenerProceso: (name: string) => ProcesoRT
  ): string | undefined {
    if (colaListos.length === 0) {
      return undefined;
    }

    // Ordenar por tiempo de arribo, luego por nombre para estabilidad
    const procesosOrdenados = [...colaListos].sort((a, b) => {
      const procesoA = obtenerProceso(a);
      const procesoB = obtenerProceso(b);
      
      if (procesoA.tiempoArribo !== procesoB.tiempoArribo) {
        return procesoA.tiempoArribo - procesoB.tiempoArribo;
      }
      return procesoA.name.localeCompare(procesoB.name);
    });

    return procesosOrdenados[0];
  }

  debeExpropiar(): boolean {
    return false; // FCFS nunca expropia
  }

  calcularQuantum(): number {
    return Infinity; // Sin límite de tiempo
  }
}

/**
 * Implementación de Prioridad Externa
 * Algoritmo expropiativo que selecciona procesos por prioridad
 */
class SchedulerPrioridad implements Scheduler {
  readonly nombre = 'Prioridad Externa';
  readonly esExpropiativo = true;

  seleccionarProximoProceso(
    colaListos: string[],
    procesoActual: string | undefined,
    obtenerProceso: (name: string) => ProcesoRT
  ): string | undefined {
    if (colaListos.length === 0) {
      return undefined;
    }

    // Ordenar por prioridad (mayor valor = mayor prioridad), luego FCFS
    const procesosOrdenados = [...colaListos].sort((a, b) => {
      const procesoA = obtenerProceso(a);
      const procesoB = obtenerProceso(b);
      
      if (procesoA.prioridad !== procesoB.prioridad) {
        return procesoB.prioridad - procesoA.prioridad; // orden descendente
      }
      if (procesoA.tiempoArribo !== procesoB.tiempoArribo) {
        return procesoA.tiempoArribo - procesoB.tiempoArribo;
      }
      return procesoA.name.localeCompare(procesoB.name);
    });

    return procesosOrdenados[0];
  }

  debeExpropiar(
    procesoEjecutando: string,
    colaListos: string[],
    obtenerProceso: (name: string) => ProcesoRT
  ): boolean {
    if (colaListos.length === 0) {
      return false;
    }

    const procesoActual = obtenerProceso(procesoEjecutando);
    const candidato = this.seleccionarProximoProceso(colaListos, procesoEjecutando, obtenerProceso);
    
    if (!candidato) {
      return false;
    }

    const procesoCandidato = obtenerProceso(candidato);
    
    // Expropiar si hay un proceso con mayor prioridad
    return procesoCandidato.prioridad > procesoActual.prioridad;
  }

  calcularQuantum(): number {
    return Infinity; // Sin límite de tiempo fijo, solo expropiación por prioridad
  }
}

/**
 * Implementación de Round Robin (RR)
 * Algoritmo expropiativo con quantum fijo
 */
class SchedulerRoundRobin implements Scheduler {
  readonly nombre = 'Round Robin';
  readonly esExpropiativo = true;
  
  constructor(private quantum: number) {}

  seleccionarProximoProceso(
    colaListos: string[],
    procesoActual: string | undefined,
    obtenerProceso: (name: string) => ProcesoRT
  ): string | undefined {
    if (colaListos.length === 0) {
      return undefined;
    }

    // En RR, simplemente FIFO (el primero en la cola)
    // La cola ya debe estar ordenada cronológicamente
    return colaListos[0];
  }

  debeExpropiar(): boolean {
    // En RR, la expropiación se maneja por agotamiento de quantum
    // El motor de simulación se encarga de esto
    return false;
  }

  calcularQuantum(): number {
    return this.quantum;
  }
}

/**
 * Implementación de Shortest Process Next (SPN)
 * Algoritmo no expropiativo que selecciona el trabajo más corto
 */
class SchedulerSPN implements Scheduler {
  readonly nombre = 'Shortest Process Next';
  readonly esExpropiativo = false;

  seleccionarProximoProceso(
    colaListos: string[],
    procesoActual: string | undefined,
    obtenerProceso: (name: string) => ProcesoRT
  ): string | undefined {
    if (colaListos.length === 0) {
      return undefined;
    }

    // Ordenar por tiempo total de trabajo restante
    const procesosOrdenados = [...colaListos].sort((a, b) => {
      const procesoA = obtenerProceso(a);
      const procesoB = obtenerProceso(b);
      
      const tiempoTotalA = this.calcularTiempoTotal(procesoA);
      const tiempoTotalB = this.calcularTiempoTotal(procesoB);
      
      if (tiempoTotalA !== tiempoTotalB) {
        return tiempoTotalA - tiempoTotalB;
      }
      // Empate: FCFS
      if (procesoA.tiempoArribo !== procesoB.tiempoArribo) {
        return procesoA.tiempoArribo - procesoB.tiempoArribo;
      }
      return procesoA.name.localeCompare(procesoB.name);
    });

    return procesosOrdenados[0];
  }

  debeExpropiar(): boolean {
    return false; // SPN no es expropiativo
  }

  calcularQuantum(): number {
    return Infinity; // Sin límite de tiempo
  }

  private calcularTiempoTotal(proceso: ProcesoRT): number {
    return proceso.rafagasRestantes * proceso.duracionRafagaCPU + 
           Math.max(0, proceso.rafagasRestantes - 1) * proceso.duracionRafagaES;
  }
}

/**
 * Implementación de Shortest Remaining Time Next (SRTN)
 * Algoritmo expropiativo que selecciona el trabajo con menor tiempo restante
 */
class SchedulerSRTN implements Scheduler {
  readonly nombre = 'Shortest Remaining Time Next';
  readonly esExpropiativo = true;

  seleccionarProximoProceso(
    colaListos: string[],
    procesoActual: string | undefined,
    obtenerProceso: (name: string) => ProcesoRT
  ): string | undefined {
    if (colaListos.length === 0) {
      return undefined;
    }

    // Ordenar por tiempo restante
    const procesosOrdenados = [...colaListos].sort((a, b) => {
      const procesoA = obtenerProceso(a);
      const procesoB = obtenerProceso(b);
      
      const tiempoRestanteA = this.calcularTiempoRestante(procesoA);
      const tiempoRestanteB = this.calcularTiempoRestante(procesoB);
      
      if (tiempoRestanteA !== tiempoRestanteB) {
        return tiempoRestanteA - tiempoRestanteB;
      }
      // Empate: FCFS
      if (procesoA.tiempoArribo !== procesoB.tiempoArribo) {
        return procesoA.tiempoArribo - procesoB.tiempoArribo;
      }
      return procesoA.name.localeCompare(procesoB.name);
    });

    return procesosOrdenados[0];
  }

  debeExpropiar(
    procesoEjecutando: string,
    colaListos: string[],
    obtenerProceso: (name: string) => ProcesoRT
  ): boolean {
    if (colaListos.length === 0) {
      return false;
    }

    const procesoActual = obtenerProceso(procesoEjecutando);
    const candidato = this.seleccionarProximoProceso(colaListos, procesoEjecutando, obtenerProceso);
    
    if (!candidato) {
      return false;
    }

    const procesoCandidato = obtenerProceso(candidato);
    
    // Expropiar si hay un proceso con menor tiempo restante
    const tiempoRestanteActual = this.calcularTiempoRestante(procesoActual);
    const tiempoRestanteCandidato = this.calcularTiempoRestante(procesoCandidato);
    
    return tiempoRestanteCandidato < tiempoRestanteActual;
  }

  calcularQuantum(): number {
    return Infinity; // Sin límite de tiempo fijo, solo expropiación por tiempo restante
  }

  private calcularTiempoRestante(proceso: ProcesoRT): number {
    if (proceso.rafagasRestantes === 1) {
      return proceso.restanteEnRafaga;
    }
    
    return proceso.restanteEnRafaga + 
           (proceso.rafagasRestantes - 1) * proceso.duracionRafagaCPU + 
           (proceso.rafagasRestantes - 1) * proceso.duracionRafagaES;
  }
}

/**
 * Fábrica para crear instancias de schedulers
 */
export class FabricaScheduler {
  /**
   * Crea un scheduler según la política especificada
   */
  static crear(policy: Policy, quantum?: number): Scheduler {
    switch (policy) {
      case 'FCFS':
        return new SchedulerFCFS();
      
      case 'PRIORITY':
        return new SchedulerPrioridad();
      
      case 'RR':
        if (quantum === undefined || quantum <= 0) {
          throw new Error('Round Robin requiere un quantum válido mayor a 0');
        }
        return new SchedulerRoundRobin(quantum);
      
      case 'SPN':
        return new SchedulerSPN();
      
      case 'SRTN':
        return new SchedulerSRTN();
      
      default:
        throw new Error(`Política de planificación no soportada: ${policy}`);
    }
  }

  /**
   * Retorna información sobre todas las políticas disponibles
   */
  static obtenerPoliticasDisponibles(): Array<{
    policy: Policy;
    nombre: string;
    esExpropiativo: boolean;
    requiereQuantum: boolean;
  }> {
    return [
      {
        policy: 'FCFS',
        nombre: 'First Come, First Served',
        esExpropiativo: false,
        requiereQuantum: false
      },
      {
        policy: 'PRIORITY',
        nombre: 'Prioridad Externa',
        esExpropiativo: true,
        requiereQuantum: false
      },
      {
        policy: 'RR',
        nombre: 'Round Robin',
        esExpropiativo: true,
        requiereQuantum: true
      },
      {
        policy: 'SPN',
        nombre: 'Shortest Process Next',
        esExpropiativo: false,
        requiereQuantum: false
      },
      {
        policy: 'SRTN',
        nombre: 'Shortest Remaining Time Next',
        esExpropiativo: true,
        requiereQuantum: false
      }
    ];
  }
}

/**
 * Utilidad para validar configuración de scheduling
 */
export function validarConfiguracionScheduling(policy: Policy, quantum?: number): {
  valida: boolean;
  error?: string;
} {
  try {
    FabricaScheduler.crear(policy, quantum);
    return { valida: true };
  } catch (error) {
    return {
      valida: false,
      error: error instanceof Error ? error.message : 'Error de validación desconocido'
    };
  }
}
