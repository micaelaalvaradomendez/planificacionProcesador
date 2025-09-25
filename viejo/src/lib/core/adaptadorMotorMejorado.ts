/**
 * Adaptador mejorado que usa MotorSimulacionMejorado según estadomejorado.puml
 * Implementa reglas académicamente correctas con validaciones estrictas
 */
import type { Workload } from '../domain/types';
import { MotorSimulacionMejorado } from '../domain/entities/MotorSimulacionMejorado';
import { Proceso } from '../domain/entities/Proceso';
import { AdaptadorEntidadesDominio } from './adaptadorEntidadesDominio';
import type { SimState, EventoInterno } from './state';
import { 
  crearEstadoInicial, 
  registrarEvento,
  obtenerEventosInternos,
  obtenerEventosExportacion
} from './state';
import type { ParametrosSimulacion, Algoritmo } from '../domain/types';
import { TipoEvento, EstadoProceso } from '../domain/types';
import type { EstrategiaScheduler } from '../domain/algorithms/Scheduler';
import { EstrategiaSchedulerFcfs } from '../domain/algorithms/fcfs';
import { EstrategiaSchedulerSjf } from '../domain/algorithms/sjf';
import { EstrategiaSchedulerSrtf } from '../domain/algorithms/srtf';
import { EstrategiaSchedulerRoundRobin } from '../domain/algorithms/rr';
import { EstrategiaSchedulerPrioridad } from '../domain/algorithms/priority';

/**
 * Resultado de la simulación usando el motor mejorado
 */
export interface ResultadoSimulacionMejorado {
  eventosInternos: EventoInterno[];
  eventosExportacion: any[];
  estadoFinal: SimState;
  exitoso: boolean;
  error?: string;
  estadisticasMotor?: {
    tiempoTotal: number;
    tiempoInactivo: number;
    tiempoSO: number;
    tiempoUsuario: number;
    utilizacionCPU: number;
    eventosProcessados: number;
  };
}

/**
 * Adaptador que usa MotorSimulacionMejorado implementando estadomejorado.puml
 */
export class AdaptadorMotorMejorado {
  private motorMejorado: MotorSimulacionMejorado;
  private state: SimState;
  private procesosDominio: Map<string, Proceso> = new Map();

  constructor(workload: Workload) {
    // Crear estado inicial compatible con el core
    this.state = crearEstadoInicial(workload);
    
    // Configurar parámetros para el motor mejorado
    const parametros: ParametrosSimulacion = {
      algoritmo: this.mapearPolicy(workload.config.policy) as Algoritmo,
      TIP: workload.config.tip,
      TFP: workload.config.tfp,
      TCP: workload.config.tcp,
      quantum: workload.config.quantum
    };

    // Crear estrategia de scheduling
    const estrategia = this.crearEstrategia(workload.config.policy, workload.config.quantum || 0);
    
    // Inicializar motor mejorado
    this.motorMejorado = new MotorSimulacionMejorado(parametros, estrategia);
    
    // Configurar procesos
    this.configurarProcesos(workload);
  }

  /**
   * Crea la estrategia de scheduling según el algoritmo configurado
   */
  private crearEstrategia(algoritmo: string, quantum: number): EstrategiaScheduler {
    switch (algoritmo.toUpperCase()) {
      case 'FCFS':
        return new EstrategiaSchedulerFcfs();
        
      case 'SPN':
      case 'SJF':
        return new EstrategiaSchedulerSjf();
        
      case 'SRTN':
      case 'SRTF':
        return new EstrategiaSchedulerSrtf();
        
      case 'RR':
        return new EstrategiaSchedulerRoundRobin(quantum);
        
      case 'PRIORITY':
        // Por defecto expropiativo con aging deshabilitado
        return new EstrategiaSchedulerPrioridad(true, false);
        
      default:
        throw new Error(`Algoritmo no soportado: ${algoritmo}`);
    }
  }

  /**
   * Configura los procesos en el motor
   */
  private configurarProcesos(workload: Workload): void {
    for (const processSpec of workload.processes) {
      const proceso = new Proceso({
        nombre: processSpec.id,
        arribo: processSpec.arribo,
        rafagasCPU: processSpec.rafagasCPU,
        duracionCPU: processSpec.duracionCPU,
        duracionIO: processSpec.duracionIO,
        prioridad: processSpec.prioridad
      });
      
      this.procesosDominio.set(proceso.id, proceso);
      this.motorMejorado.agregarProceso(proceso);
    }
  }

  /**
   * Ejecuta la simulación usando el motor mejorado
   */
  ejecutar(): ResultadoSimulacionMejorado {
    try {
      // Ejecutar simulación
      this.motorMejorado.ejecutarSimulacion();
      
      // Convertir eventos del motor a eventos internos
      const eventosInternos = this.convertirEventosMotorAInternos();
      
      // Actualizar estado final
      this.actualizarEstadoFinal();
      
      // Obtener eventos de exportación
      const eventosExportacion = obtenerEventosExportacion(this.state);
      
      return {
        exitoso: true,
        eventosInternos,
        eventosExportacion,
        estadoFinal: this.state,
        estadisticasMotor: this.motorMejorado.obtenerEstadisticas()
      };
      
    } catch (error) {
      return {
        exitoso: false,
        eventosInternos: [],
        eventosExportacion: [],
        estadoFinal: this.state,
        error: error instanceof Error ? error.message : 'Error desconocido en motor mejorado'
      };
    }
  }

