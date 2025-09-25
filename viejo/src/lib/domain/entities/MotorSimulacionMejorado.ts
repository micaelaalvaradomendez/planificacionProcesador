/**
 * Motor de Simulación Mejorado - Implementa diagrama estadomejorado.puml
 * =====================================================================
 * 
 * Características principales:
 * - Orden estricto de eventos simultáneos (1-6)
 * - Estado CPU_IDLE explícito
 * - Validaciones académicamente correctas
 * - TCP solo en DISPATCH y EXPROPIACIÓN
 * - TIP/TFP en lugares correctos únicamente
 */

import type { Proceso } from './Proceso';
import type { ParametrosSimulacion } from '../types';
import { TipoEvento, EstadoProceso } from '../types';
import { Evento } from '../events/gantt.types';
import { PriorityQueue } from '../utils';
import type { EstrategiaScheduler } from '../algorithms/Scheduler';

/**
 * Enum para tipos de eventos internos con prioridad de procesamiento
 */
enum TipoEventoMejorado {
  // Orden de procesamiento para eventos simultáneos (CRÍTICO)
  FIN_PROCESO = 1,           // C→T (FIN_PROCESO)  
  FIN_RAFAGA_CPU = 2,        // C→B (FIN_RAFAGA_CPU → I/O)  
  EXPROPIACION = 3,          // C→L (EXPROPIACIÓN)
  FIN_IO = 4,                // B→L (FIN_IO)
  FIN_TIP = 5,               // N→L (FIN_TIP)
  DISPATCH = 6,              // L→C (DISPATCH)
  
  // Eventos de sistema
  JOB_LLEGA = 0,             // Llegada al sistema
  QUANTUM_EXPIRES = 3        // Tratado como expropiación
}

/**
 * Evento mejorado con prioridad para orden correcto
 */
class EventoMejorado extends Evento {
  public readonly prioridad: number;
  
  constructor(tiempo: number, tipo: TipoEvento, idProceso: string, descripcion?: string) {
    super(tiempo, tipo, idProceso, descripcion);
    this.prioridad = this.obtenerPrioridad(tipo);
  }
  
  private obtenerPrioridad(tipo: TipoEvento): number {
    switch (tipo) {
      case TipoEvento.CORRIENDO_A_TERMINADO: return TipoEventoMejorado.FIN_PROCESO;
      case TipoEvento.FIN_RAFAGA_CPU: return TipoEventoMejorado.FIN_RAFAGA_CPU;
      case TipoEvento.QUANTUM_EXPIRES:
      case TipoEvento.CORRIENDO_A_LISTO: return TipoEventoMejorado.EXPROPIACION;
      case TipoEvento.BLOQUEADO_A_LISTO: return TipoEventoMejorado.FIN_IO;
      case TipoEvento.NUEVO_A_LISTO: return TipoEventoMejorado.FIN_TIP;
      case TipoEvento.DISPATCH:
      case TipoEvento.LISTO_A_CORRIENDO: return TipoEventoMejorado.DISPATCH;
      case TipoEvento.JOB_LLEGA: return TipoEventoMejorado.JOB_LLEGA;
      // Eventos de suspensión
      case TipoEvento.LISTO_A_LISTO_SUSPENDIDO:
      case TipoEvento.BLOQUEADO_A_BLOQUEADO_SUSPENDIDO:
      case TipoEvento.LISTO_SUSPENDIDO_A_LISTO:
      case TipoEvento.BLOQUEADO_SUSPENDIDO_A_BLOQUEADO: return 10; // Prioridad media
      default: return 99; // Baja prioridad para eventos no críticos
    }
  }
  
  /**
   * Comparador que implementa orden correcto de eventos simultáneos
   */
  compare(otro: Evento): number {
    // Primero por tiempo
    if (this.tiempo !== otro.tiempo) {
      return this.tiempo - otro.tiempo;
    }
    
    // En caso de empate, por prioridad si ambos son EventoMejorado
    if (otro instanceof EventoMejorado) {
      return this.prioridad - otro.prioridad;
    }
    
    // Si el otro no es EventoMejorado, usar orden por defecto
    return 0;
  }
}

/**
 * Estados extendidos del sistema (incluye suspendidos según punto 4)
 */
interface EstadoSistema {
  cpuActiva: boolean;        // true si hay proceso ejecutando
  cpuIdle: boolean;          // true si CPU ociosa (ReadyQueue vacía)
  procesoEnCPU?: Proceso;
  tiempoInicioIdle?: number; // Para calcular tiempo ocioso
  
