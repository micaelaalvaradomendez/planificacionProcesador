/**
 * Motor de simulación por eventos discretos - Versión Corregida
 * Implementa el bucle principal del simulador de planificación de procesos
 */

import type { Workload } from '../model/types';
import { FabricaScheduler, type Scheduler } from './scheduler';
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
  private scheduler: Scheduler;
  private state: SimState;
  private maxIteraciones = 1000; // Protección contra bucles infinitos

  constructor(workload: Workload) {
  // Validar quantum para RR
  const { policy, quantum } = workload.config;
  if (policy === 'RR') {
    if (!quantum || quantum <= 0) {
      throw new Error('El quantum debe ser mayor que 0 para Round Robin');
    }
  }
  
  this.state = crearEstadoInicial(workload);
  // Instanciar el scheduler según la política
  // RR: pasar quantum
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
    for (const proceso of Array.from(this.state.procesos.values())) {
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
          
          // El proceso ya terminó completamente, limpiar referencia de ejecución
          this.state.procesoEjecutando = undefined;
          
          agregarEventoInterno(this.state, 'FinTFP', proceso.name, 'Proceso completamente terminado después de TFP');
          agregarEventoExportacion(this.state, 'TERMINACION_PROCESO', proceso.name, `TFP consumido: ${this.state.tfp} - Proceso completamente terminado`);
          
          // Si hay procesos en cola de listos, programar despacho del siguiente
          if (this.state.colaListos.length > 0) {
            // El proceso se seleccionará dinámicamente en el handler de Despacho
            const siguienteProceso = this.state.colaListos[0]; // Usar el primero como placeholder
            colaEventos.agregar({ tiempo: this.state.tiempoActual, tipo: 'Despacho', proceso: siguienteProceso });
          }
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
          // Seleccionar el proceso correcto según la política de planificación
          const procesoSeleccionado = this.seleccionarProceso();
          if (!procesoSeleccionado) {
            // No hay procesos listos, saltar este evento
            break;
          }
          
          // **ACUMULAR TIEMPO EN LISTO** - solo después de TIP
          if (procesoSeleccionado.tipCumplido && procesoSeleccionado.ultimoTiempoEnListo !== undefined) {
            const tiempoEnListoActual = this.state.tiempoActual - procesoSeleccionado.ultimoTiempoEnListo;
            procesoSeleccionado.tiempoListoAcumulado += tiempoEnListoActual;
          }
          
          // Remover de cola de listos
          const index = this.state.colaListos.indexOf(procesoSeleccionado.name);
          if (index !== -1) {
            this.state.colaListos.splice(index, 1);
          }
          
          // Listo → Corriendo (siempre consume TCP según consigna)
          procesoSeleccionado.estado = 'Corriendo';
          this.state.procesoEjecutando = procesoSeleccionado.name;
          
          // Guardar momento de inicio de la ráfaga para cálculos de expropiación
          procesoSeleccionado.tiempoInicioRafaga = this.state.tiempoActual;
          
          agregarEventoInterno(this.state, 'Despacho', procesoSeleccionado.name, 
            `Inicio ejecución: restanteEnRafaga=${procesoSeleccionado.restanteEnRafaga}`);
          
          // Aplicar TCP en TODOS los despachos (transición Listo → Corriendo)
          // Esto incluye: primer despacho, re-despachos, y cambios de contexto
          this.state.contadoresCPU.sistemaOperativo += this.state.tcp;
          
          // Si hay costo acumulado de transiciones Bloqueado→Listo instantáneas, se incluye aquí
          if (this.state.costoBloqueadoListoPendiente > 0) {
            this.state.contadoresCPU.sistemaOperativo += this.state.costoBloqueadoListoPendiente;
            agregarEventoExportacion(this.state, 'CAMBIO_CONTEXTO', procesoSeleccionado.name, 
              `TCP consumido: ${this.state.tcp} + Costo Bloqueado→Listo: ${this.state.costoBloqueadoListoPendiente}`);
            this.state.costoBloqueadoListoPendiente = 0;
          } else {
            agregarEventoExportacion(this.state, 'CAMBIO_CONTEXTO', procesoSeleccionado.name, `TCP consumido: ${this.state.tcp}`);
          }
          
          agregarEventoInterno(this.state, 'Despacho', procesoSeleccionado.name);
          agregarEventoExportacion(this.state, 'DESPACHO', procesoSeleccionado.name);
          // Programar fin de ráfaga o quantum
          if (this.state.policy === 'RR' && this.state.quantum) {
            const quantumFin = this.state.tiempoActual + this.state.quantum;
            colaEventos.agregar({ tiempo: quantumFin, tipo: 'AgotamientoQuantum', proceso: procesoSeleccionado.name });
          }
          const rafagaFin = this.state.tiempoActual + procesoSeleccionado.restanteEnRafaga;
          // Programar fin de ráfaga con información de si es la última
          const esUltimaRafaga = procesoSeleccionado.rafagasRestantes <= 1;
          colaEventos.agregar({ 
            tiempo: rafagaFin, 
            tipo: 'FinRafagaCPU', 
            proceso: procesoSeleccionado.name 
          }, esUltimaRafaga);
          break;
        }
        case 'FinRafagaCPU':
          // Corriendo → (Bloqueado | Terminado)
          // VALIDAR: Solo procesar si el proceso está realmente corriendo
          if (proceso.estado !== 'Corriendo') {
            // Proceso fue expropiado, ignorar este evento obsoleto
            agregarEventoInterno(this.state, 'FinRafagaCPU', proceso.name, 
              'Evento obsoleto ignorado - proceso fue expropiado');
            break;
          }
          
          proceso.rafagasRestantes--;
          proceso.restanteEnRafaga = proceso.duracionRafagaCPU;
          
          if (proceso.rafagasRestantes > 0) {
            // Bloqueado (E/S)
            proceso.estado = 'Bloqueado';
            this.state.procesoEjecutando = undefined; // CRÍTICO: liberar CPU
            this.state.colaBloqueados.push(proceso.name);
            
            agregarEventoInterno(this.state, 'FinRafagaCPU', proceso.name, 'Ráfaga completada - proceso a E/S');
            agregarEventoExportacion(this.state, 'FIN_RAFAGA_CPU', proceso.name, 'Proceso pasa a E/S');
            
            // Programar fin de E/S (instantáneo según consigna)
            colaEventos.agregar({ tiempo: this.state.tiempoActual, tipo: 'FinES', proceso: proceso.name });
            
            // CRÍTICO: Si hay procesos en cola de listos, programar despacho del siguiente
            if (this.state.colaListos.length > 0) {
              const siguienteProceso = this.state.colaListos[0];
              colaEventos.agregar({ tiempo: this.state.tiempoActual, tipo: 'Despacho', proceso: siguienteProceso });
            }
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
          
          // CRÍTICO: Remover de cola de bloqueados
          const indexBloqueado = this.state.colaBloqueados.indexOf(proceso.name);
          if (indexBloqueado !== -1) {
            this.state.colaBloqueados.splice(indexBloqueado, 1);
          }
          
          // Actualizar tiempo en listo - empieza a contar desde este momento
          proceso.ultimoTiempoEnListo = this.state.tiempoActual;
          
          // Agregar a cola de listos si no está ya
          if (!this.state.colaListos.includes(proceso.name)) {
            this.state.colaListos.push(proceso.name);
          }
          
          // Registrar evento sin consumir tiempo
          agregarEventoInterno(this.state, 'FinES', proceso.name, 'Fin E/S - Bloqueado a Listo instantáneo');
          agregarEventoExportacion(this.state, 'FIN_ES', proceso.name, 'Proceso listo para continuar');
          
          // Acumular costo de transición Bloqueado→Listo para el próximo TCP
          // Según consigna: "este tiempo lo consideramos dentro del TCP posterior"
          this.state.costoBloqueadoListoPendiente += this.state.tcp;
          
          // CRÍTICO: Si no hay proceso ejecutando, programar despacho inmediato
          if (!this.state.procesoEjecutando && this.state.colaListos.length > 0) {
            const siguienteProceso = this.state.colaListos[0];
            colaEventos.agregar({ tiempo: this.state.tiempoActual, tipo: 'Despacho', proceso: siguienteProceso });
          }
          
          // Si hay política con expropiación (PRIORITY, SRTN), verificar si debe expropiar
          if (this.state.policy === 'PRIORITY' || this.state.policy === 'SRTN') {
            this.verificarExpropiacion(colaEventos);
          }
          break;
        case 'AgotamientoQuantum':
          // Corriendo → Listo (RR) - Agotamiento de quantum
          if (proceso.estado === 'Corriendo' && this.state.policy === 'RR') {
            
            // CRÍTICO: Calcular tiempo ejecutado y actualizar remanente de ráfaga
            if (proceso.tiempoInicioRafaga !== undefined) {
              const tiempoEjecutado = this.state.tiempoActual - proceso.tiempoInicioRafaga;
              proceso.restanteEnRafaga = Math.max(0, proceso.restanteEnRafaga - tiempoEjecutado);
              
              agregarEventoInterno(this.state, 'AgotamientoQuantum', proceso.name, 
                `Quantum agotado: ejecutó ${tiempoEjecutado}, le restan ${proceso.restanteEnRafaga} de ráfaga`);
            } else {
              agregarEventoInterno(this.state, 'AgotamientoQuantum', proceso.name, 'Quantum agotado - proceso pasa a Listo');
            }
            
            proceso.estado = 'Listo';
            this.state.procesoEjecutando = undefined;
            
            // **MARCAS TEMPORALES** - iniciar conteo de tiempo en listo
            proceso.ultimoTiempoEnListo = this.state.tiempoActual;
            
            // Agregar a cola de listos (al final para rotación circular)
            if (!this.state.colaListos.includes(proceso.name)) {
              this.state.colaListos.push(proceso.name);
            }
            
            // Aplicar TCP por transición Corriendo → Listo
            this.state.contadoresCPU.sistemaOperativo += this.state.tcp;
            
            agregarEventoExportacion(this.state, 'AGOTAMIENTO_QUANTUM', proceso.name, `TCP consumido: ${this.state.tcp} - Proceso reasignado`);
            
            // CASO ESPECIAL: Aunque sea el único proceso, debe reasignarse (aplicar TCP)
            // Programar despacho inmediato para el siguiente en cola
            if (this.state.colaListos.length > 0) {
              const siguienteProceso = this.state.colaListos[0]; // Primer proceso en cola (rotación)
              colaEventos.agregar({ tiempo: this.state.tiempoActual, tipo: 'Despacho', proceso: siguienteProceso });
            }
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
          const tiempoRestanteActual = actual!.restanteEnRafaga + (actual!.rafagasRestantes - 1) * actual!.duracionRafagaCPU;
          const menorRestante = candidatos.reduce((min, p) => {
            const tiempoRestanteP = p!.restanteEnRafaga + (p!.rafagasRestantes - 1) * p!.duracionRafagaCPU;
            const tiempoRestanteMin = min!.restanteEnRafaga + (min!.rafagasRestantes - 1) * min!.duracionRafagaCPU;
            return tiempoRestanteP < tiempoRestanteMin ? p : min;
          }, actual);
          
          if (menorRestante && menorRestante !== actual) {
            const tiempoRestanteMenor = menorRestante.restanteEnRafaga + (menorRestante.rafagasRestantes - 1) * menorRestante.duracionRafagaCPU;
            if (tiempoRestanteMenor < tiempoRestanteActual) {
              debeExpropiar = true;
              nuevoProceso = menorRestante;
            }
          }
        }
        if (debeExpropiar && nuevoProceso) {
          // Expropiar: el proceso actual pasa a listo, el nuevo toma la CPU
          
          // CRÍTICO: Calcular tiempo ejecutado y actualizar remanente de ráfaga
          if (actual!.tiempoInicioRafaga !== undefined) {
            const tiempoEjecutado = this.state.tiempoActual - actual!.tiempoInicioRafaga;
            actual!.restanteEnRafaga = Math.max(0, actual!.restanteEnRafaga - tiempoEjecutado);
            
            agregarEventoInterno(this.state, 'Despacho', nuevoProceso.name, 
              `Expropiación: ${actual!.name} ejecutó ${tiempoEjecutado}, le restan ${actual!.restanteEnRafaga} de ráfaga`);
          }
          
          actual!.estado = 'Listo';
          this.state.colaListos.push(actual!.name);
          this.state.procesoEjecutando = undefined;
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
    console.log(`🏁 Simulación por eventos completada en tiempo ${this.state.tiempoActual}`);
  }

  /**
   * Selecciona el siguiente proceso a despachar usando el scheduler configurado
   */
  private seleccionarProceso(): ProcesoRT | undefined {
    if (this.state.colaListos.length === 0) {
      return undefined;
    }

    const nombreProcesoSeleccionado = this.scheduler.seleccionarProximoProceso(
      this.state.colaListos,
      this.state.procesoEjecutando,
      (name: string) => this.state.procesos.get(name)!
    );

    return nombreProcesoSeleccionado ? this.state.procesos.get(nombreProcesoSeleccionado) : undefined;
  }

  /**
   * Verifica si quedan procesos pendientes de terminar
   */
  private hayProcesosPendientes(): boolean {
    return Array.from(this.state.procesos.values()).some(p => p.estado !== 'Terminado');
  }

  /**
   * Verifica si debe ocurrir una expropiación usando el scheduler configurado
   */
  private verificarExpropiacion(colaEventos: any): void {
    if (!this.state.procesoEjecutando || this.state.colaListos.length === 0) {
      return;
    }

    // Solo verificar expropiación si el scheduler es expropiativo
    if (!this.scheduler.esExpropiativo) {
      return;
    }

    const debeExpropiar = this.scheduler.debeExpropiar(
      this.state.procesoEjecutando,
      this.state.colaListos,
      (name: string) => this.state.procesos.get(name)!
    );

    if (debeExpropiar) {
      const actual = this.state.procesos.get(this.state.procesoEjecutando)!;
      
      // CRÍTICO: Calcular tiempo ejecutado y actualizar remanente de ráfaga
      if (actual.tiempoInicioRafaga !== undefined) {
        const tiempoEjecutado = this.state.tiempoActual - actual.tiempoInicioRafaga;
        actual.restanteEnRafaga = Math.max(0, actual.restanteEnRafaga - tiempoEjecutado);
        
        agregarEventoInterno(this.state, 'Despacho', '', 
          `Expropiación: ${actual.name} ejecutó ${tiempoEjecutado}, le restan ${actual.restanteEnRafaga} de ráfaga`);
      }
      
      // Mover proceso actual a listo
      actual.estado = 'Listo';
      actual.ultimoTiempoEnListo = this.state.tiempoActual;
      this.state.colaListos.push(actual.name);
      this.state.procesoEjecutando = undefined;
      
      // Seleccionar nuevo proceso (será el que debe expropiar)
      const nuevoProceso = this.seleccionarProceso();
      if (nuevoProceso) {
        // Remover el nuevo proceso de la cola de listos
        this.state.colaListos = this.state.colaListos.filter(n => n !== nuevoProceso.name);
        
        // Registrar expropiación
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

  /**
   * Ejecuta la simulación y exporta automáticamente los eventos a archivos
   */
  async ejecutarYExportar(nombreArchivo?: string, carpetaDestino?: string): Promise<{
    resultado: ResultadoSimulacion;
    archivos: { archivoJSON: string; archivoCSV: string };
    gantt: any; // Diagrama de Gantt construido
    archivosGantt?: { archivoJSON: string; archivoSVG: string; archivoASCII: string };
  }> {
    const { combinarEventos, exportarEventosAArchivos } = await import('../infrastructure/io/eventLogger.js');
    const { construirGanttDesdeEventos } = await import('../infrastructure/io/ganttBuilder.js');
    const { exportarGanttAArchivos } = await import('../infrastructure/io/ganttExporter.js');
    
    // Ejecutar simulación
    const resultado = this.ejecutar();
    
    // Combinar eventos
    const eventos = combinarEventos(resultado.eventosInternos, resultado.eventosExportacion);
    
    // Construir diagrama de Gantt
    const gantt = construirGanttDesdeEventos(eventos);
    
    // Generar nombre de archivo automático si no se proporciona
    const nombre = nombreArchivo || `simulacion-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}`;
    const carpeta = carpetaDestino || './resultados';
    
    // Exportar archivos de eventos
    const archivos = await exportarEventosAArchivos(eventos, nombre, carpeta);
    
    // Exportar archivos de Gantt
    let archivosGantt;
    try {
      const algoritmo = this.state.policy;
      archivosGantt = await exportarGanttAArchivos(gantt, nombre, carpeta, algoritmo);
    } catch (error) {
      console.warn('⚠️ No se pudieron exportar archivos de Gantt:', error);
    }
    
    return { resultado, archivos, gantt, archivosGantt };
  }
}
