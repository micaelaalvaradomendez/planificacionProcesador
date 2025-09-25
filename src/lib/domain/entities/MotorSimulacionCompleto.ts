/**
 * Motor de Simulación Completo según Diagramas de Secuencia y Estado
 * Implementa el bucle principal con orden 1-6 y gestión completa de eventos
 */

import type { Proceso } from '../entities/Proceso';
import type { ParametrosSimulacion } from '../types';
import { TipoEvento, EstadoProceso } from '../types';
import { PriorityQueue } from '../utils';
import type { EstrategiaScheduler } from '../algorithms/Scheduler';
import { EventoMejorado } from '../helpers/EventoMejorado';
import { aplicarTIP, aplicarTCP, aplicarTFP } from '../helpers/CostosSO';

/**
 * Estados del sistema con gestión de memoria
 */
interface EstadoSistema {
  cpuActiva: boolean;        // true si hay proceso ejecutando
  cpuIdle: boolean;          // true si CPU ociosa
  procesoEnCPU?: Proceso;    // proceso actualmente en CPU
  tiempoInicioIdle?: number; // para calcular tiempo ocioso
  
  // Gestión de memoria
  memoriaDisponible: number; // memoria disponible en MB
  umbralSuspension: number;  // umbral para suspender procesos
  memoriaTotalSistema: number; // memoria total del sistema
}

/**
 * Logger integral para trazabilidad completa
 */
interface RegistroEvento {
  tiempo: number;
  evento: string;
  proceso: string;
  transicion: string;
  estadoAnterior?: EstadoProceso;
  estadoNuevo?: EstadoProceso;
  costoAplicado?: string;
  memoryInfo?: string;
}

/**
 * Motor de simulación que implementa completamente los diagramas
 */
export class MotorSimulacionCompleto {
  // Estado temporal
  public tiempoActual: number = 0;
  
  // Colas del sistema según diagramas
  public readyQueue: Proceso[] = [];           // Cola de listos (en memoria)
  public readySuspendedQueue: Proceso[] = [];  // Cola de listos suspendidos
  public blockedQueue: Proceso[] = [];         // Cola de bloqueados (en memoria)
  public blockedSuspendedQueue: Proceso[] = [];// Cola de bloqueados suspendidos
  public procesosTerminados: Proceso[] = [];   // Procesos terminados
  
  // Registro completo del sistema
  public todosLosProcesos: Map<string, Proceso> = new Map();
  public colaEventos: PriorityQueue<EventoMejorado>;
  public logger: RegistroEvento[] = [];
  
  // Estado del sistema
  private estadoSistema: EstadoSistema;
  
  // Métricas del sistema
  public tiempoTotalInactivo: number = 0;
  public tiempoTotalSO: number = 0; // TIP + TFP + TCP
  public tiempoTotalUsuario: number = 0;
  
  // Estrategia de planificación
  private estrategia: EstrategiaScheduler;
  
  // Timers activos (para cancelación en RR/SRTF)
  private timersActivos: Map<string, EventoMejorado> = new Map();

  constructor(
    public readonly parametros: ParametrosSimulacion,
    estrategia: EstrategiaScheduler
  ) {
    // Inicializar cola de eventos con comparador correcto
    this.colaEventos = new PriorityQueue<EventoMejorado>((a, b) => a.compare(b));
    this.estrategia = estrategia;
    
    // Estado inicial del sistema
    this.estadoSistema = {
      cpuActiva: false,
      cpuIdle: false,
      memoriaDisponible: 1000, // MB por defecto
      umbralSuspension: 100,   // MB mínimo para evitar suspensión
      memoriaTotalSistema: 1000
    };
    
    this.log('INIT', 'SISTEMA', 'Motor de simulación inicializado', undefined, undefined, undefined, `Memoria: ${this.estadoSistema.memoriaDisponible}MB`);
  }
  
  /**
   * Agregar proceso al sistema (programa evento de llegada)
   */
  agregarProceso(proceso: Proceso): void {
    this.todosLosProcesos.set(proceso.id, proceso);
    
    // Programar evento de llegada (JOB_LLEGA)
    const eventoLlegada = new EventoMejorado(
      proceso.arribo,
      TipoEvento.JOB_LLEGA,
      proceso.id,
      `Proceso ${proceso.id} llega al sistema`
    );
    
    this.colaEventos.enqueue(eventoLlegada);
    this.log('SCHEDULE', proceso.id, 'Evento JOB_LLEGA programado', undefined, undefined, undefined, `t=${proceso.arribo}`);
  }
  