  // Estados suspendidos (punto 4)
  memoriaDisponible: number; // Para decidir suspensiones
  umbralSuspension: number;  // Límite para suspender procesos
}

/**
 * Colas especializadas por política (punto 3)
 */
interface ColasEspecializadas {
  ready: Proceso[];           // Cola principal de listos
  readySuspended: Proceso[];  // Listos suspendidos (sin memoria)
  blocked: Proceso[];         // Bloqueados por I/O
  blockedSuspended: Proceso[]; // Bloqueados suspendidos
}

/**
 * Motor de simulación que implementa el diagrama estadomejorado.puml
 */
export class MotorSimulacionMejorado {
  public tiempoActual: number = 0;
  public readyQueue: Proceso[] = [];
  public procesosBloqueados: Proceso[] = [];
  public procesosTerminados: Proceso[] = [];
  public todosLosProcesos: Map<string, Proceso> = new Map();
  public colaEventos: PriorityQueue<EventoMejorado>;
  public registroEventos: EventoMejorado[] = [];
  
  // Estado del sistema
  private estadoSistema: EstadoSistema;
  
  // Métricas del sistema
  public tiempoTotalInactivo: number = 0;
  public tiempoTotalSO: number = 0; // TIP + TFP + TCP
  public tiempoTotalUsuario: number = 0;
  
  // Estrategia de planificación
  private estrategia: EstrategiaScheduler;

  constructor(
    public readonly parametros: ParametrosSimulacion,
    estrategia: EstrategiaScheduler
  ) {
    this.colaEventos = new PriorityQueue<EventoMejorado>((a, b) => {
      // Comparación específica para EventoMejorado
      if (a.tiempo !== b.tiempo) {
        return a.tiempo - b.tiempo;
      }
      return a.prioridad - b.prioridad;
    });
    this.estrategia = estrategia;
    this.estadoSistema = {
      cpuActiva: false,
      cpuIdle: false,
      memoriaDisponible: 1000, // MB por defecto
      umbralSuspension: 100    // MB mínimo para evitar suspensión
    };
  }

  /**
   * Agrega proceso al sistema y programa su evento de llegada
   */
  agregarProceso(proceso: Proceso): void {
    this.todosLosProcesos.set(proceso.id, proceso);
    this.programarEvento(proceso.arribo, TipoEvento.JOB_LLEGA, proceso.id);
  }

  /**
   * Programa un evento en la cola con prioridad correcta
   */
  programarEvento(tiempo: number, tipo: TipoEvento, idProceso: string, descripcion?: string): void {
    const evento = new EventoMejorado(tiempo, tipo, idProceso, descripcion);
    this.colaEventos.enqueue(evento);
  }

  /**
   * Avanza el tiempo del sistema con control de estado idle
   */
  avanzarTiempo(nuevoTiempo: number): void {
    if (nuevoTiempo < this.tiempoActual) {
      throw new Error(`No se puede retroceder en el tiempo: ${nuevoTiempo} < ${this.tiempoActual}`);
    }
    
    // Si CPU estaba idle, acumular tiempo ocioso
    if (this.estadoSistema.cpuIdle && this.estadoSistema.tiempoInicioIdle !== undefined) {
      const tiempoOcioso = nuevoTiempo - this.estadoSistema.tiempoInicioIdle;
      this.tiempoTotalInactivo += tiempoOcioso;
    }
    
    this.tiempoActual = nuevoTiempo;
  }

  /**
   * Procesa el siguiente evento con orden correcto
   */
  procesarSiguienteEvento(): EventoMejorado | undefined {
    const evento = this.colaEventos.dequeue();
    if (!evento) return undefined;
    
    this.avanzarTiempo(evento.tiempo);
    this.registroEventos.push(evento);
    
    // Procesar evento según tipo
    this.procesarEvento(evento);
    
    return evento;
  }

