/**
 * Estrategias de planificación académicas según diagramas de secuencia
 * Implementa las 5 políticas con guard conditions explícitas
 * Compatible con interfaz EstrategiaScheduler existente
 */

import type { Proceso } from '../entities/Proceso';
import { EstrategiaSchedulerBase, type EstrategiaScheduler } from './Scheduler';
import { TipoEvento } from '../types';

// Re-export para compatibilidad
export type { EstrategiaScheduler };

/**
 * First Come First Serve (FCFS)
 * Política no expropiativa por orden de llegada
 */
export class EstrategiaFCFS extends EstrategiaSchedulerBase {
  readonly nombre = 'FCFS';
  readonly soportaExpropiacion = false;
  readonly requiereQuantum = false;
  
  elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined {
    if (colaListos.length === 0) return undefined;
    
    // Guard condition: Elegir proceso con menor tiempo de arribo
    // Si empates, usar orden de llegada a ready queue (FIFO)
    const procesoSeleccionado = colaListos.reduce((min, actual) => {
      if (actual.arribo < min.arribo) return actual;
      if (actual.arribo === min.arribo) {
        // Desempate por orden de inserción en ready queue
        return this.compararPorTiempoLlegadaReady(actual, min) < 0 ? actual : min;
      }
      return min;
    });
    
    return procesoSeleccionado;
  }
}

/**
 * Round Robin (RR)
 * Política expropiativa con quantum
 */
export class EstrategiaRR extends EstrategiaSchedulerBase {
  readonly nombre = 'RR';
  readonly soportaExpropiacion = true;
  readonly requiereQuantum = true;
  
  constructor(private quantum: number) {
    super();
  }
  
  elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined {
    if (colaListos.length === 0) return undefined;
    
    // Guard condition: Tomar primer proceso (FIFO circular)
    // Los procesos expropiedos van al final de la cola
    return colaListos[0];
  }
  
  debeExpropiar(procesoActual: Proceso, procesoCandidato: Proceso, tiempoActual: number): boolean {
    // Guard condition: Expropiación por quantum timeout únicamente
    // No se expropia por llegada de otros procesos
    return false;
  }
}

/**
 * Priority Scheduling (PS)
 * Política expropiativa por prioridad con aging
 */
export class EstrategiaPrioridad extends EstrategiaSchedulerBase {
  readonly nombre = 'Priority';
  readonly soportaExpropiacion = true;
  readonly requiereQuantum = false;
  
  constructor(private factorAging: number = 0.1) {
    super();
  }
  
  elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined {
    if (colaListos.length === 0) return undefined;
    
    // Aplicar aging antes de seleccionar
    this.aplicarAging(colaListos, tiempoActual);
    
    // Guard condition: Elegir proceso con mayor prioridad efectiva
    const procesoSeleccionado = colaListos.reduce((maxPrioridad, actual) => {
      const prioridadActual = this.calcularPrioridadEfectiva(actual, tiempoActual);
      const prioridadMax = this.calcularPrioridadEfectiva(maxPrioridad, tiempoActual);
      
      if (prioridadActual > prioridadMax) return actual;
      if (prioridadActual === prioridadMax) {
        // Desempate por tiempo de arribo (FCFS)
        return actual.arribo < maxPrioridad.arribo ? actual : maxPrioridad;
      }
      return maxPrioridad;
    });
    
    return procesoSeleccionado;
  }
  
  debeExpropiar(procesoActual: Proceso, procesoCandidato: Proceso, tiempoActual: number): boolean {
    const prioridadActual = this.calcularPrioridadEfectiva(procesoActual, tiempoActual);
    const prioridadCandidato = this.calcularPrioridadEfectiva(procesoCandidato, tiempoActual);
    
    // Guard condition: Expropiación si candidato tiene mayor prioridad
    return prioridadCandidato > prioridadActual;
  }
  
  aplicarAging(colaListos: Proceso[], tiempoActual: number): void {
    colaListos.forEach(proceso => {
      if (!proceso.tiempoUltimoReady) {
        proceso.tiempoUltimoReady = tiempoActual;
      }
    });
  }
  
  private calcularPrioridadEfectiva(proceso: Proceso, tiempoActual: number): number {
    const tiempoBaseReady = proceso.tiempoUltimoReady || tiempoActual;
    const tiempoEspera = Math.max(0, tiempoActual - tiempoBaseReady);
    const aging = this.factorAging * tiempoEspera;
    return proceso.prioridad + aging;
  }
}

