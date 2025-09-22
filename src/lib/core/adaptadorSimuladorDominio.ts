/**
 * Adaptador para usar Simulador.ts del dominio en lugar del MotorSimulacion del core
 */
import type { Workload } from '../domain/types';
import { Simulador } from '../domain/entities/Simulador';
import { Proceso } from '../domain/entities/Proceso';
import { AdaptadorEntidadesDominio } from './adaptadorEntidadesDominio';
import type { SimState, EventoInterno } from './state';
import { 
  crearEstadoInicial, 
  agregarEventoInterno, 
  agregarEventoExportacion 
} from './state';
import type { ParametrosSimulacion, TipoEvento, Algoritmo } from '../domain/types';
import { TipoEvento as TipoEventoDominio, EstadoProceso } from '../domain/types';
import type { EstrategiaScheduler } from '../domain/algorithms/Scheduler';
import { EstrategiaSchedulerFcfs } from '../domain/algorithms/fcfs';
import { EstrategiaSchedulerSjf } from '../domain/algorithms/sjf';
import { EstrategiaSchedulerSrtf } from '../domain/algorithms/srtf';
import { EstrategiaSchedulerRoundRobin } from '../domain/algorithms/rr';
import { EstrategiaSchedulerPrioridad } from '../domain/algorithms/priority';

/**
 * Resultado de la simulación usando el simulador del dominio
 */
export interface ResultadoSimulacionDominio {
  eventosInternos: EventoInterno[];
  eventosExportacion: any[];
  estadoFinal: SimState;
  exitoso: boolean;
  error?: string;
}

/**
 * Adaptador que usa Simulador.ts del dominio manteniendo compatibilidad
 */
export class AdaptadorSimuladorDominio {
  private simuladorDominio: Simulador;
  private state: SimState;
  private procesosDominio: Map<string, Proceso> = new Map();
  private estrategia: EstrategiaScheduler;

  constructor(workload: Workload) {
    // Crear estado inicial compatible con el core
    this.state = crearEstadoInicial(workload);
    
    // Configurar parámetros para el simulador del dominio
    const parametros: ParametrosSimulacion = {
      algoritmo: this.mapearPolicy(workload.config.policy) as Algoritmo,
      TIP: workload.config.tip,
      TFP: workload.config.tfp,
      TCP: workload.config.tcp,
      quantum: workload.config.quantum || 0
    };
    
    // Crear simulador del dominio
    this.simuladorDominio = new Simulador(parametros);
    
    // Crear estrategia de scheduling según el algoritmo
    this.estrategia = this.crearEstrategia(parametros.algoritmo, parametros.quantum || 4);
    
    // Convertir y agregar procesos
    const procesosDominio = AdaptadorEntidadesDominio.workloadAProcesos(workload);
    for (const proceso of procesosDominio) {
      this.procesosDominio.set(proceso.id, proceso);
      this.simuladorDominio.agregarProceso(proceso);
    }
  }

  /**
   * Crea la estrategia de scheduling según el algoritmo configurado
   */
  private crearEstrategia(algoritmo: string, quantum: number): EstrategiaScheduler {
    console.log(`🧠 Creando estrategia: ${algoritmo}`);
    
    switch (algoritmo) {
      case 'FCFS':
        return new EstrategiaSchedulerFcfs();
      case 'SJF':
        return new EstrategiaSchedulerSjf();
      case 'SRTF':
        return new EstrategiaSchedulerSrtf();
      case 'RR':
        return new EstrategiaSchedulerRoundRobin(quantum);
      case 'Priority':
        return new EstrategiaSchedulerPrioridad(true); // expropiativo por defecto
      default:
        console.warn(`⚠️ Algoritmo ${algoritmo} no reconocido, usando FCFS por defecto`);
        return new EstrategiaSchedulerFcfs();
    }
  }