  /**
   * Procesa un evento según su tipo (NÚCLEO DEL MOTOR)
   */
  private procesarEvento(evento: EventoMejorado): void {
    const proceso = this.obtenerProceso(evento.idProceso);
    if (!proceso && evento.tipo !== TipoEvento.JOB_LLEGA) {
      throw new Error(`Proceso no encontrado: ${evento.idProceso}`);
    }

    switch (evento.tipo) {
      case TipoEvento.JOB_LLEGA:
        this.procesarLlegadaProceso(evento);
        break;
        
      case TipoEvento.NUEVO_A_LISTO:
        this.procesarFinTIP(evento, proceso!);
        break;
        
      case TipoEvento.DISPATCH:
      case TipoEvento.LISTO_A_CORRIENDO:
        this.procesarDispatch(evento, proceso!);
        break;
        
      case TipoEvento.FIN_RAFAGA_CPU:
        this.procesarFinRafagaCPU(evento, proceso!);
        break;
        
      case TipoEvento.BLOQUEADO_A_LISTO:
        this.procesarFinIO(evento, proceso!);
        break;
        
      case TipoEvento.QUANTUM_EXPIRES:
      case TipoEvento.CORRIENDO_A_LISTO:
        this.procesarExpropiacion(evento, proceso!);
        break;
        
      case TipoEvento.CORRIENDO_A_TERMINADO:
        this.procesarFinProceso(evento, proceso!);
        break;
        
      default:
        console.warn(`Tipo de evento no manejado: ${evento.tipo}`);
    }
    
    // Después de cada evento, verificar si CPU debe pasar a IDLE
    this.verificarEstadoCPU();
  }

  /**
   * TRANSICIÓN: Sistema → NUEVO (Llegada de proceso)
   */
  private procesarLlegadaProceso(evento: EventoMejorado): void {
    const proceso = this.obtenerProceso(evento.idProceso);
    if (!proceso) {
      throw new Error(`Proceso no encontrado en llegada: ${evento.idProceso}`);
    }
    
    // Verificar si hay suficiente memoria antes de iniciar TIP
    if (!this.haySuficienteMemoria(proceso.tamaño)) {
      // No hay memoria suficiente - suspender procesos existentes
      this.suspenderProcesosPorMemoria();
    }
    
    // Iniciar TIP (Tiempo Ingreso Proceso)
    proceso.iniciarTIP(this.tiempoActual);
    
    // Programar fin de TIP (ÚNICO LUGAR DONDE SE COBRA TIP)
    const tiempoFinTIP = this.tiempoActual + this.parametros.TIP;
    this.programarEvento(tiempoFinTIP, TipoEvento.NUEVO_A_LISTO, proceso.id, `TIP=${this.parametros.TIP}`);
    
    // Contabilizar tiempo SO
    this.tiempoTotalSO += this.parametros.TIP;
  }

  /**
   * TRANSICIÓN: NUEVO → LISTO (Fin TIP)
   * REGLA: INSTANTÁNEO (Δt=0), NO hay TCP
   */
  private procesarFinTIP(evento: EventoMejorado, proceso: Proceso): void {
    // Validar transición
    if (proceso.estado !== EstadoProceso.NUEVO) {
      throw new Error(`Transición inválida N→L: proceso ${proceso.id} está en estado ${proceso.estado}`);
    }
    
    // Verificar si hay memoria suficiente para activar el proceso
    if (this.haySuficienteMemoria(proceso.tamaño)) {
      // Finalizar TIP y cambiar a LISTO
      proceso.finalizarTIP(this.tiempoActual);
      this.readyQueue.push(proceso);
      this.estadoSistema.memoriaDisponible -= proceso.tamaño;
      
      // Notificar a la estrategia
      this.estrategia.alVolverseListoProceso(proceso, this.tiempoActual);
      
      // Intentar activar otros procesos suspendidos
      this.activarProcesosSuspendidos();
      
      // Evaluar si hay que hacer dispatch inmediato
      this.evaluarDispatch();
    } else {
      // No hay memoria - proceso va directo a suspendido
      proceso.estado = EstadoProceso.LISTO_SUSPENDIDO;
      proceso.finalizarTIP(this.tiempoActual);
      
      // Registrar evento de suspensión
      this.registroEventos.push(new EventoMejorado(
        this.tiempoActual,
        TipoEvento.LISTO_A_LISTO_SUSPENDIDO,
        proceso.id,
        `Proceso suspendido inmediatamente - sin memoria`
      ));
    }
  }

