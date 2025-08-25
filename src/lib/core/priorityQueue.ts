/**
 * Cola de prioridad para el simulador de planificación de procesos
 * Implementa diferentes estrategias según la política de planificación
 */

import type { Policy } from '../model/types';
import type { ProcesoRT } from './state';

export interface ColaComparator {
  (a: ProcesoRT, b: ProcesoRT): number;
}

/**
 * Comparadores para diferentes políticas de planificación
 */
export const comparadores: Record<Policy, ColaComparator> = {
  FCFS: (a, b) => {
    // Primero por tiempo de arribo, luego por nombre para estabilidad
    if (a.tiempoArribo !== b.tiempoArribo) {
      return a.tiempoArribo - b.tiempoArribo;
    }
    return a.name.localeCompare(b.name);
  },

  PRIORITY: (a, b) => {
    // Mayor prioridad primero (100 > 1), luego FCFS para empates
    if (a.prioridad !== b.prioridad) {
      return b.prioridad - a.prioridad; // orden descendente por prioridad
    }
    if (a.tiempoArribo !== b.tiempoArribo) {
      return a.tiempoArribo - b.tiempoArribo;
    }
    return a.name.localeCompare(b.name);
  },

  RR: (a, b) => {
    // En Round Robin, simplemente FIFO (primero llegado, primero servido)
    if (a.tiempoArribo !== b.tiempoArribo) {
      return a.tiempoArribo - b.tiempoArribo;
    }
    return a.name.localeCompare(b.name);
  },

  SPN: (a, b) => {
    // Shortest Process Next: trabajo más corto primero
    const tiempoTotalA = a.rafagasRestantes * a.duracionRafagaCPU + 
                        Math.max(0, a.rafagasRestantes - 1) * a.duracionRafagaES;
    const tiempoTotalB = b.rafagasRestantes * b.duracionRafagaCPU + 
                        Math.max(0, b.rafagasRestantes - 1) * b.duracionRafagaES;
    
    if (tiempoTotalA !== tiempoTotalB) {
      return tiempoTotalA - tiempoTotalB;
    }
    // Empate: FCFS
    if (a.tiempoArribo !== b.tiempoArribo) {
      return a.tiempoArribo - b.tiempoArribo;
    }
    return a.name.localeCompare(b.name);
  },

  SRTN: (a, b) => {
    // Shortest Remaining Time Next: menor tiempo restante primero
    const tiempoRestanteA = a.rafagasRestantes > 1 ? 
      a.restanteEnRafaga + (a.rafagasRestantes - 1) * a.duracionRafagaCPU + 
      (a.rafagasRestantes - 1) * a.duracionRafagaES :
      a.restanteEnRafaga;
    
    const tiempoRestanteB = b.rafagasRestantes > 1 ? 
      b.restanteEnRafaga + (b.rafagasRestantes - 1) * b.duracionRafagaCPU + 
      (b.rafagasRestantes - 1) * b.duracionRafagaES :
      b.restanteEnRafaga;
    
    if (tiempoRestanteA !== tiempoRestanteB) {
      return tiempoRestanteA - tiempoRestanteB;
    }
    // Empate: FCFS
    if (a.tiempoArribo !== b.tiempoArribo) {
      return a.tiempoArribo - b.tiempoArribo;
    }
    return a.name.localeCompare(b.name);
  }
};

/**
 * Cola de prioridad especializada para el simulador
 * Mantiene orden según la política de planificación activa
 */
export class ColaPrioridadSimulador {
  private elementos: string[] = [];
  private comparador: ColaComparator;
  private obtenerProceso: (name: string) => ProcesoRT;

  constructor(
    policy: Policy, 
    obtenerProceso: (name: string) => ProcesoRT
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
    this.elementos = procesos.map(p => p.name);
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