  /**
   * Ejecuta la simulación usando el simulador del dominio
   */
  ejecutar(): ResultadoSimulacionDominio {
    try {
      console.log('🚀 Iniciando simulación con Simulador.ts del dominio...');
      
      // Ejecutar simulación del dominio
      this.ejecutarSimulacionDominio();
      
      // Sincronizar resultados al estado del core
      this.sincronizarResultados();
      
      return {
        eventosInternos: this.state.eventosInternos,
        eventosExportacion: this.state.eventosExportacion,
        estadoFinal: this.state,
        exitoso: true
      };
    } catch (error) {
      console.error('❌ Error durante la simulación del dominio:', error);
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
   * Lógica principal de simulación por eventos discretos del dominio
   */
  private ejecutarSimulacionDominio(): void {
    const maxIteraciones = 1000;
    let iteraciones = 0;

    while (!this.simuladorDominio.colaEventos.isEmpty() && 
           !this.simuladorDominio.todosProcesosTerninados() && 
           iteraciones < maxIteraciones) {
      iteraciones++;

      const evento = this.simuladorDominio.colaEventos.dequeue();
      if (!evento) break;

      // Avanzar tiempo
      this.simuladorDominio.avanzarTiempo(evento.tiempo);
      this.state.tiempoActual = evento.tiempo;

      // Procesar evento según tipo
      this.procesarEventoDominio(evento);
      
      // Agregar al registro del dominio
      this.simuladorDominio.registroEventos.push(evento);
    }

    console.log(`🏁 Simulación del dominio completada en tiempo ${this.simuladorDominio.tiempoActual}`);
  }

  /**
   * Procesa un evento específico del dominio
   */
  private procesarEventoDominio(evento: any): void {
    const proceso = this.simuladorDominio.obtenerProceso(evento.idProceso);
    if (!proceso && evento.tipo !== TipoEventoDominio.DISPATCH) {
      console.warn(`⚠️ Proceso ${evento.idProceso} no encontrado para evento ${evento.tipo}`);
      return;
    }

    switch (evento.tipo) {
      case TipoEventoDominio.JOB_LLEGA:
        this.manejarLlegadaProceso(proceso!);
        break;
      case TipoEventoDominio.ENTRA_SISTEMA:
        this.manejarFinTIP(proceso!);
        break;
      case TipoEventoDominio.DISPATCH:
        this.manejarDespacho();
        break;
      case TipoEventoDominio.FIN_RAFAGA_CPU:
        this.manejarFinRafagaCPU(proceso!);
        break;
      case TipoEventoDominio.IO_COMPLETA:
        this.manejarFinIO(proceso!);
        break;
      case TipoEventoDominio.PROCESO_TERMINA:
        this.manejarFinTFP(proceso!);
        break;
      case TipoEventoDominio.QUANTUM_EXPIRES:
        this.manejarExpropiacion(proceso!);
        break;
    }
  }

  /**
   * Verifica si hay procesos en Ready Queue y programa despacho si CPU está libre
   */
  private programarDespachoSiNecesario(): void {
    if (!this.simuladorDominio.procesoActualCPU && this.simuladorDominio.readyQueue.length > 0) {
      this.simuladorDominio.programarEvento(
        this.simuladorDominio.tiempoActual,
        TipoEventoDominio.DISPATCH,
        '',
        'CPU libre, despachar proceso'
      );
    }
  }

  /**
   * Maneja la llegada de un proceso al sistema
   */
  private manejarLlegadaProceso(proceso: Proceso): void {
    console.log(`📥 Llegada del proceso ${proceso.id} en tiempo ${this.simuladorDominio.tiempoActual}`);
    
    proceso.iniciarTIP(this.simuladorDominio.tiempoActual);
    
    // Programar fin de TIP
    this.simuladorDominio.programarEvento(
      this.simuladorDominio.tiempoActual + this.simuladorDominio.parametros.TIP,
      TipoEventoDominio.ENTRA_SISTEMA,
      proceso.id,
      'Finalizando TIP'
    );
    
    // Registrar en estado del core
    agregarEventoInterno(this.state, 'Arribo', proceso.id, 
      `Iniciando TIP: ${this.simuladorDominio.parametros.TIP}`);
    
    // Actualizar contadores
    this.simuladorDominio.tiempoTotalSO += this.simuladorDominio.parametros.TIP;
  }

  /**
   * Maneja el fin del TIP de un proceso
   */
  private manejarFinTIP(proceso: Proceso): void {
    console.log(`✅ Fin TIP del proceso ${proceso.id} en tiempo ${this.simuladorDominio.tiempoActual}`);
    
    proceso.finalizarTIP(this.simuladorDominio.tiempoActual);
    this.simuladorDominio.readyQueue.push(proceso);
    
    // CORRECCIÓN: Agregar evento para mostrar TIP en Gantt
    agregarEventoInterno(this.state, 'FinTIP', proceso.id, 
      `TIP completado en ${this.simuladorDominio.parametros.TIP} unidades`);
    
    // Para algoritmos expropitativos, verificar si debe expropiar
    if (this.estrategia.soportaExpropiacion && this.simuladorDominio.procesoActualCPU) {
      const procesoActual = this.simuladorDominio.procesoActualCPU;
      
      // Verificar si el nuevo proceso debe expropiar al actual
      if (this.estrategia.debeExpropiar && this.estrategia.debeExpropiar(procesoActual, proceso, this.simuladorDominio.tiempoActual)) {
        console.log(`🔄 EXPROPIACIÓN: ${proceso.id} expropia a ${procesoActual.id}`);
        
        // Calcular cuánto tiempo ya ejecutó el proceso actual
        // CORRECCIÓN: El tiempo de ejecución debe descontar el TCP
        const tiempoInicioEjecucionReal = (procesoActual.ultimoDispatch || this.simuladorDominio.tiempoActual) + this.simuladorDominio.parametros.TCP;
        const tiempoEjecutado = Math.max(0, this.simuladorDominio.tiempoActual - tiempoInicioEjecucionReal);
        console.log(`   Proceso ${procesoActual.id} ejecutó ${tiempoEjecutado} unidades antes de expropiación`);
        
        // Actualizar tiempo restante del proceso expropiado
        if (tiempoEjecutado > 0) {
          this.procesarTiempoCPU(procesoActual, tiempoEjecutado);
        }
        
        // Expropiar el proceso actual
        procesoActual.expropiar(this.simuladorDominio.tiempoActual);
        
        // GENERAR EVENTO CORRIENDO_A_LISTO para el proceso expropiado
        agregarEventoInterno(this.state, 'AgotamientoQuantum', procesoActual.id, 
          `Proceso expropiado por ${proceso.id} (SRTN)`);
        
        // Remover proceso actual de CPU y agregarlo a la cola ordenadamente
        this.simuladorDominio.procesoActualCPU = undefined;
        this.simuladorDominio.readyQueue.push(procesoActual); // Agregar al final
        
        // CRITICAL: Para SRTN, reordenar la cola según tiempo restante
        if (this.estrategia.nombre.includes('SRTF') || this.estrategia.nombre.includes('SRTN')) {
          this.estrategia.ordenarColaListos?.(this.simuladorDominio.readyQueue);
        }
        
        // PROGRAMAR DESPACHO inmediato tras expropiación
        this.simuladorDominio.programarEvento(
          this.simuladorDominio.tiempoActual,
          TipoEventoDominio.DISPATCH,
          '',
          'Despacho tras expropiación'
        );
        
        return;
      }
    }
    
    // Si no hay expropiación, programar despacho solo si CPU está libre
    this.programarDespachoSiNecesario();
    
    agregarEventoInterno(this.state, 'FinTIP', proceso.id, 'Proceso listo para despacho');
  }

  /**
   * Maneja el despacho de un proceso
   */
  private manejarDespacho(): void {
    if (this.simuladorDominio.readyQueue.length === 0) return;
    
    // Seleccionar proceso usando la estrategia configurada
    const procesoSeleccionado = this.estrategia.elegirSiguiente(
      this.simuladorDominio.readyQueue, 
      this.simuladorDominio.tiempoActual
    );
    
    if (!procesoSeleccionado) return;
    
    // Verificar que el proceso esté en estado LISTO
    if (procesoSeleccionado.estado !== EstadoProceso.LISTO) {
      console.log(`⚠️ Proceso ${procesoSeleccionado.id} no está LISTO (estado: ${procesoSeleccionado.estado}), removiendo de cola`);
      // Remover proceso inválido de la cola
      const index = this.simuladorDominio.readyQueue.indexOf(procesoSeleccionado);
      if (index !== -1) {
        this.simuladorDominio.readyQueue.splice(index, 1);
      }
      // Intentar despachar otro proceso
      if (this.simuladorDominio.readyQueue.length > 0) {
        this.simuladorDominio.programarEvento(
          this.simuladorDominio.tiempoActual,
          TipoEventoDominio.DISPATCH,
          '',
          'Reintentar despacho'
        );
      }
      return;
    }
    
    console.log(`🎯 Despachando proceso ${procesoSeleccionado.id} en tiempo ${this.simuladorDominio.tiempoActual} usando ${this.estrategia.nombre}`);
    
    // Remover de la cola ready
    const index = this.simuladorDominio.readyQueue.indexOf(procesoSeleccionado);
    if (index !== -1) {
      this.simuladorDominio.readyQueue.splice(index, 1);
    }
    
    this.simuladorDominio.procesoActualCPU = procesoSeleccionado;
    // CORRECCIÓN: activar con el tiempo de despacho real, no con TCP incluido
    const ultimoDispatchAnterior = procesoSeleccionado.ultimoDispatch;
    procesoSeleccionado.activar(this.simuladorDominio.tiempoActual);
    
    // CORRECCIÓN CRÍTICA: Si este es un re-despacho inmediato del mismo proceso tras expropiación,
    // conservar el ultimoDispatch original para calcular correctamente el tiempo ejecutado
    if (ultimoDispatchAnterior !== undefined && 
        ultimoDispatchAnterior <= this.simuladorDominio.tiempoActual &&
        this.simuladorDominio.tiempoActual - ultimoDispatchAnterior <= (this.simuladorDominio.parametros.quantum || 0)) {
      procesoSeleccionado.ultimoDispatch = ultimoDispatchAnterior;
    }
    
    // Programar fin de ráfaga CPU usando tiempo restante actual
    const tiempoFinRafaga = this.simuladorDominio.tiempoActual + 
                           this.simuladorDominio.parametros.TCP + 
                           procesoSeleccionado.restanteCPU;  // CORRECCIÓN: usar restanteCPU
    
    this.simuladorDominio.programarEvento(
      tiempoFinRafaga,
      TipoEventoDominio.FIN_RAFAGA_CPU,
      procesoSeleccionado.id,
      'Finalizando ráfaga CPU'
    );
    
    // Para Round Robin, programar vencimiento de quantum si es necesario
    if (this.estrategia.requiereQuantum && this.simuladorDominio.parametros.quantum && this.simuladorDominio.parametros.quantum > 0) {
      // CORRECCIÓN: El quantum debe contar SOLO el tiempo de CPU real, NO incluir TCP
      // El TCP ya está incluido en tiempoFinRafaga, pero el quantum debe medirse desde el momento
      // en que el proceso realmente empieza a ejecutar (después del TCP)
      const tiempoInicioEjecucionReal = this.simuladorDominio.tiempoActual + this.simuladorDominio.parametros.TCP;
      const tiempoVencimientoQuantum = tiempoInicioEjecucionReal + this.simuladorDominio.parametros.quantum;
      
      // Solo programar quantum si es menor que el tiempo de fin de ráfaga
      if (tiempoVencimientoQuantum < tiempoFinRafaga) {
        this.simuladorDominio.programarEvento(
          tiempoVencimientoQuantum,
          TipoEventoDominio.QUANTUM_EXPIRES,
          procesoSeleccionado.id,
          'Vencimiento de quantum RR'
        );
      }
    }
    
    agregarEventoInterno(this.state, 'Despacho', procesoSeleccionado.id, 
      `TCP: ${this.simuladorDominio.parametros.TCP}, Algoritmo: ${this.estrategia.nombre}`);
    
    // Actualizar contadores
    this.simuladorDominio.tiempoTotalSO += this.simuladorDominio.parametros.TCP;
  }

  /**
   * Maneja el fin de una ráfaga CPU
   */
  private manejarFinRafagaCPU(proceso: Proceso): void {
    console.log(`⚡ Fin ráfaga CPU del proceso ${proceso.id} en tiempo ${this.simuladorDominio.tiempoActual}`);
    
    // Verificar que el proceso realmente esté ejecutando (no haya sido expropiado)
    if (this.simuladorDominio.procesoActualCPU?.id !== proceso.id) {
      console.log(`⚠️ Ignorando fin de ráfaga obsoleta de ${proceso.id} - no está ejecutando`);
      return;
    }
    
    // CORRECCIÓN: Eliminar validación incorrecta que bloqueaba eventos válidos
    // La validación anterior comparaba incorrectamente tiempo transcurrido con restanteCPU
    
    this.simuladorDominio.procesoActualCPU = undefined;
    
    // CORRECCIÓN CRÍTICA: Solo contabilizar el tiempo restante no contabilizado previamente
    // El tiempo ya ejecutado en expropiaciones se contabilizó en procesarTiempoCPU()
    // Aquí solo contamos lo que falta completar de la ráfaga actual
    const tiempoRestanteRafaga = proceso.restanteCPU;
    if (tiempoRestanteRafaga > 0) {
      this.simuladorDominio.tiempoTotalUsuario += tiempoRestanteRafaga;
    }
    
    // Completar ráfaga y confiar en el estado que establece
    proceso.completarCPU(this.simuladorDominio.tiempoActual);
    
    // Usar el estado que completarCPU() estableció
    if (proceso.estado === EstadoProceso.TERMINADO) {
      // Proceso terminado - programar TFP
      this.simuladorDominio.programarEvento(
        this.simuladorDominio.tiempoActual + this.simuladorDominio.parametros.TFP,
        TipoEventoDominio.PROCESO_TERMINA,
        proceso.id,
        'Iniciando TFP'
      );
      
      this.simuladorDominio.tiempoTotalSO += this.simuladorDominio.parametros.TFP;
      
      agregarEventoInterno(this.state, 'FinRafagaCPU', proceso.id, 
        'Proceso completado, iniciando TFP');
    } else if (proceso.estado === EstadoProceso.BLOQUEADO) {
      // Va a I/O - debe durar tiempo real de I/O
      this.simuladorDominio.procesosBloqueados.push(proceso);
      
      // I/O debe durar proceso.duracionIO unidades
      this.simuladorDominio.programarEvento(
        this.simuladorDominio.tiempoActual + proceso.duracionIO,
        TipoEventoDominio.IO_COMPLETA,
        proceso.id,
        `I/O completado tras ${proceso.duracionIO} unidades`
      );
      
      agregarEventoInterno(this.state, 'FinRafagaCPU', proceso.id, 
        `Inicia I/O por ${proceso.duracionIO} unidades`);
    }
    
    // Despachar siguiente proceso si hay alguno listo
    this.programarDespachoSiNecesario();
  }

  /**
   * Maneja el fin de I/O de un proceso
   * CRÍTICO: La transición Bloqueado→Listo es INSTANTÁNEA (Δt=0)
   * El TCP se cobra únicamente en Listo→Corriendo, NO aquí
   */
  private manejarFinIO(proceso: Proceso): void {
    console.log(`💿 Fin I/O del proceso ${proceso.id} en tiempo ${this.simuladorDominio.tiempoActual}`);
    
    // CORRECCIÓN CRÍTICA: B→L es instantáneo, NO consumir TCP aquí
    // El TCP se aplica exclusivamente en L→C (manejarDespacho)
    
    this.simuladorDominio.removerDeListaBloqueados(proceso.id);
    proceso.completarIO(this.simuladorDominio.tiempoActual);
    this.simuladorDominio.readyQueue.push(proceso);
    
    // Para algoritmos expropitativos (como SRTN), verificar si debe expropiar tras regreso de I/O
    if (this.estrategia.soportaExpropiacion && this.simuladorDominio.procesoActualCPU) {
      const procesoActual = this.simuladorDominio.procesoActualCPU;
      
      // Verificar si el proceso que regresa de I/O debe expropiar al actual
      if (this.estrategia.debeExpropiar && this.estrategia.debeExpropiar(procesoActual, proceso, this.simuladorDominio.tiempoActual)) {
        console.log(`🔄 EXPROPIACIÓN tras I/O: ${proceso.id} expropia a ${procesoActual.id}`);
        
        // Calcular cuánto tiempo ya ejecutó el proceso actual
        // CORRECCIÓN: El tiempo de ejecución debe descontar el TCP
        const tiempoInicioEjecucionReal = (procesoActual.ultimoDispatch || this.simuladorDominio.tiempoActual) + this.simuladorDominio.parametros.TCP;
        const tiempoEjecutado = Math.max(0, this.simuladorDominio.tiempoActual - tiempoInicioEjecucionReal);
        
        // Actualizar tiempo restante del proceso expropiado
        if (tiempoEjecutado > 0) {
          this.procesarTiempoCPU(procesoActual, tiempoEjecutado);
        }
        
        // Expropiar el proceso actual
        procesoActual.expropiar(this.simuladorDominio.tiempoActual);
        
        // GENERAR EVENTO CORRIENDO_A_LISTO para el proceso expropiado
        agregarEventoInterno(this.state, 'AgotamientoQuantum', procesoActual.id, 
          `Proceso expropiado por ${proceso.id} tras I/O (SRTN)`);
        
        // Remover proceso actual de CPU y agregarlo a la cola ordenadamente
        this.simuladorDominio.procesoActualCPU = undefined;
        this.simuladorDominio.readyQueue.push(procesoActual); // Agregar al final
        
        // CRITICAL: Para SRTN, reordenar la cola según tiempo restante
        if (this.estrategia.nombre.includes('SRTF') || this.estrategia.nombre.includes('SRTN')) {
          this.estrategia.ordenarColaListos?.(this.simuladorDominio.readyQueue);
        }
        
        // Programar despacho inmediato del proceso que regresa de I/O (forzar por expropiación)
        this.simuladorDominio.programarEvento(
          this.simuladorDominio.tiempoActual,
          TipoEventoDominio.DISPATCH,
          '',
          'Despacho por expropiación tras I/O'
        );
        
        agregarEventoInterno(this.state, 'FinES', proceso.id, 'I/O completado, expropió proceso actual');
        return;
      }
    }
    
    // Si no hay expropiación, despachar si CPU está libre
    this.programarDespachoSiNecesario();
    
    agregarEventoInterno(this.state, 'FinES', proceso.id, 'I/O completado, proceso listo');
  }

  /**
   * Maneja el fin del TFP de un proceso
   */
  private manejarFinTFP(proceso: Proceso): void {
    console.log(`🏁 Fin TFP del proceso ${proceso.id} en tiempo ${this.simuladorDominio.tiempoActual}`);
    
    proceso.terminar(this.simuladorDominio.tiempoActual);
    this.simuladorDominio.marcarComoTerminado(proceso);
    
    // Despachar siguiente proceso si hay alguno listo
    this.programarDespachoSiNecesario();
    
    agregarEventoInterno(this.state, 'FinTFP', proceso.id, 'Proceso completamente terminado');
    agregarEventoExportacion(this.state, 'FinTFP', proceso.id);
  }

  /**
   * Maneja la expropiación de un proceso (para RR)
   */
  private manejarExpropiacion(proceso: Proceso): void {
    console.log(`⏰ Expropiación del proceso ${proceso.id} en tiempo ${this.simuladorDominio.tiempoActual}`);
    
    // Verificar que el proceso esté realmente ejecutando
    if (this.simuladorDominio.procesoActualCPU?.id !== proceso.id) {
      console.log(`⚠️ Ignorando expropiación obsoleta de ${proceso.id} - no está ejecutando`);
      return;
    }
    
    // Verificar que el proceso no esté terminado
    if (proceso.estaCompleto() || proceso.estado === EstadoProceso.TERMINADO) {
      console.log(`⚠️ Ignorando expropiación obsoleta de ${proceso.id} - proceso terminado`);
      return;
    }
    
    // VERIFICACIÓN ADICIONAL: Si el proceso no tiene más CPU restante, no expropiar
    if (proceso.restanteCPU <= 0) {
      console.log(`⚠️ Ignorando expropiación obsoleta de ${proceso.id} - CPU agotado`);
      return;
    }
    
    // CORRECCIÓN CRÍTICA: Actualizar tiempo CPU ejecutado antes de expropiar
    // El tiempo de ejecución debe descontar el TCP
    const ultimoDispatch = proceso.ultimoDispatch || this.simuladorDominio.tiempoActual;
    const tiempoInicioEjecucionReal = ultimoDispatch + this.simuladorDominio.parametros.TCP;
    const tiempoEjecutado = Math.max(0, this.simuladorDominio.tiempoActual - tiempoInicioEjecucionReal);
    
    if (tiempoEjecutado > 0) {
      this.procesarTiempoCPU(proceso, tiempoEjecutado);
    }
    
    // Verificar nuevamente si el proceso terminó tras procesar CPU
    if (proceso.estaCompleto() || proceso.restanteCPU <= 0) {
      console.log(`⚠️ Proceso ${proceso.id} terminó durante expropiación - cancelando`);
      return;
    }
    
    // CORRECCIÓN RR: Verificar si es el único proceso en el sistema
    const totalProcesosActivos = this.simuladorDominio.readyQueue.length + 
                                 this.simuladorDominio.procesosBloqueados.length + 
                                 (this.simuladorDominio.procesoActualCPU ? 1 : 0);
    
    if (totalProcesosActivos === 1 && this.estrategia.nombre === 'Round Robin') {
      // Caso especial: RR con un solo proceso
      // Según consigna: "pasamos a listo y luego le volvemos a asignar la cpu (usamos un TCP)"
      console.log(`🔄 RR proceso único: ${proceso.id} va a LISTO y regresa (consume TCP)`);
      
      this.simuladorDominio.procesoActualCPU = undefined;
      proceso.expropiar(this.simuladorDominio.tiempoActual);
      this.simuladorDominio.readyQueue.push(proceso);
      
      // Aplicar TCP por el cambio de contexto (según consigna TP)
      this.simuladorDominio.tiempoTotalSO += this.simuladorDominio.parametros.TCP;
      
      // Programar despacho inmediato con micro-offset
      this.simuladorDominio.programarEvento(
        this.simuladorDominio.tiempoActual + 0.0001,
        TipoEventoDominio.DISPATCH,
        '',
        'Despacho tras expropiación RR (proceso único)'
      );
      
      agregarEventoInterno(this.state, 'AgotamientoQuantum', proceso.id, 'Proceso único expropiado (consume TCP)');
      return;
    }
    
    // Caso normal: múltiples procesos
    this.simuladorDominio.procesoActualCPU = undefined;
    proceso.expropiar(this.simuladorDominio.tiempoActual);
    this.simuladorDominio.readyQueue.push(proceso);
    
    // CORRECCIÓN: En RR, el despacho debe ser inmediato pero CON un pequeño offset
    // para asegurar que se procese después de la expropiación
    this.simuladorDominio.programarEvento(
      this.simuladorDominio.tiempoActual + 0.0001, // Micro-offset para ordenamiento correcto
      TipoEventoDominio.DISPATCH,
      '',
      'Despacho tras expropiación RR'
    );
    
    agregarEventoInterno(this.state, 'AgotamientoQuantum', proceso.id, 'Proceso expropiado');
  }

  /**
   * Sincroniza los resultados del simulador del dominio al estado del core
   */
  private sincronizarResultados(): void {
    // Actualizar tiempo final
    this.state.tiempoActual = this.simuladorDominio.tiempoActual;
    
    // CORRECCIÓN: Sincronizar las entidades actualizadas del simulador al estado
    for (const [nombre, procesoActualizado] of this.procesosDominio) {
      this.state.procesos.set(nombre, procesoActualizado);
    }
    
    // Actualizar contadores CPU
    this.state.contadoresCPU.ocioso = this.simuladorDominio.tiempoTotalInactivo;
    this.state.contadoresCPU.sistemaOperativo = this.simuladorDominio.tiempoTotalSO;
    this.state.contadoresCPU.procesos = this.simuladorDominio.tiempoTotalUsuario;
  }

  /**
   * Mapea las políticas del modelo a las del dominio
   */
  private mapearPolicy(policy: string): string {
    const mapeo: Record<string, string> = {
      'FCFS': 'FCFS',
      'SPN': 'SJF',
      'SRTN': 'SRTF',
      'PRIORITY': 'Priority',
      'RR': 'RR'
    };
    return mapeo[policy] || policy;
  }

  /**
   * Procesa tiempo de CPU de un proceso y actualiza contadores del simulador
   */
  private procesarTiempoCPU(proceso: Proceso, tiempoEjecutado: number): void {
    if (tiempoEjecutado > 0) {
      proceso.procesarCPU(tiempoEjecutado);
      // Actualizar directamente el contador de tiempo de usuario
      this.simuladorDominio.tiempoTotalUsuario += tiempoEjecutado;
    }
  }
}