  /**
   * TRANSICIÓN: LISTO → CORRIENDO (Dispatch)
   * REGLA: TCP ya está incluido en el tiempo del evento
   */
  private procesarDispatch(evento: EventoMejorado, proceso: Proceso): void {
    
    // Validar transición
    if (proceso.estado !== EstadoProceso.LISTO) {
      throw new Error(`Transición inválida L→C: proceso ${proceso.id} está en estado ${proceso.estado}`);
    }
    
    if (this.estadoSistema.procesoEnCPU) {
      throw new Error(`CPU ocupada: no se puede hacer dispatch de ${proceso.id} (ocupada por ${this.estadoSistema.procesoEnCPU.id})`);
    }
    
    // NOTA: TCP ya se cobró al programar este evento
    this.tiempoTotalSO += this.parametros.TCP;
    
    // Remover de ready queue y asignar a CPU
    this.removerDeReadyQueue(proceso.id);
    proceso.activar(this.tiempoActual);
    this.estadoSistema.procesoEnCPU = proceso;
    this.estadoSistema.cpuActiva = true;
    this.estadoSistema.cpuIdle = false;
    
    // Programar fin de ráfaga
    const tiempoFinRafaga = this.tiempoActual + proceso.restanteCPU;
    this.programarEvento(tiempoFinRafaga, TipoEvento.FIN_RAFAGA_CPU, proceso.id, 
                        `restante=${proceso.restanteCPU}`);
    
    // Para RR: programar quantum
    if (this.estrategia.requiereQuantum && this.parametros.quantum) {
      const tiempoQuantum = this.tiempoActual + this.parametros.quantum;
      this.programarEvento(tiempoQuantum, TipoEvento.QUANTUM_EXPIRES, proceso.id, 
                          `quantum=${this.parametros.quantum}`);
    }
    
    // Contabilizar tiempo de usuario
    this.tiempoTotalUsuario += proceso.restanteCPU;
  }

  /**
   * TRANSICIÓN: CORRIENDO → BLOQUEADO (Fin ráfaga CPU)
   * REGLA: INSTANTÁNEO (Δt=0), NO hay TCP
   */
  private procesarFinRafagaCPU(evento: EventoMejorado, proceso: Proceso): void {
    // Validar transición
    if (proceso.estado !== EstadoProceso.CORRIENDO) {
      throw new Error(`Transición inválida C→B: proceso ${proceso.id} está en estado ${proceso.estado}`);
    }
    
    if (this.estadoSistema.procesoEnCPU?.id !== proceso.id) {
      throw new Error(`Proceso ${proceso.id} no está en CPU`);
    }
    
    // Completar ráfaga CPU
    proceso.completarCPU(this.tiempoActual);
    
    // Liberar CPU
    this.estadoSistema.procesoEnCPU = undefined;
    this.estadoSistema.cpuActiva = false;
    
    if (proceso.estaCompleto()) {
      // TRANSICIÓN: CORRIENDO → TERMINADO
      this.procesarTransicionATerminado(proceso);
    } else {
      // TRANSICIÓN: CORRIENDO → BLOQUEADO  
      this.procesosBloqueados.push(proceso);
      
      // Programar fin de I/O
      const tiempoFinIO = this.tiempoActual + proceso.duracionIO;
      this.programarEvento(tiempoFinIO, TipoEvento.BLOQUEADO_A_LISTO, proceso.id, 
                          `IO=${proceso.duracionIO}`);
    }
    
    // Evaluar próximo dispatch
    this.evaluarDispatch();
  }

  /**
   * TRANSICIÓN: BLOQUEADO → LISTO (Fin I/O)
   * REGLA: INSTANTÁNEO (Δt=0), NO hay TCP
   */
  private procesarFinIO(evento: EventoMejorado, proceso: Proceso): void {
    // Validar transición
    if (proceso.estado !== EstadoProceso.BLOQUEADO) {
      throw new Error(`Transición inválida B→L: proceso ${proceso.id} está en estado ${proceso.estado}`);
    }
    
    // Verificar si hay memoria suficiente para activar el proceso
    if (this.haySuficienteMemoria(proceso.tamaño)) {
      // Completar I/O y mover a READY
      proceso.completarIO(this.tiempoActual);
      this.removerDeListaBloqueados(proceso.id);
      this.readyQueue.push(proceso);
      
      // Notificar a la estrategia
      this.estrategia.alVolverseListoProceso(proceso, this.tiempoActual);
      
      // Intentar activar otros procesos suspendidos
      this.activarProcesosSuspendidos();
      
      // Evaluar expropiación (SRTF, Priority)
      if (this.estrategia.soportaExpropiacion && this.estadoSistema.procesoEnCPU) {
        const procesoActual = this.estadoSistema.procesoEnCPU;
        if (this.estrategia.debeExpropiar && 
            this.estrategia.debeExpropiar(procesoActual, proceso, this.tiempoActual)) {
          this.programarEvento(this.tiempoActual, TipoEvento.CORRIENDO_A_LISTO, procesoActual.id, 
                              'expropiacion_por_nueva_llegada');
        }
      }
      
      // Evaluar dispatch si CPU libre
      this.evaluarDispatch();
    } else {
      // No hay memoria - proceso va a bloqueado suspendido
      proceso.estado = EstadoProceso.BLOQUEADO_SUSPENDIDO;
      proceso.completarIO(this.tiempoActual);
      this.removerDeListaBloqueados(proceso.id);
      
      // Registrar evento de suspensión
      this.registroEventos.push(new EventoMejorado(
        this.tiempoActual,
        TipoEvento.BLOQUEADO_A_BLOQUEADO_SUSPENDIDO,
        proceso.id,
        `Proceso suspendido tras I/O - sin memoria`
      ));
    }
  }

