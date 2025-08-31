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
import { ColaEventos } from './eventQueue';

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

    // Inicializar cola de eventos con arrivals
    const colaEventos = new ColaEventos();
    for (const proceso of this.state.procesos.values()) {
      colaEventos.agregar({ 
        tiempo: proceso.tiempoArribo, 
        tipo: 'Arribo', 
        proceso: proceso.name 
      });
    }

    // Bucle principal de simulación
    let tiempoAnterior = 0;
    
    while (!colaEventos.estaVacia() && iteraciones < LIMITE_ITERACIONES) {
      iteraciones++;
      
      const evento = colaEventos.siguiente();
      if (!evento) {
        break;
      }

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
      const proceso = this.state.procesos.get(evento.proceso || '');
      if (!proceso) continue;

      switch (evento.tipo) {
        case 'Arribo':
          // Nuevo → TIP (consume tiempo real del SO) → Listo
          proceso.estado = 'Nuevo';
          agregarEventoInterno(this.state, 'Arribo', proceso.name, 'Llegada al sistema - inicio TIP');
          agregarEventoExportacion(this.state, 'ARRIBO_TRABAJO', proceso.name, `Iniciando incorporación al sistema (TIP: ${this.state.tip})`);
          
          // Marcar inicio del TIP
          proceso.inicioTIP = this.state.tiempoActual;
          proceso.finTIP = this.state.tiempoActual + this.state.tip;
          
          // Programar fin del TIP para que el proceso pase a Listo
          colaEventos.agregar({ 
            tiempo: proceso.finTIP!, 
            tipo: 'FinTIP', 
            proceso: proceso.name
          });
          
          break;
        case 'FinTFP':
          // Finalización completa del proceso - TFP consumido
          // El proceso ya estaba en estado 'Terminado', ahora aplicamos el costo del TFP
          this.state.contadoresCPU.sistemaOperativo += this.state.tfp;
          proceso.finTFP = this.state.tiempoActual;
          
          agregarEventoInterno(this.state, 'FinTFP', proceso.name, 'Proceso completamente terminado después de TFP');
          agregarEventoExportacion(this.state, 'TERMINACION_PROCESO', proceso.name, `TFP consumido: ${this.state.tfp} - Proceso completamente terminado`);
          
          // NO programar despacho - el proceso ya terminó completamente
          // Si otros procesos necesitan ejecutarse, FinTIP u otros eventos lo manejarán
          break;
        case 'FinTIP':
          // Fin del TIP: Nuevo → Listo (el proceso ya puede ser considerado como "Listo")
          proceso.estado = 'Listo';
          proceso.tipCumplido = true;
          proceso.ultimoTiempoEnListo = this.state.tiempoActual;
          
          // Consumir el tiempo del TIP en el contador del SO
          this.state.contadoresCPU.sistemaOperativo += this.state.tip;
          
          // Agregar a cola de listos
          if (!this.state.colaListos.includes(proceso.name)) {
            this.state.colaListos.push(proceso.name);
          }
          
          // Reordenar cola según política
          this.reordenarColaListos();
          
          agregarEventoInterno(this.state, 'FinTIP', proceso.name, 'Proceso incorporado al sistema - ahora en Listo');
          agregarEventoExportacion(this.state, 'INCORPORACION_SISTEMA', proceso.name, 'Proceso listo para ser despachado');
          
          // Si no hay proceso ejecutando, programar despacho para el primero en cola
          if (!this.state.procesoEjecutando && this.state.colaListos.length > 0) {
            const siguienteProceso = this.state.colaListos[0];
            colaEventos.agregar({ tiempo: this.state.tiempoActual, tipo: 'Despacho', proceso: siguienteProceso });
          }
          
          // Si hay políticas con expropiación, verificar si debe expropiar
          if (this.state.policy === 'PRIORITY' || this.state.policy === 'SRTN') {
            this.verificarExpropiacion(colaEventos);
          }
          break;
        case 'Despacho': {
          // Listo → Corriendo (siempre consume TCP según consigna)
          proceso.estado = 'Ejecutando';
          this.state.procesoEjecutando = proceso.name;
          
          // Aplicar TCP en TODOS los despachos (transición Listo → Corriendo)
          // Esto incluye: primer despacho, re-despachos, y cambios de contexto
          this.state.contadoresCPU.sistemaOperativo += this.state.tcp;
          
          // Si hay costo acumulado de transiciones Bloqueado→Listo instantáneas, se incluye aquí
          if (this.state.costoBloqueadoListoPendiente > 0) {
            this.state.contadoresCPU.sistemaOperativo += this.state.costoBloqueadoListoPendiente;
            agregarEventoExportacion(this.state, 'CAMBIO_CONTEXTO', proceso.name, 
              `TCP consumido: ${this.state.tcp} + Costo Bloqueado→Listo: ${this.state.costoBloqueadoListoPendiente}`);
            this.state.costoBloqueadoListoPendiente = 0;
          } else {
            agregarEventoExportacion(this.state, 'CAMBIO_CONTEXTO', proceso.name, `TCP consumido: ${this.state.tcp}`);
          }
          
          agregarEventoInterno(this.state, 'Despacho', proceso.name);
          agregarEventoExportacion(this.state, 'DESPACHO', proceso.name);
          // Programar fin de ráfaga o quantum
          if (this.state.policy === 'RR' && this.state.quantum) {
            const quantumFin = this.state.tiempoActual + this.state.quantum;
            colaEventos.agregar({ tiempo: quantumFin, tipo: 'AgotamientoQuantum', proceso: proceso.name });
          }
          const rafagaFin = this.state.tiempoActual + proceso.restanteEnRafaga;
          // Programar fin de ráfaga con información de si es la última
          const esUltimaRafaga = proceso.rafagasRestantes <= 1;
          colaEventos.agregar({ 
            tiempo: rafagaFin, 
            tipo: 'FinRafagaCPU', 
            proceso: proceso.name 
          }, esUltimaRafaga);
          break;
        }
        case 'FinRafagaCPU':
          // Ejecutando → (Bloqueado | Terminado)
          proceso.rafagasRestantes--;
          proceso.restanteEnRafaga = proceso.duracionRafagaCPU;
          
          if (proceso.rafagasRestantes > 0) {
            // Bloqueado (E/S)
            proceso.estado = 'Bloqueado';
            this.state.colaBloqueados.push(proceso.name);
            
            agregarEventoInterno(this.state, 'FinRafagaCPU', proceso.name, 'Ráfaga completada - proceso a E/S');
            agregarEventoExportacion(this.state, 'FIN_RAFAGA_CPU', proceso.name, 'Proceso pasa a E/S');
            
            // Programar fin de E/S (instantáneo según consigna)
            colaEventos.agregar({ tiempo: this.state.tiempoActual, tipo: 'FinES', proceso: proceso.name });
          } else {
            // Última ráfaga completada: proceso debe terminar
            proceso.estado = 'Terminado';
            this.state.procesoEjecutando = undefined;
            
            agregarEventoInterno(this.state, 'FinRafagaCPU', proceso.name, 'Última ráfaga completada - programando TFP');
            agregarEventoExportacion(this.state, 'INICIO_TERMINACION', proceso.name, `Iniciando terminación del proceso (TFP: ${this.state.tfp})`);
            
            // Programar evento FinTFP para que el SO procese la terminación
            // El TFP consume tiempo real del sistema
            const tiempoFinTFP = this.state.tiempoActual + this.state.tfp;
            colaEventos.agregar({ 
              tiempo: tiempoFinTFP, 
              tipo: 'FinTFP', 
              proceso: proceso.name 
            });
          }
          break;
        case 'FinES':
          // Bloqueado → Listo (instantáneo, 0 tiempo según consigna punto c)
          // "Un proceso pasa de bloqueado a listo instantáneamente y consume 0 unidades de tiempo"
          proceso.estado = 'Listo';
          
          // Actualizar tiempo en listo - empieza a contar desde este momento
          proceso.ultimoTiempoEnListo = this.state.tiempoActual;
          
          // Agregar a cola de listos si no está ya
          if (!this.state.colaListos.includes(proceso.name)) {
            this.state.colaListos.push(proceso.name);
          }
          
          // Reordenar cola según política de planificación
          this.reordenarColaListos();
          
          // Registrar evento sin consumir tiempo
          agregarEventoInterno(this.state, 'FinES', proceso.name, 'Fin E/S - Bloqueado a Listo instantáneo');
          agregarEventoExportacion(this.state, 'FIN_ES', proceso.name, 'Proceso listo para continuar');
          
          // Acumular costo de transición Bloqueado→Listo para el próximo TCP
          // Según consigna: "este tiempo lo consideramos dentro del TCP posterior"
          this.state.costoBloqueadoListoPendiente += this.state.tcp;
          
          // Si hay política con expropiación (PRIORITY, SRTN), verificar si debe expropiar
          if (this.state.policy === 'PRIORITY' || this.state.policy === 'SRTN') {
            this.verificarExpropiacion(colaEventos);
          }
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

      // Comentado: Lógica de despacho automático redundante que causa duplicación
      // Los eventos ya programan sus propios despachos cuando es necesario
      // if (!this.state.procesoEjecutando && this.state.colaListos.length > 0) {
      //   const siguiente = this.seleccionarProceso();
      //   if (siguiente) {
      //     // Eliminar de cola de listos
      //     this.state.colaListos = this.state.colaListos.filter(n => n !== siguiente.name);
      //     // Programar despacho inmediato
      //     colaEventos.agregar({ tiempo: this.state.tiempoActual, tipo: 'Despacho', proceso: siguiente.name });
      //   }
      // }

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
          colaEventos.agregar({ tiempo: this.state.tiempoActual, tipo: 'Despacho', proceso: nuevoProceso.name });
        }
      }
    }
    // Finalización: el tiempo actual ya está correcto gracias al manejo por eventos
    // No necesitamos ajustarlo manualmente
    
    console.log(`🔧 Debug: Simulación terminó después de ${iteraciones} iteraciones en tiempo ${this.state.tiempoActual}`);
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

  /**
   * Reordena la cola de listos según la política de planificación
   */
  private reordenarColaListos(): void {
    const procesos = this.state.colaListos.map(n => this.state.procesos.get(n)).filter(Boolean);
    
    switch (this.state.policy) {
      case 'FCFS':
        procesos.sort((a, b) => a!.tiempoArribo - b!.tiempoArribo);
        break;
      case 'PRIORITY':
        procesos.sort((a, b) => b!.prioridad - a!.prioridad);
        break;
      case 'RR':
        // Round Robin mantiene orden FIFO
        break;
      case 'SPN':
        procesos.sort((a, b) => 
          (a!.rafagasRestantes * a!.duracionRafagaCPU) - 
          (b!.rafagasRestantes * b!.duracionRafagaCPU)
        );
        break;
      case 'SRTN':
        procesos.sort((a, b) => 
          (a!.rafagasRestantes * a!.duracionRafagaCPU) - 
          (b!.rafagasRestantes * b!.duracionRafagaCPU)
        );
        break;
    }
    
    // Actualizar la cola con el nuevo orden
    this.state.colaListos = procesos.map(p => p!.name);
  }

  /**
   * Verifica si debe ocurrir una expropiación debido a un proceso de mayor prioridad/menor tiempo
   */
  private verificarExpropiacion(colaEventos: any): void {
    const actual = this.state.procesoEjecutando ? this.state.procesos.get(this.state.procesoEjecutando) : null;
    if (!actual) return;

    const candidatos = this.state.colaListos.map(n => this.state.procesos.get(n)).filter(Boolean);
    if (candidatos.length === 0) return;

    let debeExpropiar = false;
    let nuevoProceso: any = null;

    if (this.state.policy === 'PRIORITY') {
      // Buscar proceso con mayor prioridad
      const mayorPrioridad = candidatos.reduce((max, p) => 
        p!.prioridad > max!.prioridad ? p : max, candidatos[0]);
      
      if (mayorPrioridad && mayorPrioridad.prioridad > actual.prioridad) {
        debeExpropiar = true;
        nuevoProceso = mayorPrioridad;
      }
    }

    if (this.state.policy === 'SRTN') {
      // Buscar proceso con menor tiempo restante
      const menorRestante = candidatos.reduce((min, p) => {
        const tiempoA = p!.rafagasRestantes * p!.duracionRafagaCPU;
        const tiempoB = min!.rafagasRestantes * min!.duracionRafagaCPU;
        return tiempoA < tiempoB ? p : min;
      }, candidatos[0]);
      
      const tiempoActual = actual.rafagasRestantes * actual.duracionRafagaCPU;
      const tiempoNuevo = menorRestante!.rafagasRestantes * menorRestante!.duracionRafagaCPU;
      
      if (menorRestante && tiempoNuevo < tiempoActual) {
        debeExpropiar = true;
        nuevoProceso = menorRestante;
      }
    }

    if (debeExpropiar && nuevoProceso) {
      // Expropiar: proceso actual pasa a listo
      actual.estado = 'Listo';
      actual.ultimoTiempoEnListo = this.state.tiempoActual;
      this.state.colaListos.push(actual.name);
      this.state.procesoEjecutando = undefined;
      
      // Remover el nuevo proceso de la cola de listos
      this.state.colaListos = this.state.colaListos.filter(n => n !== nuevoProceso.name);
      
      // Registrar expropiación
      agregarEventoInterno(this.state, 'Despacho', nuevoProceso.name, 'Expropiación por mayor prioridad/menor tiempo');
      agregarEventoExportacion(this.state, 'EXPROPIACION', nuevoProceso.name, `Expropió a ${actual.name}`);
      
      // Programar despacho inmediato del nuevo proceso
      colaEventos.agregar({ 
        tiempo: this.state.tiempoActual, 
        tipo: 'Despacho', 
        proceso: nuevoProceso.name 
      });
    }
  }
}