  /**
   * BUCLE PRINCIPAL DE SIMULACIÓN
   * Implementa exactamente el diagrama de secuencia principal
   */
  ejecutarSimulacion(): void {
    this.log('START', 'SISTEMA', 'Iniciando simulación principal');
    
    // Loop principal: procesar todos los eventos
    while (!this.colaEventos.isEmpty()) {
      // 1. Obtener siguiente evento (ya ordenado por prioridad 1-6)
      const evento = this.colaEventos.dequeue()!;
      
      // 2. Avanzar tiempo del sistema
      this.avanzarTiempo(evento.tiempo);
      
      // 3. Procesar el evento según su tipo
      this.procesarEvento(evento);
      
      // 4. Evaluar planificación después de cada evento
      this.evaluarPlanificacion();
    }
    
    this.log('END', 'SISTEMA', 'Simulación completada', undefined, undefined, undefined, `Tiempo final: ${this.tiempoActual}`);
  }
  
  /**
   * Procesar evento según su tipo (implementa el alt del diagrama de secuencia)
   */
  private procesarEvento(evento: EventoMejorado): void {
    const proceso = this.todosLosProcesos.get(evento.idProceso);
    
    switch (evento.tipo) {
      case TipoEvento.JOB_LLEGA:
        this.procesarLlegadaProceso(evento, proceso!);
        break;
        
      case TipoEvento.FIN_TIP:
        this.procesarFinTIP(evento, proceso!);
        break;
        
      case TipoEvento.FIN_PROCESO:
        this.procesarFinProceso(evento, proceso!);
        break;
        
      case TipoEvento.FIN_RAFAGA_CPU:
        this.procesarFinRafagaCPU(evento, proceso!);
        break;
        
      case TipoEvento.EXPROPIACION:
      case TipoEvento.QUANTUM_EXPIRES:
        this.procesarExpropiacion(evento, proceso!);
        break;
        
      case TipoEvento.FIN_IO:
        this.procesarFinIO(evento, proceso!);
        break;
        
      case TipoEvento.DISPATCH:
        this.procesarDispatch(evento);
        break;
        
      default:
        this.log('ERROR', evento.idProceso, `Tipo de evento no reconocido: ${evento.tipo}`);
    }
  }
  
  /**
   * Procesar llegada de proceso (JOB_LLEGA - Prioridad 0)
   */
  private procesarLlegadaProceso(evento: EventoMejorado, proceso: Proceso): void {
    this.log('EVENT', proceso.id, 'JOB_LLEGA procesado', undefined, EstadoProceso.NUEVO);
    
    // Verificar memoria disponible
    const requiereMemoria = proceso.tamaño || 50; // Default 50MB si no especifica
    
    if (this.estadoSistema.memoriaDisponible >= requiereMemoria) {
      // Aplicar TIP (programa FIN_TIP)
      aplicarTIP(proceso, this.tiempoActual, this.parametros.TIP, this.colaEventos);
      this.log('COST', proceso.id, 'TIP aplicado', EstadoProceso.NUEVO, EstadoProceso.NUEVO, `TIP=${this.parametros.TIP}ms`);
    } else {
      // Suspender procesos para liberar memoria
      this.suspenderProcesosPorMemoria(requiereMemoria);
      
      // Intentar aplicar TIP después de suspensión
      if (this.estadoSistema.memoriaDisponible >= requiereMemoria) {
        aplicarTIP(proceso, this.tiempoActual, this.parametros.TIP, this.colaEventos);
        this.log('COST', proceso.id, 'TIP aplicado tras suspensión', EstadoProceso.NUEVO, EstadoProceso.NUEVO, `TIP=${this.parametros.TIP}ms`);
      } else {
        this.log('ERROR', proceso.id, 'No se pudo liberar memoria suficiente para TIP');
      }
    }
  }
  