  /**
   * TRANSICIÓN: CORRIENDO → LISTO (Expropiación)
   * REGLA: SE COBRA TCP (cambio de contexto)
   */
  private procesarExpropiacion(evento: EventoMejorado, proceso: Proceso): void {
    // Validar transición
    if (proceso.estado !== EstadoProceso.CORRIENDO) {
      throw new Error(`Transición inválida C→L: proceso ${proceso.id} está en estado ${proceso.estado}`);
    }
    
    if (this.estadoSistema.procesoEnCPU?.id !== proceso.id) {
      throw new Error(`Proceso ${proceso.id} no está en CPU para expropiar`);
    }
    
    // Procesar tiempo transcurrido en CPU
    const tiempoEjecutado = this.tiempoActual - (proceso.ultimoDispatch || this.tiempoActual);
    proceso.procesarCPU(tiempoEjecutado);
    
    // Expropiar proceso
    proceso.expropiar(this.tiempoActual);
    this.readyQueue.push(proceso);
    
    // Liberar CPU
    this.estadoSistema.procesoEnCPU = undefined;
    this.estadoSistema.cpuActiva = false;
    
    // COBRAR TCP POR EXPROPIACIÓN (solo contabilizar, no modificar tiempo)
    this.tiempoTotalSO += this.parametros.TCP;
    
    // Evaluar próximo dispatch
    this.evaluarDispatch();
  }

  /**
   * TRANSICIÓN: CORRIENDO → TERMINADO (Fin proceso)
   */
  private procesarFinProceso(evento: EventoMejorado, proceso: Proceso): void {
    // Validar transición
    if (proceso.estado !== EstadoProceso.TERMINADO) {
      throw new Error(`Proceso ${proceso.id} no está terminado`);
    }
    
    // COBRAR TFP (solo contabilizar, no modificar tiempo del evento)
    this.tiempoTotalSO += this.parametros.TFP;
    
    // Finalizar proceso
    proceso.terminar(this.tiempoActual);
    this.procesosTerminados.push(proceso);
    
    // Liberar memoria del proceso terminado
    this.estadoSistema.memoriaDisponible += proceso.tamaño;
    
    // Liberar CPU si era el proceso actual
    if (this.estadoSistema.procesoEnCPU?.id === proceso.id) {
      this.estadoSistema.procesoEnCPU = undefined;
      this.estadoSistema.cpuActiva = false;
    }
    
    // Intentar activar procesos suspendidos con la memoria liberada
    this.activarProcesosSuspendidos();
    
    // Evaluar próximo dispatch
    this.evaluarDispatch();
  }

  /**
   * Transición auxiliar para manejo de terminación
   * CRÍTICO: Programa TFP en tiempoActual + TFP
   */
  private procesarTransicionATerminado(proceso: Proceso): void {
    // Programar TFP con tiempo incluido
    const tiempoTFP = this.tiempoActual + this.parametros.TFP;
    this.programarEvento(tiempoTFP, TipoEvento.CORRIENDO_A_TERMINADO, proceso.id, 
                        `TFP=${this.parametros.TFP}`);
  }