/**
 * Shortest Remaining Time First (SRTF)
 * Política expropiativa por menor tiempo restante
 */
export class EstrategiaSRTF extends EstrategiaSchedulerBase {
  readonly nombre = 'SRTF';
  readonly soportaExpropiacion = true;
  readonly requiereQuantum = false;
  
  elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined {
    if (colaListos.length === 0) return undefined;
    
    // Guard condition: Elegir proceso con menor tiempo restante
    const procesoSeleccionado = colaListos.reduce((minTiempo, actual) => {
      const tiempoRestanteActual = this.calcularTiempoRestante(actual);
      const tiempoRestanteMin = this.calcularTiempoRestante(minTiempo);
      
      if (tiempoRestanteActual < tiempoRestanteMin) return actual;
      if (tiempoRestanteActual === tiempoRestanteMin) {
        // Desempate por tiempo de arribo
        return actual.arribo < minTiempo.arribo ? actual : minTiempo;
      }
      return minTiempo;
    });
    
    return procesoSeleccionado;
  }
  
  debeExpropiar(procesoActual: Proceso, procesoCandidato: Proceso, tiempoActual: number): boolean {
    const tiempoRestanteActual = this.calcularTiempoRestante(procesoActual);
    const tiempoRestanteCandidato = this.calcularTiempoRestante(procesoCandidato);
    
    // Guard condition: Expropiación si candidato tiene menor tiempo restante
    return tiempoRestanteCandidato < tiempoRestanteActual;
  }
  
  private calcularTiempoRestante(proceso: Proceso): number {
    const tiempoTotalTrabajo = proceso.rafagasCPU * proceso.duracionCPU;
    const tiempoCompletado = proceso.rafagasCompletadas * proceso.duracionCPU + proceso.tiempoCPUConsumido;
    return tiempoTotalTrabajo - tiempoCompletado;
  }
}

/**
 * Shortest Job First (SJF)
 * Política no expropiativa por menor trabajo total
 */
export class EstrategiaSJF extends EstrategiaSchedulerBase {
  readonly nombre = 'SJF';
  readonly soportaExpropiacion = false;
  readonly requiereQuantum = false;
  
  elegirSiguiente(colaListos: Proceso[], tiempoActual: number): Proceso | undefined {
    if (colaListos.length === 0) return undefined;
    
    // Guard condition: Elegir proceso con menor trabajo total
    const procesoSeleccionado = colaListos.reduce((minTrabajo, actual) => {
      const trabajoActual = this.calcularTrabajoTotal(actual);
      const trabajoMin = this.calcularTrabajoTotal(minTrabajo);
      
      if (trabajoActual < trabajoMin) return actual;
      if (trabajoActual === trabajoMin) {
        // Desempate por tiempo de arribo
        return actual.arribo < minTrabajo.arribo ? actual : minTrabajo;
      }
      return minTrabajo;
    });
    
    return procesoSeleccionado;
  }
  
  private calcularTrabajoTotal(proceso: Proceso): number {
    // Trabajo total = (ráfagas CPU × duración CPU) + (ráfagas I/O × duración I/O)
    const trabajoCPU = proceso.rafagasCPU * proceso.duracionCPU;
    const trabajoIO = Math.max(0, proceso.rafagasCPU - 1) * proceso.duracionIO;
    return trabajoCPU + trabajoIO;
  }
}

/**
 * Factory para crear estrategias
 */
export class FactoriaEstrategias {
  static crear(nombre: string, parametros?: any): EstrategiaScheduler {
    switch (nombre.toUpperCase()) {
      case 'FCFS':
        return new EstrategiaFCFS();
        
      case 'RR':
      case 'ROUND_ROBIN':
        const quantum = parametros?.quantum || 2;
        return new EstrategiaRR(quantum);
        
      case 'PRIORITY':
      case 'PS':
        const factorAging = parametros?.factorAging || 0.1;
        return new EstrategiaPrioridad(factorAging);
        
      case 'SRTF':
        return new EstrategiaSRTF();
        
      case 'SJF':
        return new EstrategiaSJF();
        
      default:
        throw new Error(`Estrategia de scheduling no soportada: ${nombre}`);
    }
  }
  
  static obtenerEstrategiasDisponibles(): string[] {
    return ['FCFS', 'RR', 'Priority', 'SRTF', 'SJF'];
  }
}