  /**
   * Convierte eventos del motor mejorado a eventos internos del core
   */
  private convertirEventosMotorAInternos(): EventoInterno[] {
    return this.motorMejorado.registroEventos.map(evento => {
      // Mapear tipos de eventos
      const tipoInterno = this.mapearTipoEventoAInterno(evento.tipo);
      
      return {
        tiempo: evento.tiempo,
        tipo: tipoInterno,
        proceso: evento.idProceso,
        extra: evento.descripcion || '',
        detalles: {
          estadoAnterior: this.obtenerEstadoAnteriorProceso(evento.idProceso),
          estadoNuevo: this.obtenerEstadoNuevoProceso(evento.idProceso, evento.tipo)
        }
      };
    });
  }

  /**
   * Mapea tipos de eventos del motor a tipos internos
   */
  private mapearTipoEventoAInterno(tipo: TipoEvento): string {
    const mapeo: Record<TipoEvento, string> = {
      [TipoEvento.JOB_LLEGA]: 'Llegada',
      [TipoEvento.NUEVO_A_LISTO]: 'FinTIP',
      [TipoEvento.DISPATCH]: 'Despacho',
      [TipoEvento.LISTO_A_CORRIENDO]: 'Despacho',
      [TipoEvento.FIN_RAFAGA_CPU]: 'FinRafagaCPU', 
      [TipoEvento.BLOQUEADO_A_LISTO]: 'FinES',
      [TipoEvento.QUANTUM_EXPIRES]: 'AgotamientoQuantum',
      [TipoEvento.CORRIENDO_A_LISTO]: 'Expropiacion',
      [TipoEvento.CORRIENDO_A_TERMINADO]: 'FinTFP',
      [TipoEvento.IO_COMPLETA]: 'FinES',
      [TipoEvento.PROCESO_TERMINA]: 'FinTFP'
    };
    
    return mapeo[tipo] || tipo.toString();
  }

  /**
   * Obtiene el estado anterior de un proceso
   */
  private obtenerEstadoAnteriorProceso(idProceso: string): string {
    const proceso = this.procesosDominio.get(idProceso);
    return proceso ? proceso.estado : 'DESCONOCIDO';
  }

  /**
   * Obtiene el estado nuevo de un proceso según el tipo de evento
   */
  private obtenerEstadoNuevoProceso(idProceso: string, tipoEvento: TipoEvento): string {
    switch (tipoEvento) {
      case TipoEvento.JOB_LLEGA: return 'NUEVO';
      case TipoEvento.NUEVO_A_LISTO: return 'LISTO';
      case TipoEvento.DISPATCH:
      case TipoEvento.LISTO_A_CORRIENDO: return 'CORRIENDO';
      case TipoEvento.FIN_RAFAGA_CPU: return 'BLOQUEADO';
      case TipoEvento.BLOQUEADO_A_LISTO: return 'LISTO';
      case TipoEvento.QUANTUM_EXPIRES:
      case TipoEvento.CORRIENDO_A_LISTO: return 'LISTO';
      case TipoEvento.CORRIENDO_A_TERMINADO: return 'TERMINADO';
      default: return 'DESCONOCIDO';
    }
  }

  /**
   * Actualiza el estado final con información del motor
   */
  private actualizarEstadoFinal(): void {
    const estadisticas = this.motorMejorado.obtenerEstadisticas();
    
    // Actualizar métricas temporales en el estado
    this.state.tiempoActual = estadisticas.tiempoTotal;
    
    // Actualizar contadores de CPU
    this.state.contadoresCPU.ocioso = estadisticas.tiempoInactivo;
    this.state.contadoresCPU.sistemaOperativo = estadisticas.tiempoSO;
    this.state.contadoresCPU.procesos = estadisticas.tiempoUsuario;
    
    // Actualizar procesos en el estado
    for (const [id, proceso] of this.procesosDominio) {
      this.state.procesos.set(id, proceso);
    }
  }

  /**
   * Mapea policy string a algoritmo enum
   */
  private mapearPolicy(policy: string): string {
    const mapeo: Record<string, string> = {
      'FCFS': 'FCFS',
      'PRIORITY': 'PRIORITY',
      'RR': 'RR',
      'SPN': 'SJF',
      'SRTN': 'SRTF'
    };
    
    return mapeo[policy.toUpperCase()] || policy;
  }

  /**
   * Obtiene información de depuración del motor
   */
  obtenerInfoDebug(): {
    eventosRegistrados: number;
    procesosConfigurados: number;
    estadisticasMotor: any;
  } {
    return {
      eventosRegistrados: this.motorMejorado.registroEventos.length,
      procesosConfigurados: this.procesosDominio.size,
      estadisticasMotor: this.motorMejorado.obtenerEstadisticas()
    };
  }
}