  /**
   * Evalúa si se debe hacer dispatch y programa evento
   * CRÍTICO: Programa el dispatch en tiempoActual + TCP
   * Evita dispatches duplicados
   */
  private evaluarDispatch(): void {
    // No hacer dispatch si CPU activa o ready queue vacía
    if (this.estadoSistema.cpuActiva || this.readyQueue.length === 0) {
      return;
    }
    
    // Verificar si ya hay un dispatch programado para el tiempo actual
    const dispatchPendiente = this.colaEventos.toArray().some((evento: EventoMejorado) => 
      evento.tipo === TipoEvento.DISPATCH && evento.tiempo >= this.tiempoActual
    );
    
    if (dispatchPendiente) {
      return;
    }
    
    // Seleccionar próximo proceso según estrategia
    const procesoSeleccionado = this.estrategia.elegirSiguiente(this.readyQueue, this.tiempoActual);
    
    if (procesoSeleccionado) {
      // IMPORTANTE: Programar dispatch con TCP incluido
      const tiempoDispatch = this.tiempoActual + this.parametros.TCP;
      this.programarEvento(tiempoDispatch, TipoEvento.DISPATCH, procesoSeleccionado.id, 
                          `TCP=${this.parametros.TCP}`);
    }
  }

  /**
   * Verifica y actualiza el estado de la CPU (IDLE management)
   */
  private verificarEstadoCPU(): void {
    const cpuDeberiaEstarIdle = !this.estadoSistema.cpuActiva && this.readyQueue.length === 0;
    
    if (cpuDeberiaEstarIdle && !this.estadoSistema.cpuIdle) {
      // CPU pasa a IDLE
      this.estadoSistema.cpuIdle = true;
      this.estadoSistema.tiempoInicioIdle = this.tiempoActual;
    } else if (!cpuDeberiaEstarIdle && this.estadoSistema.cpuIdle) {
      // CPU sale de IDLE
      if (this.estadoSistema.tiempoInicioIdle !== undefined) {
        const tiempoOcioso = this.tiempoActual - this.estadoSistema.tiempoInicioIdle;
        this.tiempoTotalInactivo += tiempoOcioso;
      }
      this.estadoSistema.cpuIdle = false;
      this.estadoSistema.tiempoInicioIdle = undefined;
    }
  }

  /**
   * Verifica si hay suficiente memoria para cargar un proceso
   */
  private haySuficienteMemoria(tamanoProceso: number): boolean {
    return this.estadoSistema.memoriaDisponible >= tamanoProceso + this.estadoSistema.umbralSuspension;
  }

  /**
   * Suspende procesos cuando hay poca memoria
   */
  private suspenderProcesosPorMemoria(): void {
    // Buscar procesos listos para suspender (FIFO - más antiguos primero)
    const procesosListos = this.readyQueue.filter((p: Proceso) => p.estado === EstadoProceso.LISTO);
    
    for (const proceso of procesosListos) {
      if (this.estadoSistema.memoriaDisponible >= this.estadoSistema.umbralSuspension) {
        break; // Ya hay suficiente memoria
      }
      
      // Suspender proceso
      proceso.estado = EstadoProceso.LISTO_SUSPENDIDO;
      this.estadoSistema.memoriaDisponible += proceso.tamaño;
      
      // Remover de readyQueue
      const indice = this.readyQueue.findIndex(p => p.id === proceso.id);
      if (indice >= 0) {
        this.readyQueue.splice(indice, 1);
      }
      
      // Registrar evento de suspensión
      this.registroEventos.push(new EventoMejorado(
        this.tiempoActual,
        TipoEvento.LISTO_A_LISTO_SUSPENDIDO,
        proceso.id,
        `Proceso suspendido por falta de memoria`
      ));
    }
  }

