/**
 * Adaptador Simulador Dominio - Façade principal del sistema
 * Implementa la interfaz unificada según diagramas de secuencia
 */

import type { Proceso } from './entities/Proceso';
import { MotorSimulacionCompleto } from './entities/MotorSimulacionCompleto';
import { FactoriaEstrategias, type EstrategiaScheduler } from './algorithms/EstrategiasScheduling';
import type { ParametrosSimulacion, ResultadosSimulacion, MetricasProceso } from './types';
import { Proceso as ProcesoEntity } from './entities/Proceso';

/**
 * Configuración completa de la simulación
 */
export interface ConfiguracionSimulacion {
  procesos: any[]; // ProcesData[]
  algoritmo: string;
  parametros: ParametrosSimulacion;
  parametrosEstrategia?: {
    quantum?: number;
    factorAging?: number;
  };
}

/**
 * Adaptador principal que orquesta toda la simulación
 * Según diagrama de secuencia principal
 */
export class AdaptadorSimuladorDominio {
  private motor?: MotorSimulacionCompleto;
  private estrategia?: EstrategiaScheduler;
  
  /**
   * Ejecutar simulación completa según diagrama principal
   */
  async ejecutarSimulacion(config: ConfiguracionSimulacion): Promise<ResultadosSimulacion> {
    try {
      // 1. Configurar estrategia de scheduling
      this.estrategia = FactoriaEstrategias.crear(config.algoritmo, config.parametrosEstrategia);
      
      // 2. Inicializar motor de simulación
      this.motor = new MotorSimulacionCompleto(config.parametros, this.estrategia);
      
      // 3. Cargar procesos en el sistema
      this.cargarProcesos(config.procesos);
      
      // 4. Ejecutar bucle principal de simulación
      this.motor.ejecutarSimulacion();
      
      // 5. Generar resultados y métricas
      const resultados = this.generarResultados();
      
      return resultados;
      
    } catch (error) {
      throw new Error(`Error en simulación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
  
  /**
   * Cargar procesos en el motor de simulación
   */
  private cargarProcesos(procesosData: any[]): void {
    if (!this.motor) {
      throw new Error('Motor no inicializado');
    }
    
    for (const data of procesosData) {
      const proceso = new ProcesoEntity(data);
      this.motor.agregarProceso(proceso);
    }
  }
  
  /**
   * Generar resultados completos de la simulación
   */
  private generarResultados(): ResultadosSimulacion {
    if (!this.motor || !this.estrategia) {
      throw new Error('Simulación no ejecutada');
    }
    
    const estadisticas = this.motor.obtenerEstadisticas();
    const procesosTerminados = this.motor.procesosTerminados;
    
    // Calcular métricas por proceso
    const metricasProcesos: MetricasProceso[] = procesosTerminados.map(proceso => 
      this.calcularMetricasProceso(proceso)
    );
    
    // Calcular métricas globales
    const metricas = this.calcularMetricasGlobales(metricasProcesos, estadisticas);
    
    // Generar timeline de eventos para Gantt
    const timeline = this.generarTimelineEventos();
    
    return {
      algoritmo: this.estrategia.nombre,
      parametros: this.motor.parametros,
      procesos: metricasProcesos,
      metricas,
      timeline,
      estadisticas,
      logger: this.motor.logger
    };
  }
  
  /**
   * Calcular métricas individuales de un proceso
   */
  private calcularMetricasProceso(proceso: Proceso): MetricasProceso {
    const tiempoTurnaround = (proceso.fin || 0) - proceso.arribo;
    const tiempoEspera = proceso.tiempoListoTotal;
    const tiempoRespuesta = (proceso.inicio || 0) - proceso.arribo;
    const tiempoServicio = proceso.tiempoCPUConsumido;
    
    return {
      id: proceso.id,
      arribo: proceso.arribo,
      inicio: proceso.inicio || 0,
      fin: proceso.fin || 0,
      tiempoTurnaround,
      tiempoEspera,
      tiempoRespuesta,
      tiempoServicio,
      ratioRespuesta: tiempoTurnaround / tiempoServicio,
      estado: proceso.estado
    };
  }
  
  /**
   * Calcular métricas globales del sistema
   */
  private calcularMetricasGlobales(procesos: MetricasProceso[], estadisticas: any): any {
    const n = procesos.length;
    
    if (n === 0) {
      return {
        tiempoPromedioTurnaround: 0,
        tiempoPromedioEspera: 0,
        tiempoPromedioRespuesta: 0,
        throughput: 0,
        utilizacionCPU: 0
      };
    }
    
    const tiempoPromedioTurnaround = procesos.reduce((sum, p) => sum + p.tiempoTurnaround, 0) / n;
    const tiempoPromedioEspera = procesos.reduce((sum, p) => sum + p.tiempoEspera, 0) / n;
    const tiempoPromedioRespuesta = procesos.reduce((sum, p) => sum + p.tiempoRespuesta, 0) / n;
    
    const tiempoTotal = estadisticas.tiempoTotal;
    const throughput = tiempoTotal > 0 ? n / tiempoTotal : 0;
    const utilizacionCPU = tiempoTotal > 0 ? (estadisticas.tiempoUsuario / tiempoTotal) * 100 : 0;
    
    return {
      tiempoPromedioTurnaround,
      tiempoPromedioEspera,
      tiempoPromedioRespuesta,
      throughput,
      utilizacionCPU,
      tiempoTotalSistema: tiempoTotal,
      tiempoInactivo: estadisticas.tiempoInactivo,
      tiempoSO: estadisticas.tiempoSO,
      eficiencia: utilizacionCPU / 100
    };
  }
  
  /**
   * Generar timeline de eventos para reconstruir Gantt chart
   */
  private generarTimelineEventos(): any[] {
    if (!this.motor) return [];
    
    return this.motor.logger
      .filter(log => log.evento === 'TRANSITION' || log.evento === 'EVENT')
      .map(log => ({
        tiempo: log.tiempo,
        proceso: log.proceso,
        evento: log.transicion,
        estadoAnterior: log.estadoAnterior,
        estadoNuevo: log.estadoNuevo,
        costo: log.costoAplicado,
        memoria: log.memoryInfo
      }))
      .sort((a, b) => a.tiempo - b.tiempo);
  }
  
  /**
   * Validar configuración de entrada
   */
  static validarConfiguracion(config: ConfiguracionSimulacion): void {
    if (!config.procesos || config.procesos.length === 0) {
      throw new Error('Debe especificar al menos un proceso');
    }
    
    if (!config.algoritmo) {
      throw new Error('Debe especificar un algoritmo de planificación');
    }
    
    const algoritmosValidos = FactoriaEstrategias.obtenerEstrategiasDisponibles();
    if (!algoritmosValidos.includes(config.algoritmo.toUpperCase())) {
      throw new Error(`Algoritmo no válido: ${config.algoritmo}. Válidos: ${algoritmosValidos.join(', ')}`);
    }
    
    if (config.algoritmo.toUpperCase() === 'RR' && !config.parametrosEstrategia?.quantum) {
      throw new Error('Round Robin requiere especificar quantum');
    }
    
    // Validar procesos
    for (const [index, proceso] of config.procesos.entries()) {
      if (!proceso.nombre) {
        throw new Error(`Proceso ${index}: falta nombre`);
      }
      if (proceso.arribo < 0) {
        throw new Error(`Proceso ${proceso.nombre}: tiempo de arribo debe ser >= 0`);
      }
      if (proceso.rafagasCPU <= 0) {
        throw new Error(`Proceso ${proceso.nombre}: ráfagas CPU debe ser > 0`);
      }
      if (proceso.duracionCPU <= 0) {
        throw new Error(`Proceso ${proceso.nombre}: duración CPU debe ser > 0`);
      }
    }
  }
  
  /**
   * Obtener información de estado del sistema (para debugging)
   */
  obtenerEstadoSistema(): any {
    if (!this.motor) {
      return { estado: 'no_inicializado' };
    }
    
    return {
      tiempoActual: this.motor.tiempoActual,
      readyQueue: this.motor.readyQueue.map(p => ({ id: p.id, estado: p.estado })),
      blockedQueue: this.motor.blockedQueue.map(p => ({ id: p.id, estado: p.estado })),
      readySuspended: this.motor.readySuspendedQueue.map(p => ({ id: p.id, estado: p.estado })),
      blockedSuspended: this.motor.blockedSuspendedQueue.map(p => ({ id: p.id, estado: p.estado })),
      terminados: this.motor.procesosTerminados.length,
      eventosEnCola: this.motor.colaEventos.size(),
      totalProcesos: this.motor.todosLosProcesos.size
    };
  }
}