  /**
   * Procesar fin de TIP (FIN_TIP - Prioridad 5)
   */
  private procesarFinTIP(evento: EventoMejorado, proceso: Proceso): void {
    const requiereMemoria = proceso.tamaño || 50;
    
    if (this.estadoSistema.memoriaDisponible >= requiereMemoria) {
      // Transición N→L con memoria
      proceso.estado = EstadoProceso.LISTO;
      this.estadoSistema.memoriaDisponible -= requiereMemoria;
      this.readyQueue.push(proceso);
      this.log('TRANSITION', proceso.id, 'N->L', EstadoProceso.NUEVO, EstadoProceso.LISTO, undefined, `Memoria reservada: ${requiereMemoria}MB`);
    } else {
      // Transición N→LS sin memoria
      proceso.estado = EstadoProceso.LISTO_SUSPENDIDO;
      this.readySuspendedQueue.push(proceso);
      this.log('TRANSITION', proceso.id, 'N->LS', EstadoProceso.NUEVO, EstadoProceso.LISTO_SUSPENDIDO, undefined, 'Sin memoria disponible');
    }
  }
  
  /**
   * Procesar fin de proceso (FIN_PROCESO - Prioridad 1)
   */
  private procesarFinProceso(evento: EventoMejorado, proceso: Proceso): void {
    const estadoAnterior = proceso.estado;
    
    // Aplicar TFP
    this.tiempoTotalSO += this.parametros.TFP;
    proceso.estado = EstadoProceso.TERMINADO;
    
    // Liberar CPU y memoria
    this.estadoSistema.cpuActiva = false;
    this.estadoSistema.procesoEnCPU = undefined;
    
    const memoriaLiberada = proceso.tamaño || 50;
    this.estadoSistema.memoriaDisponible += memoriaLiberada;
    
    // Mover a terminados
    this.procesosTerminados.push(proceso);
    
    this.log('TRANSITION', proceso.id, 'C->T', estadoAnterior, EstadoProceso.TERMINADO, `TFP=${this.parametros.TFP}ms`, `Memoria liberada: ${memoriaLiberada}MB`);
    
    // Reactivar procesos suspendidos si hay memoria
    this.reactivarProcesosSuspendidos();
  }
  
  /**
   * Procesar fin de ráfaga CPU (FIN_RAFAGA_CPU - Prioridad 2)
   */
  private procesarFinRafagaCPU(evento: EventoMejorado, proceso: Proceso): void {
    proceso.rafagasCompletadas++;
    
    if (proceso.rafagasCompletadas >= proceso.rafagasCPU) {
      // Proceso completo - programar FIN_PROCESO
      const eventoFinProceso = new EventoMejorado(
        this.tiempoActual,
        TipoEvento.FIN_PROCESO,
        proceso.id,
        'Proceso completado'
      );
      this.colaEventos.enqueue(eventoFinProceso);
      this.log('SCHEDULE', proceso.id, 'FIN_PROCESO programado (completado)');
    } else {
      // Necesita I/O - transición C→B
      proceso.estado = EstadoProceso.BLOQUEADO;
      this.estadoSistema.cpuActiva = false;
      this.estadoSistema.procesoEnCPU = undefined;
      
      // Verificar si tiene memoria para continuar I/O
      if (this.readyQueue.includes(proceso) || this.blockedQueue.length === 0 || this.estadoSistema.memoriaDisponible > this.estadoSistema.umbralSuspension) {
        this.blockedQueue.push(proceso);
        
        // Programar FIN_IO
        const eventoFinIO = new EventoMejorado(
          this.tiempoActual + proceso.duracionIO,
          TipoEvento.FIN_IO,
          proceso.id,
          'I/O completado'
        );
        this.colaEventos.enqueue(eventoFinIO);
        
        this.log('TRANSITION', proceso.id, 'C->B', EstadoProceso.CORRIENDO, EstadoProceso.BLOQUEADO, undefined, `I/O por ${proceso.duracionIO}ms`);
      } else {
        // Suspender por memoria durante I/O
        proceso.estado = EstadoProceso.BLOQUEADO_SUSPENDIDO;
        const memoriaLiberada = proceso.tamaño || 50;
        this.estadoSistema.memoriaDisponible += memoriaLiberada;
        this.blockedSuspendedQueue.push(proceso);
        
        // I/O continúa en segundo plano
        const eventoFinIO = new EventoMejorado(
          this.tiempoActual + proceso.duracionIO,
          TipoEvento.FIN_IO,
          proceso.id,
          'I/O completado (suspendido)'
        );
        this.colaEventos.enqueue(eventoFinIO);
        
        this.log('TRANSITION', proceso.id, 'C->BS', EstadoProceso.CORRIENDO, EstadoProceso.BLOQUEADO_SUSPENDIDO, undefined, `I/O suspendido, memoria liberada: ${memoriaLiberada}MB`);
      }
    }
  }
  
