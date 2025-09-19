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
import type { EstadoProceso, ParametrosSimulacion, TipoEvento, Algoritmo } from '../domain/types';
import { TipoEvento as TipoEventoDominio } from '../domain/types';
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
    
    // Para algoritmos expropitativos, verificar si debe expropiar
    if (this.estrategia.soportaExpropiacion && this.simuladorDominio.procesoActualCPU) {
      const procesoActual = this.simuladorDominio.procesoActualCPU;
      
      // Verificar si el nuevo proceso debe expropiar al actual
      if (this.estrategia.debeExpropiar && this.estrategia.debeExpropiar(procesoActual, proceso, this.simuladorDominio.tiempoActual)) {
        console.log(`🔄 EXPROPIACIÓN: ${proceso.id} expropia a ${procesoActual.id}`);
        
        // Calcular cuánto tiempo ya ejecutó el proceso actual
        const tiempoEjecutado = this.simuladorDominio.tiempoActual - (procesoActual.ultimoDispatch || this.simuladorDominio.tiempoActual);
        console.log(`   Proceso ${procesoActual.id} ejecutó ${tiempoEjecutado} unidades antes de expropiación`);
        
        // Actualizar tiempo restante del proceso expropiado
        if (tiempoEjecutado > 0) {
          procesoActual.procesarCPU(tiempoEjecutado);
        }
        
        // Expropiar el proceso actual
        procesoActual.expropiar(this.simuladorDominio.tiempoActual);
        
        // GENERAR EVENTO CORRIENDO_A_LISTO para el proceso expropiado
        agregarEventoInterno(this.state, 'AgotamientoQuantum', procesoActual.id, 
          `Proceso expropiado por ${proceso.id}`);
        
        // Remover proceso actual de CPU y agregarlo a la cola
        this.simuladorDominio.procesoActualCPU = undefined;
        this.simuladorDominio.readyQueue.unshift(procesoActual); // Al frente para Round Robin
        
        // Programar despacho inmediato del nuevo proceso
        this.simuladorDominio.programarEvento(
          this.simuladorDominio.tiempoActual,
          TipoEventoDominio.DISPATCH,
          '',
          'Despacho por expropiación'
        );
        
        return;
      }
    }
    
    // Si no hay expropiación, programar despacho solo si CPU está libre
    if (!this.simuladorDominio.procesoActualCPU) {
      this.simuladorDominio.programarEvento(
        this.simuladorDominio.tiempoActual,
        TipoEventoDominio.DISPATCH,
        '',
        'CPU libre, despachar proceso'
      );
    }
    
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
    if (procesoSeleccionado.estado !== 'LISTO') {
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
    procesoSeleccionado.activar(this.simuladorDominio.tiempoActual + this.simuladorDominio.parametros.TCP);
    
    // Programar fin de ráfaga CPU
    const tiempoFinRafaga = this.simuladorDominio.tiempoActual + 
                           this.simuladorDominio.parametros.TCP + 
                           procesoSeleccionado.duracionCPU;
    
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
        
        console.log(`⏰ Quantum programado para ${procesoSeleccionado.id} en tiempo ${tiempoVencimientoQuantum} (quantum real: ${this.simuladorDominio.parametros.quantum})`);
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
      console.log(`⚠️ Ignorando fin de ráfaga obsoleto de ${proceso.id} - no está ejecutando`);
      return;
    }
    
    this.simuladorDominio.procesoActualCPU = undefined;
    proceso.completarCPU(this.simuladorDominio.tiempoActual);
    
    // Actualizar contadores
    this.simuladorDominio.tiempoTotalUsuario += proceso.duracionCPU;
    
    if (proceso.estaCompleto()) {
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
    } else {
      // Va a I/O (instantáneo)
      this.simuladorDominio.procesosBloqueados.push(proceso);
      
      this.simuladorDominio.programarEvento(
        this.simuladorDominio.tiempoActual,
        TipoEventoDominio.IO_COMPLETA,
        proceso.id,
        'I/O instantáneo completado'
      );
      
      agregarEventoInterno(this.state, 'FinRafagaCPU', proceso.id, 
        `Yendo a I/O por ${proceso.duracionIO} unidades`);
    }
    
    // Despachar siguiente proceso si hay alguno listo
    if (this.simuladorDominio.readyQueue.length > 0) {
      this.simuladorDominio.programarEvento(
        this.simuladorDominio.tiempoActual,
        TipoEventoDominio.DISPATCH,
        '',
        'Despachar siguiente proceso'
      );
    }
  }

  /**
   * Maneja el fin de I/O de un proceso
   */
  private manejarFinIO(proceso: Proceso): void {
    console.log(`💿 Fin I/O del proceso ${proceso.id} en tiempo ${this.simuladorDominio.tiempoActual}`);
    
    this.simuladorDominio.removerDeListaBloqueados(proceso.id);
    proceso.completarIO(this.simuladorDominio.tiempoActual);
    this.simuladorDominio.readyQueue.push(proceso);
    
    // Despachar si CPU está libre
    if (!this.simuladorDominio.procesoActualCPU) {
      this.simuladorDominio.programarEvento(
        this.simuladorDominio.tiempoActual,
        TipoEventoDominio.DISPATCH,
        '',
        'CPU libre tras I/O'
      );
    }
    
    agregarEventoInterno(this.state, 'FinES', proceso.id, 'I/O completado, proceso listo');
  }

  /**
   * Maneja el fin del TFP de un proceso
   */
  private manejarFinTFP(proceso: Proceso): void {
    console.log(`🏁 Fin TFP del proceso ${proceso.id} en tiempo ${this.simuladorDominio.tiempoActual}`);
    
    proceso.terminar(this.simuladorDominio.tiempoActual);
    this.simuladorDominio.marcarComoTerminado(proceso);
    
    agregarEventoInterno(this.state, 'FinTFP', proceso.id, 'Proceso completamente terminado');
    agregarEventoExportacion(this.state, 'PROCESO_TERMINA', proceso.id);
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
    if (proceso.estaCompleto() || proceso.estado === 'TERMINADO') {
      console.log(`⚠️ Ignorando expropiación obsoleta de ${proceso.id} - proceso terminado`);
      return;
    }
    
    this.simuladorDominio.procesoActualCPU = undefined;
    proceso.expropiar(this.simuladorDominio.tiempoActual);
    this.simuladorDominio.readyQueue.push(proceso);
    
    // Despachar siguiente proceso
    this.simuladorDominio.programarEvento(
      this.simuladorDominio.tiempoActual,
      TipoEventoDominio.DISPATCH,
      '',
      'Despachar tras expropiación'
    );
    
    agregarEventoInterno(this.state, 'AgotamientoQuantum', proceso.id, 'Proceso expropiado');
  }

  /**
   * Sincroniza los resultados del simulador del dominio al estado del core
   */
  private sincronizarResultados(): void {
    // Actualizar tiempo final
    this.state.tiempoActual = this.simuladorDominio.tiempoActual;
    
    // Sincronizar estados de procesos
    for (const [nombre, procesoRT] of this.state.procesos) {
      const procesoDominio = this.procesosDominio.get(nombre);
      if (procesoDominio) {
        const procesoActualizado = AdaptadorEntidadesDominio.procesoAProcesoRT(procesoDominio);
        // Mantener propiedades que no se convierten
        procesoRT.estado = procesoActualizado.estado;
        procesoRT.rafagasRestantes = procesoActualizado.rafagasRestantes;
        procesoRT.restanteEnRafaga = procesoActualizado.restanteEnRafaga;
        procesoRT.tiempoListoAcumulado = procesoActualizado.tiempoListoAcumulado;
        procesoRT.tipCumplido = procesoActualizado.tipCumplido;
        procesoRT.inicioTIP = procesoActualizado.inicioTIP;
        procesoRT.finTIP = procesoActualizado.finTIP;
        procesoRT.primerDespacho = procesoActualizado.primerDespacho;
        procesoRT.finTFP = procesoActualizado.finTFP;
      }
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
}
