/**
 * Motor de simulación por eventos discretos - Versión Corregida
 * Implementa el bucle principal del simulador de planificación de procesos
 */

import type { Workload } from '../model/types';
import { FabricaScheduler } from './scheduler';
import type { 
  SimState, 
  ProcesoRT, 
  TipoEventoInterno, 
  EventoInterno,
  ModoEjecucion 
} from './state';
import { 
  crearEstadoInicial, 
  agregarEventoInterno, 
  agregarEventoExportacion 
} from './state';

/**
 * Resultado de la simulación
 */
export interface ResultadoSimulacion {
  eventosInternos: EventoInterno[];
  eventosExportacion: any[];
  estadoFinal: SimState;
  exitoso: boolean;
  error?: string;
}

/**
 * Motor principal del simulador - Versión Simplificada y Funcional
 */
export class MotorSimulacion {
  private scheduler: any;
  private state: SimState;
  private maxIteraciones = 1000; // Protección contra bucles infinitos

  constructor(workload: Workload) {
  this.state = crearEstadoInicial(workload);
  // Instanciar el scheduler según la política
  // RR: pasar quantum
  const { policy, quantum } = workload.config;
  this.scheduler = FabricaScheduler.crear(policy, quantum);
  }

  /**
   * Ejecuta la simulación completa usando el motor de eventos discretos
   */
  ejecutar(): ResultadoSimulacion {
    try {
      console.log('🚀 Iniciando simulación por eventos discretos...');
      this.simularPorEventos();
      return {
        eventosInternos: this.state.eventosInternos,
        eventosExportacion: this.state.eventosExportacion,
        estadoFinal: this.state,
        exitoso: true
      };
    } catch (error) {
      console.error('❌ Error en simulación:', error);
      return {
        eventosInternos: this.state.eventosInternos,
        eventosExportacion: this.state.eventosExportacion,
        estadoFinal: this.state,
        exitoso: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Motor de eventos discretos: procesa todos los tipos de eventos según la consigna
   */
  private simularPorEventos(): void {
    // Protección contra bucles infinitos
    const LIMITE_ITERACIONES = 10000;
    let iteraciones = 0;

    // Inicializar eventos futuros: arribo de cada proceso
    const eventosFuturos: { tiempo: number; tipo: string; proceso: string }[] = [];
    for (const proceso of this.state.procesos.values()) {
      eventosFuturos.push({ tiempo: proceso.tiempoArribo, tipo: 'Arribo', proceso: proceso.name });
    }

    // Bucle principal de simulación
    let tiempoAnterior = 0;
    while (this.hayProcesosPendientes() && iteraciones < LIMITE_ITERACIONES) {
      iteraciones++;
      // Ordenar eventos futuros por tiempo, prioridad de evento y tie-break por nombre
      const prioridadEvento: Record<string, number> = {
        'FinRafagaCPU': 1,
        'FinES': 2,
        'AgotamientoQuantum': 3,
        'FinTIP': 4,
        'Arribo': 5,
        'Despacho': 6
      };
      eventosFuturos.sort((a, b) => {
        if (a.tiempo !== b.tiempo) return a.tiempo - b.tiempo;
        // Prioridad de evento según consigna
        const pa = prioridadEvento[a.tipo] !== undefined ? prioridadEvento[a.tipo] : 99;
        const pb = prioridadEvento[b.tipo] !== undefined ? prioridadEvento[b.tipo] : 99;
        if (pa !== pb) return pa - pb;
        // Tie-break por nombre de proceso
        return a.proceso.localeCompare(b.proceso);
      });
      const evento = eventosFuturos.shift();
      if (!evento) break;

      // Actualizar contadores de CPU entre eventos
      const delta = evento.tiempo - tiempoAnterior;
      if (delta > 0) {
        // Determinar qué estaba usando la CPU en ese intervalo
        if (this.state.procesoEjecutando) {
          // CPU de procesos
          this.state.contadoresCPU.procesos += delta;
        } else {
          // CPU ociosa
          this.state.contadoresCPU.ocioso += delta;
        }
      }
      tiempoAnterior = evento.tiempo;

      // Avanzar el reloj
      this.state.tiempoActual = evento.tiempo;
      const proceso = this.state.procesos.get(evento.proceso);
      if (!proceso) continue;

      switch (evento.tipo) {
        case 'Arribo':
          // Nuevo → Listo (con TIP)
          proceso.estado = 'Nuevo';
          agregarEventoInterno(this.state, 'Arribo', proceso.name, 'Llegada al sistema');
          agregarEventoExportacion(this.state, 'ARRIBO_TRABAJO', proceso.name, `TIP consumido: ${this.state.tip}`);
          // TIP
          this.state.contadoresCPU.sistemaOperativo += this.state.tip;
          proceso.inicioTIP = this.state.tiempoActual;
          proceso.finTIP = this.state.tiempoActual + this.state.tip;
          proceso.tipCumplido = true;
          // Programar fin de TIP
          eventosFuturos.push({ tiempo: proceso.finTIP!, tipo: 'FinTIP', proceso: proceso.name });
          break;
        case 'FinTIP':
          // ...existing code...
          break;
        case 'Despacho': {
          // Listo → Corriendo (consume TCP)
          proceso.estado = 'Ejecutando';
          this.state.procesoEjecutando = proceso.name;
          // RR: caso especial consigna, aplicar TCP en primer despacho y re-despacho único
          let aplicarTCP = true;
          if (this.state.policy === 'RR' && this.scheduler && typeof this.scheduler.esDespachoUnico === 'function') {
            if (this.scheduler.esDespachoUnico()) {
              aplicarTCP = true;
            }
          }
          if (aplicarTCP) {
            this.state.contadoresCPU.sistemaOperativo += this.state.tcp;
            agregarEventoExportacion(this.state, 'CAMBIO_CONTEXTO', proceso.name, `TCP consumido: ${this.state.tcp}`);
          }
          agregarEventoInterno(this.state, 'Despacho', proceso.name);
          agregarEventoExportacion(this.state, 'DESPACHO', proceso.name);
          // Programar fin de ráfaga o quantum
          if (this.state.policy === 'RR' && this.state.quantum) {
            const quantumFin = this.state.tiempoActual + this.state.quantum;
            eventosFuturos.push({ tiempo: quantumFin, tipo: 'AgotamientoQuantum', proceso: proceso.name });
          }
          const rafagaFin = this.state.tiempoActual + proceso.restanteEnRafaga;
          eventosFuturos.push({ tiempo: rafagaFin, tipo: 'FinRafagaCPU', proceso: proceso.name });
          break;
        }
        case 'FinRafagaCPU':
          // Ejecutando → (Bloqueado | Terminado)
          proceso.rafagasRestantes--;
          proceso.restanteEnRafaga = proceso.duracionRafagaCPU;
          agregarEventoInterno(this.state, 'FinRafagaCPU', proceso.name);
          agregarEventoExportacion(this.state, 'FIN_RAFAGA_CPU', proceso.name);
          if (proceso.rafagasRestantes > 0) {
            // Bloqueado (E/S)
            proceso.estado = 'Bloqueado';
            this.state.colaBloqueados.push(proceso.name);
            // Programar fin de E/S (instantáneo según consigna)
            eventosFuturos.push({ tiempo: this.state.tiempoActual, tipo: 'FinES', proceso: proceso.name });
          } else {
            // Terminado
            proceso.estado = 'Terminado';
            this.state.procesoEjecutando = undefined;
            // TFP
            this.state.contadoresCPU.sistemaOperativo += this.state.tfp;
            proceso.finTFP = this.state.tiempoActual + this.state.tfp;
            agregarEventoInterno(this.state, 'FinTFP', proceso.name, 'Proceso terminado');
            agregarEventoExportacion(this.state, 'TERMINACION_PROCESO', proceso.name, `TFP consumido: ${this.state.tfp}`);
          }
          break;
        case 'FinES':
          // Bloqueado → Listo (instantáneo, 0 tiempo)
          proceso.estado = 'Listo';
          this.state.colaListos.push(proceso.name);
          // Registrar evento, pero no sumar tiempo ni costo aquí
          agregarEventoInterno(this.state, 'FinES', proceso.name);
          agregarEventoExportacion(this.state, 'FIN_ES', proceso.name);
          // El costo de TCP se suma en el próximo despacho
          break;
        case 'AgotamientoQuantum':
          // Ejecutando → Listo (RR)
          if (proceso.estado === 'Ejecutando' && this.state.policy === 'RR') {
            proceso.estado = 'Listo';
            this.state.colaListos.push(proceso.name);
            this.state.procesoEjecutando = undefined;
            agregarEventoInterno(this.state, 'AgotamientoQuantum', proceso.name);
            agregarEventoExportacion(this.state, 'AGOTAMIENTO_QUANTUM', proceso.name);
          }
          break;
        default:
          break;
      }

      // Despacho: Listo → Corriendo (si no hay proceso ejecutando)
      if (!this.state.procesoEjecutando && this.state.colaListos.length > 0) {
        const siguiente = this.seleccionarProceso();
        if (siguiente) {
          // Eliminar de cola de listos
          this.state.colaListos = this.state.colaListos.filter(n => n !== siguiente.name);
          // Programar despacho inmediato
          eventosFuturos.push({ tiempo: this.state.tiempoActual, tipo: 'Despacho', proceso: siguiente.name });
        }
      }

      // Lógica de expropiación PRIORITY y SRTN
      if (this.state.procesoEjecutando && this.state.colaListos.length > 0) {
        const actual = this.state.procesos.get(this.state.procesoEjecutando);
        const candidatos = this.state.colaListos.map(n => this.state.procesos.get(n)).filter(Boolean);
        let debeExpropiar = false;
        let nuevoProceso: ProcesoRT | undefined;
        if (this.state.policy === 'PRIORITY') {
          // Buscar si hay uno con mayor prioridad
          const mayorPrioridad = candidatos.reduce((max, p) => p!.prioridad > max!.prioridad ? p : max, actual);
          if (mayorPrioridad && mayorPrioridad !== actual && mayorPrioridad.prioridad > actual!.prioridad) {
            debeExpropiar = true;
            nuevoProceso = mayorPrioridad;
          }
        }
        if (this.state.policy === 'SRTN') {
          // Buscar si hay uno con menor tiempo restante
          const menorRestante = candidatos.reduce((min, p) => (p!.rafagasRestantes * p!.duracionRafagaCPU) < (min!.rafagasRestantes * min!.duracionRafagaCPU) ? p : min, actual);
          if (menorRestante && menorRestante !== actual && (menorRestante.rafagasRestantes * menorRestante.duracionRafagaCPU) < (actual!.rafagasRestantes * actual!.duracionRafagaCPU)) {
            debeExpropiar = true;
            nuevoProceso = menorRestante;
          }
        }
        if (debeExpropiar && nuevoProceso) {
          // Expropiar: el proceso actual pasa a listo, el nuevo toma la CPU
          actual!.estado = 'Listo';
          this.state.colaListos.push(actual!.name);
          this.state.procesoEjecutando = undefined;
          agregarEventoInterno(this.state, 'Despacho', nuevoProceso.name, 'Expropiación');
          agregarEventoExportacion(this.state, 'EXPROPIACION', nuevoProceso.name);
          // Eliminar de cola de listos
          this.state.colaListos = this.state.colaListos.filter(n => n !== nuevoProceso!.name);
          // Programar despacho inmediato
          eventosFuturos.push({ tiempo: this.state.tiempoActual, tipo: 'Despacho', proceso: nuevoProceso.name });
        }
      }
    }
    // Finalización: actualizar métricas y contabilidad si es necesario
    this.state.tiempoActual = Math.max(...Array.from(this.state.procesos.values()).map(p => p.finTFP || 0));
    console.log(`🏁 Simulación por eventos completada en tiempo ${this.state.tiempoActual}`);
  }

  /**
   * Selecciona el siguiente proceso a despachar según la política
   */
  private seleccionarProceso(): any {
    const colaListos = this.state.colaListos.map(n => this.state.procesos.get(n)).filter(Boolean);
    if (colaListos.length === 0) return undefined;
    switch (this.state.policy) {
      case 'FCFS':
        colaListos.sort((a, b) => a!.tiempoArribo - b!.tiempoArribo);
        return colaListos[0];
      case 'PRIORITY':
        colaListos.sort((a, b) => b!.prioridad - a!.prioridad);
        return colaListos[0];
      case 'RR':
        return colaListos[0];
      case 'SPN':
        colaListos.sort((a, b) => a!.rafagasRestantes * a!.duracionRafagaCPU - b!.rafagasRestantes * b!.duracionRafagaCPU);
        return colaListos[0];
      case 'SRTN':
        colaListos.sort((a, b) => (a!.rafagasRestantes * a!.duracionRafagaCPU) - (b!.rafagasRestantes * b!.duracionRafagaCPU));
        return colaListos[0];
      default:
        return colaListos[0];
    }
  }

  /**
   * Verifica si quedan procesos pendientes de terminar
   */
  private hayProcesosPendientes(): boolean {
    return Array.from(this.state.procesos.values()).some(p => p.estado !== 'Terminado');
  }
}