  /**
   * Procesar expropiación (EXPROPIACION/QUANTUM_EXPIRES - Prioridad 3)
   */
  private procesarExpropiacion(evento: EventoMejorado, proceso: Proceso): void {
    if (proceso.estado === EstadoProceso.CORRIENDO) {
      proceso.estado = EstadoProceso.LISTO;
      this.estadoSistema.cpuActiva = false;
      this.estadoSistema.procesoEnCPU = undefined;
      
      // Para RR: pushTail (al final)
      if (evento.tipo === TipoEvento.QUANTUM_EXPIRES) {
        this.readyQueue.push(proceso); // Al final para Round Robin
        this.log('TRANSITION', proceso.id, 'C->L (quantum)', EstadoProceso.CORRIENDO, EstadoProceso.LISTO, undefined, 'Expropiado por quantum');
      } else {
        // Para otras políticas: insertar según criterio
        this.readyQueue.push(proceso);
        this.log('TRANSITION', proceso.id, 'C->L (expropiación)', EstadoProceso.CORRIENDO, EstadoProceso.LISTO, undefined, 'Expropiado por política');
      }
      
      // Cancelar timer de ráfaga CPU si existe
      this.cancelarTimer(`RAFAGA_${proceso.id}`);
    }
  }
  
  /**
   * Procesar fin de I/O (FIN_IO - Prioridad 4)
   */
  private procesarFinIO(evento: EventoMejorado, proceso: Proceso): void {
    if (proceso.estado === EstadoProceso.BLOQUEADO) {
      // B→L (transición instantánea)
      proceso.estado = EstadoProceso.LISTO;
      this.blockedQueue = this.blockedQueue.filter(p => p.id !== proceso.id);
      this.readyQueue.push(proceso);
      this.log('TRANSITION', proceso.id, 'B->L', EstadoProceso.BLOQUEADO, EstadoProceso.LISTO, undefined, 'I/O completado (costo 0)');
    } else if (proceso.estado === EstadoProceso.BLOQUEADO_SUSPENDIDO) {
      // BS→LS
      proceso.estado = EstadoProceso.LISTO_SUSPENDIDO;
      this.blockedSuspendedQueue = this.blockedSuspendedQueue.filter(p => p.id !== proceso.id);
      this.readySuspendedQueue.push(proceso);
      this.log('TRANSITION', proceso.id, 'BS->LS', EstadoProceso.BLOQUEADO_SUSPENDIDO, EstadoProceso.LISTO_SUSPENDIDO, undefined, 'I/O completado suspendido');
      
      // Intentar reactivar si hay memoria
      this.intentarReactivarProceso(proceso);
    }
  }
  
