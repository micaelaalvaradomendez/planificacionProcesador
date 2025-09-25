/**
 * Cola de prioridad para el simulador de planificación de procesos
 * Implementa diferentes estrategias según la política de planificación
 */

import type { Policy } from '../domain/types';
import type { Proceso } from '../domain/entities/Proceso';

export interface ColaComparator {
  (a: Proceso, b: Proceso): number;
}

/**
 * Comparadores para diferentes políticas de planificación
 */
export const comparadores: Record<Policy, ColaComparator> = {
  FCFS: (a, b) => {
    // Primero por tiempo de arribo, luego por nombre para estabilidad
    if (a.arribo !== b.arribo) {
      return a.arribo - b.arribo;
    }
    return a.id.localeCompare(b.id);
  },

  PRIORITY: (a, b) => {
    // Mayor número = mayor prioridad (4 > 1), luego FCFS para empates
    // Seguimos la convención del dominio: mayor valor numérico = mayor prioridad
    if (a.prioridad !== b.prioridad) {
      return b.prioridad - a.prioridad; // orden descendente por prioridad (4 antes que 1)
    }
    if (a.arribo !== b.arribo) {
      return a.arribo - b.arribo;
    }
    return a.id.localeCompare(b.id);
  },

  RR: (a, b) => {
    // Para Round Robin NO se debe usar comparador por arribo
    // RR requiere cola FIFO real donde el orden se determina por llegada a READY
    // Este comparador es un fallback, pero RR debería usar ColaProcesos del dominio
    // Si se usa este comparador, al menos no ordenar por arribo (rompe fairness)
    
    // Retornar 0 = equivalentes, mantiene orden de inserción (más FIFO)
    return 0;
  },

  SPN: (a, b) => {
    // Shortest Process Next: trabajo más corto primero
    const tiempoTotalA = a.rafagasRestantes * a.duracionCPU + 
                        Math.max(0, a.rafagasRestantes - 1) * a.duracionIO;
    const tiempoTotalB = b.rafagasRestantes * b.duracionCPU + 
                        Math.max(0, b.rafagasRestantes - 1) * b.duracionIO;
    
    if (tiempoTotalA !== tiempoTotalB) {
      return tiempoTotalA - tiempoTotalB;
    }
    // Empate: FCFS
    if (a.arribo !== b.arribo) {
      return a.arribo - b.arribo;
    }
    return a.id.localeCompare(b.id);
  },

  SRTN: (a, b) => {
    // Shortest Remaining Time Next: menor tiempo restante primero
    const tiempoRestanteA = a.rafagasRestantes > 1 ? 
      a.restanteCPU + (a.rafagasRestantes - 1) * a.duracionCPU + 
      (a.rafagasRestantes - 1) * a.duracionIO :
      a.restanteCPU;
    
    const tiempoRestanteB = b.rafagasRestantes > 1 ? 
      b.restanteCPU + (b.rafagasRestantes - 1) * b.duracionCPU + 
      (b.rafagasRestantes - 1) * b.duracionIO :
      b.restanteCPU;
    
    if (tiempoRestanteA !== tiempoRestanteB) {
      return tiempoRestanteA - tiempoRestanteB;
    }
    // Empate: FCFS
    if (a.arribo !== b.arribo) {
      return a.arribo - b.arribo;
    }
    return a.id.localeCompare(b.id);
  }
};

/**
 * Cola de prioridad especializada para el simulador
 * Mantiene orden según la política de planificación activa
 */
export class ColaPrioridadSimulador {
  private elementos: string[] = [];
  private comparador: ColaComparator;
  private obtenerProceso: (name: string) => Proceso;

  constructor(
    policy: Policy, 
    obtenerProceso: (name: string) => Proceso
  ) {
    this.comparador = comparadores[policy];
    this.obtenerProceso = obtenerProceso;
  }

  /**
   * Agrega un proceso a la cola manteniendo el orden de prioridad
   */
  insertar(nombreProceso: string): void {
    if (this.elementos.includes(nombreProceso)) {
      return; // ya está en la cola
    }

    const nuevoProceso = this.obtenerProceso(nombreProceso);
    
    // Encuentra la posición correcta para insertar
    let posicion = 0;
    for (let i = 0; i < this.elementos.length; i++) {
      const procesoExistente = this.obtenerProceso(this.elementos[i]);
      if (this.comparador(nuevoProceso, procesoExistente) <= 0) {
        posicion = i;
        break;
      }
      posicion = i + 1;
    }

    this.elementos.splice(posicion, 0, nombreProceso);
  }

  /**
   * Remueve y retorna el proceso con mayor prioridad
   */
  extraer(): string | undefined {
    return this.elementos.shift();
  }

  /**
   * Retorna el proceso con mayor prioridad sin removerlo
   */
  peek(): string | undefined {
    return this.elementos[0];
  }

  /**
   * Reordena la cola completa (útil para políticas expropiativas)
   */
  reordenar(): void {
    const procesos = this.elementos.map(name => this.obtenerProceso(name));
    procesos.sort(this.comparador);
    this.elementos = procesos.map(p => p.id);
  }

  /**
   * Verifica si la cola está vacía
   */
  estaVacia(): boolean {
    return this.elementos.length === 0;
  }

  /**
   * Retorna el tamaño de la cola
   */
  tamaño(): number {
    return this.elementos.length;
  }

  /**
   * Remueve un proceso específico de la cola
   */
  remover(nombreProceso: string): boolean {
    const indice = this.elementos.indexOf(nombreProceso);
    if (indice >= 0) {
      this.elementos.splice(indice, 1);
      return true;
    }
    return false;
  }

  /**
   * Retorna una copia de todos los elementos en orden de prioridad
   */
  obtenerTodos(): string[] {
    return [...this.elementos];
  }

  /**
   * Verifica si un proceso específico está en la cola
   */
  contiene(nombreProceso: string): boolean {
    return this.elementos.includes(nombreProceso);
  }

  /**
   * Limpia completamente la cola
   */
  limpiar(): void {
    this.elementos = [];
  }
}