  /**
   * Intenta activar procesos suspendidos cuando hay memoria
   */
  private activarProcesosSuspendidos(): void {
    // Buscar procesos suspendidos en todas las colas
    const procesosListosSuspendidos = Array.from(this.todosLosProcesos.values())
      .filter((p: Proceso) => p.estado === EstadoProceso.LISTO_SUSPENDIDO);
    const procesosBloqueadosSuspendidos = Array.from(this.todosLosProcesos.values())
      .filter((p: Proceso) => p.estado === EstadoProceso.BLOQUEADO_SUSPENDIDO);
    
    // Intentar activar procesos listos suspendidos primero
    for (const proceso of procesosListosSuspendidos) {
      if (this.haySuficienteMemoria(proceso.tamaño)) {
        // Activar proceso
        this.estadoSistema.memoriaDisponible -= proceso.tamaño;
        proceso.estado = EstadoProceso.LISTO;
        this.readyQueue.push(proceso);
        
        // Registrar evento de activación
        this.registroEventos.push(new EventoMejorado(
          this.tiempoActual,
          TipoEvento.LISTO_SUSPENDIDO_A_LISTO,
          proceso.id,
          `Proceso activado - memoria disponible`
        ));
      }
    }
    
    // Intentar activar procesos bloqueados suspendidos
    for (const proceso of procesosBloqueadosSuspendidos) {
      if (this.haySuficienteMemoria(proceso.tamaño)) {
        // Activar proceso
        this.estadoSistema.memoriaDisponible -= proceso.tamaño;
        proceso.estado = EstadoProceso.BLOQUEADO;
        this.procesosBloqueados.push(proceso);
        
        // Registrar evento de activación
        this.registroEventos.push(new EventoMejorado(
          this.tiempoActual,
          TipoEvento.BLOQUEADO_SUSPENDIDO_A_BLOQUEADO,
          proceso.id,
          `Proceso bloqueado activado - memoria disponible`
        ));
      }
    }
  }

  // =======================================
  // MÉTODOS AUXILIARES
  // =======================================

  obtenerProceso(idProceso: string): Proceso | undefined {
    return this.todosLosProcesos.get(idProceso);
  }

  removerDeReadyQueue(idProceso: string): Proceso | undefined {
    const indice = this.readyQueue.findIndex(p => p.id === idProceso);
    if (indice !== -1) {
      return this.readyQueue.splice(indice, 1)[0];
    }
    return undefined;
  }

  removerDeListaBloqueados(idProceso: string): Proceso | undefined {
    const indice = this.procesosBloqueados.findIndex(p => p.id === idProceso);
    if (indice !== -1) {
      return this.procesosBloqueados.splice(indice, 1)[0];
    }
    return undefined;
  }

  todosProcesosTerminados(): boolean {
    return this.procesosTerminados.length === this.todosLosProcesos.size;
  }

  obtenerSiguienteEvento(): EventoMejorado | undefined {
    return this.colaEventos.peek();
  }

  /**
   * Ejecuta la simulación completa
   */
  ejecutarSimulacion(): void {
    let iteraciones = 0;
    const maxIteraciones = 10000; // Prevenir bucles infinitos
    
    while (!this.todosProcesosTerminados()) {
      const evento = this.procesarSiguienteEvento();
      
      if (!evento) {
        break; // No hay más eventos
      }
      
      if (++iteraciones > maxIteraciones) {
        throw new Error('Límite de iteraciones alcanzado - posible bucle infinito');
      }
    }
    
    // Finalizar tiempo ocioso si CPU terminó idle
    if (this.estadoSistema.cpuIdle && this.estadoSistema.tiempoInicioIdle !== undefined) {
      const tiempoOcioso = this.tiempoActual - this.estadoSistema.tiempoInicioIdle;
      this.tiempoTotalInactivo += tiempoOcioso;
    }
  }

  /**
   * Reinicia el motor para nueva simulación
   */
  reiniciar(): void {
    this.tiempoActual = 0;
    this.readyQueue = [];
    this.procesosBloqueados = [];
    this.procesosTerminados = [];
    this.todosLosProcesos.clear();
    this.colaEventos.clear();
    this.registroEventos = [];
    this.tiempoTotalInactivo = 0;
    this.tiempoTotalSO = 0;
    this.tiempoTotalUsuario = 0;
    
    this.estadoSistema = {
      cpuActiva: false,
      cpuIdle: false,
      memoriaDisponible: 1000, // MB por defecto
      umbralSuspension: 100    // MB mínimo para evitar suspensión
    };
    
    this.estrategia.reiniciar();
  }

  /**
   * Obtiene estadísticas de la simulación
   */
  obtenerEstadisticas(): {
    tiempoTotal: number;
    tiempoInactivo: number;
    tiempoSO: number;
    tiempoUsuario: number;
    utilizacionCPU: number;
    eventosProcessados: number;
  } {
    const tiempoTotal = this.tiempoActual || 1;
    
    return {
      tiempoTotal: this.tiempoActual,
      tiempoInactivo: this.tiempoTotalInactivo,
      tiempoSO: this.tiempoTotalSO,
      tiempoUsuario: this.tiempoTotalUsuario,
      utilizacionCPU: ((this.tiempoTotalUsuario + this.tiempoTotalSO) / tiempoTotal) * 100,
      eventosProcessados: this.registroEventos.length
    };
  }
}