  /**
   * Procesar dispatch (DISPATCH - Prioridad 6)
   */
  private procesarDispatch(evento: EventoMejorado): void {
    if (this.estadoSistema.cpuActiva || this.readyQueue.length === 0) {
      return; // CPU ocupada o no hay procesos listos
    }
    
    // Seleccionar proceso según estrategia
    const procesoSeleccionado = this.estrategia.elegirSiguiente(this.readyQueue, this.tiempoActual);
    
    if (procesoSeleccionado) {
      // Remover de ready queue
      this.readyQueue = this.readyQueue.filter(p => p.id !== procesoSeleccionado.id);
      
      // Aplicar TCP (L→C)
      const tiempoDespuesTCP = aplicarTCP(procesoSeleccionado, this.tiempoActual, this.parametros.TCP, this.colaEventos);
      this.tiempoTotalSO += this.parametros.TCP;
      
      // Actualizar estado del sistema
      this.estadoSistema.cpuActiva = true;
      this.estadoSistema.cpuIdle = false;
      this.estadoSistema.procesoEnCPU = procesoSeleccionado;
      
      // Programar fin de ráfaga CPU
      const tiempoRafaga = procesoSeleccionado.duracionCPU;
      const eventoFinRafaga = new EventoMejorado(
        tiempoDespuesTCP + tiempoRafaga,
        TipoEvento.FIN_RAFAGA_CPU,
        procesoSeleccionado.id,
        'Fin ráfaga CPU'
      );
      this.colaEventos.enqueue(eventoFinRafaga);
      this.registrarTimer(`RAFAGA_${procesoSeleccionado.id}`, eventoFinRafaga);
      
      // Para RR: programar quantum
      if (this.estrategia.requiereQuantum && this.parametros.quantum) {
        const eventoQuantum = new EventoMejorado(
          tiempoDespuesTCP + this.parametros.quantum,
          TipoEvento.QUANTUM_EXPIRES,
          procesoSeleccionado.id,
          'Quantum expirado'
        );
        this.colaEventos.enqueue(eventoQuantum);
        this.registrarTimer(`QUANTUM_${procesoSeleccionado.id}`, eventoQuantum);
      }
      
      this.log('TRANSITION', procesoSeleccionado.id, 'L->C', EstadoProceso.LISTO, EstadoProceso.CORRIENDO, `TCP=${this.parametros.TCP}ms`, `Ráfaga: ${tiempoRafaga}ms`);
    }
  }
  
  /**
   * Evaluar planificación después de cada evento
   */
  private evaluarPlanificacion(): void {
    // Si CPU está idle y hay procesos listos, programar dispatch
    if (!this.estadoSistema.cpuActiva && this.readyQueue.length > 0) {
      const eventoDispatch = new EventoMejorado(
        this.tiempoActual,
        TipoEvento.DISPATCH,
        '',
        'Auto dispatch'
      );
      this.colaEventos.enqueue(eventoDispatch);
    } else if (!this.estadoSistema.cpuActiva && this.readyQueue.length === 0) {
      // CPU idle
      this.estadoSistema.cpuIdle = true;
      if (!this.estadoSistema.tiempoInicioIdle) {
        this.estadoSistema.tiempoInicioIdle = this.tiempoActual;
      }
    }
  }
  
  /**
   * Avanzar tiempo del sistema
   */
  private avanzarTiempo(nuevoTiempo: number): void {
    if (nuevoTiempo > this.tiempoActual) {
      // Calcular tiempo idle si corresponde
      if (this.estadoSistema.cpuIdle && this.estadoSistema.tiempoInicioIdle !== undefined) {
        this.tiempoTotalInactivo += nuevoTiempo - this.estadoSistema.tiempoInicioIdle;
        this.estadoSistema.tiempoInicioIdle = undefined;
        this.estadoSistema.cpuIdle = false;
      }
      
      this.tiempoActual = nuevoTiempo;
    }
  }
  
  /**
   * Logging integral para trazabilidad
   */
  private log(
    evento: string,
    proceso: string,
    descripcion: string,
    estadoAnterior?: EstadoProceso,
    estadoNuevo?: EstadoProceso,
    costoAplicado?: string,
    memoryInfo?: string
  ): void {
    this.logger.push({
      tiempo: this.tiempoActual,
      evento,
      proceso,
      transicion: descripcion,
      estadoAnterior,
      estadoNuevo,
      costoAplicado,
      memoryInfo
    });
  }
  
  /**
   * Gestión de timers activos
   */
  private registrarTimer(clave: string, evento: EventoMejorado): void {
    this.timersActivos.set(clave, evento);
  }
  
  private cancelarTimer(clave: string): boolean {
    const timer = this.timersActivos.get(clave);
    if (timer) {
      // Remover de cola de eventos (si es posible)
      this.timersActivos.delete(clave);
      return true;
    }
    return false;
  }
  
  /**
   * Gestión de estados suspendidos
   */
  private suspenderProcesosPorMemoria(memoriaRequerida: number): void {
    // Implementar algoritmo de suspensión
    // Priorizar suspender procesos bloqueados primero
    while (this.estadoSistema.memoriaDisponible < memoriaRequerida && this.blockedQueue.length > 0) {
      const proceso = this.blockedQueue.shift()!;
      const memoriaLiberada = proceso.tamaño || 50;
      proceso.estado = EstadoProceso.BLOQUEADO_SUSPENDIDO;
      this.blockedSuspendedQueue.push(proceso);
      this.estadoSistema.memoriaDisponible += memoriaLiberada;
      this.log('SUSPENSION', proceso.id, 'B->BS por memoria', EstadoProceso.BLOQUEADO, EstadoProceso.BLOQUEADO_SUSPENDIDO, undefined, `Liberada: ${memoriaLiberada}MB`);
    }
    
    // Luego suspender procesos listos si es necesario
    while (this.estadoSistema.memoriaDisponible < memoriaRequerida && this.readyQueue.length > 0) {
      const proceso = this.readyQueue.shift()!;
      const memoriaLiberada = proceso.tamaño || 50;
      proceso.estado = EstadoProceso.LISTO_SUSPENDIDO;
      this.readySuspendedQueue.push(proceso);
      this.estadoSistema.memoriaDisponible += memoriaLiberada;
      this.log('SUSPENSION', proceso.id, 'L->LS por memoria', EstadoProceso.LISTO, EstadoProceso.LISTO_SUSPENDIDO, undefined, `Liberada: ${memoriaLiberada}MB`);
    }
  }
  
  private reactivarProcesosSuspendidos(): void {
    // Reactivar procesos suspendidos si hay memoria
    for (let i = this.readySuspendedQueue.length - 1; i >= 0; i--) {
      const proceso = this.readySuspendedQueue[i];
      const memoriaRequerida = proceso.tamaño || 50;
      
      if (this.estadoSistema.memoriaDisponible >= memoriaRequerida) {
        this.readySuspendedQueue.splice(i, 1);
        proceso.estado = EstadoProceso.LISTO;
        this.readyQueue.push(proceso);
        this.estadoSistema.memoriaDisponible -= memoriaRequerida;
        this.log('REACTIVATION', proceso.id, 'LS->L por memoria', EstadoProceso.LISTO_SUSPENDIDO, EstadoProceso.LISTO, undefined, `Reservada: ${memoriaRequerida}MB`);
      }
    }
    
    for (let i = this.blockedSuspendedQueue.length - 1; i >= 0; i--) {
      const proceso = this.blockedSuspendedQueue[i];
      const memoriaRequerida = proceso.tamaño || 50;
      
      if (this.estadoSistema.memoriaDisponible >= memoriaRequerida) {
        this.blockedSuspendedQueue.splice(i, 1);
        proceso.estado = EstadoProceso.BLOQUEADO;
        this.blockedQueue.push(proceso);
        this.estadoSistema.memoriaDisponible -= memoriaRequerida;
        this.log('REACTIVATION', proceso.id, 'BS->B por memoria', EstadoProceso.BLOQUEADO_SUSPENDIDO, EstadoProceso.BLOQUEADO, undefined, `Reservada: ${memoriaRequerida}MB`);
      }
    }
  }
  
  private intentarReactivarProceso(proceso: Proceso): void {
    if (proceso.estado === EstadoProceso.LISTO_SUSPENDIDO) {
      const memoriaRequerida = proceso.tamaño || 50;
      if (this.estadoSistema.memoriaDisponible >= memoriaRequerida) {
        this.readySuspendedQueue = this.readySuspendedQueue.filter(p => p.id !== proceso.id);
        proceso.estado = EstadoProceso.LISTO;
        this.readyQueue.push(proceso);
        this.estadoSistema.memoriaDisponible -= memoriaRequerida;
        this.log('REACTIVATION', proceso.id, 'LS->L automática', EstadoProceso.LISTO_SUSPENDIDO, EstadoProceso.LISTO, undefined, `Reservada: ${memoriaRequerida}MB`);
      }
    }
  }
  
  /**
   * Obtener estadísticas completas del sistema
   */
  obtenerEstadisticas(): any {
    return {
      tiempoTotal: this.tiempoActual,
      tiempoInactivo: this.tiempoTotalInactivo,
      tiempoSO: this.tiempoTotalSO,
      tiempoUsuario: this.tiempoActual - this.tiempoTotalInactivo - this.tiempoTotalSO,
      procesosTerminados: this.procesosTerminados.length,
      eventosRegistrados: this.logger.length,
      memoriaFinal: this.estadoSistema.memoriaDisponible
    };
  }
}
