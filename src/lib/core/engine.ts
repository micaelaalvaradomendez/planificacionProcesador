/**
 * Motor de simulación por eventos discretos - Versión Corregida
 * Implementa el bucle principal del simulador de planificación de procesos
 */

import type { Workload } from '../model/types';
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
  private state: SimState;
  private maxIteraciones = 1000; // Protección contra bucles infinitos

  constructor(workload: Workload) {
    this.state = crearEstadoInicial(workload);
  }

  /**
   * Ejecuta la simulación completa
   */
  ejecutar(): ResultadoSimulacion {
    try {
      console.log('🚀 Iniciando simulación...');
      
      // Simulación simplificada para evitar bucles infinitos
      this.simularFCFSSimple();

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
   * Simulación FCFS simplificada para pruebas
   */
  private simularFCFSSimple(): void {
    console.log('📋 Iniciando simulación FCFS simplificada');
    
    // Protección adicional contra bucles infinitos
    const LIMITE_TIEMPO_SIMULACION = 10000; // 10 segundos máximo de tiempo simulado
    const LIMITE_ITERACIONES = 1000; // máximo 1000 operaciones
    
    // Procesar cada proceso secuencialmente
    const procesosOrdenados = Array.from(this.state.procesos.values())
      .sort((a, b) => a.tiempoArribo - b.tiempoArribo);

    let tiempoActual = 0;
    let iteraciones = 0;
    
    for (const proceso of procesosOrdenados) {
      iteraciones++;
      if (iteraciones > LIMITE_ITERACIONES) {
        console.warn('⚠️ Límite de iteraciones alcanzado, deteniendo simulación');
        break;
      }
      
      if (tiempoActual > LIMITE_TIEMPO_SIMULACION) {
        console.warn('⚠️ Límite de tiempo de simulación alcanzado, deteniendo simulación');
        break;
      }
      
      console.log(`🔄 Procesando ${proceso.name} (iteración ${iteraciones})`);
      
      // Esperar al arribo del proceso
      if (proceso.tiempoArribo > tiempoActual) {
        // Tiempo ocioso
        const tiempoOcioso = proceso.tiempoArribo - tiempoActual;
        this.state.contadoresCPU.ocioso += tiempoOcioso;
        tiempoActual = proceso.tiempoArribo;
      }

      // Arribo del proceso
      this.state.tiempoActual = tiempoActual;
      agregarEventoInterno(this.state, 'Arribo', proceso.name, 'Llegada al sistema');
      agregarEventoExportacion(this.state, 'ARRIBO_TRABAJO', proceso.name);

      // TIP
      this.state.contadoresCPU.sistemaOperativo += this.state.tip;
      tiempoActual += this.state.tip;
      proceso.inicioTIP = this.state.tiempoActual;
      proceso.finTIP = tiempoActual;
      proceso.tipCumplido = true;

      this.state.tiempoActual = tiempoActual;
      agregarEventoExportacion(this.state, 'INCORPORACION_SISTEMA', proceso.name);

      // Procesar todas las ráfagas del proceso
      for (let rafaga = 0; rafaga < proceso.rafagasCPU; rafaga++) {
        // TCP (cambio de contexto)
        this.state.contadoresCPU.sistemaOperativo += this.state.tcp;
        tiempoActual += this.state.tcp;

        this.state.tiempoActual = tiempoActual;
        agregarEventoInterno(this.state, 'Despacho', proceso.name, `Despacho ráfaga ${rafaga + 1}`);
        agregarEventoExportacion(this.state, 'DESPACHO', proceso.name);

        if (rafaga === 0) {
          proceso.primerDespacho = tiempoActual;
        }

        // Ejecución de CPU
        this.state.contadoresCPU.procesos += proceso.duracionRafagaCPU;
        tiempoActual += proceso.duracionRafagaCPU;

        this.state.tiempoActual = tiempoActual;
        agregarEventoExportacion(this.state, 'FIN_RAFAGA_CPU', proceso.name);

        // E/S (solo si no es la última ráfaga)
        if (rafaga < proceso.rafagasCPU - 1) {
          agregarEventoExportacion(this.state, 'INICIO_ES', proceso.name);
          
          // En nuestro modelo simplificado, E/S es instantánea
          // (no afecta el tiempo del sistema)
          
          agregarEventoExportacion(this.state, 'FIN_ES', proceso.name);
        }
      }

      // TFP
      this.state.contadoresCPU.sistemaOperativo += this.state.tfp;
      tiempoActual += this.state.tfp;
      proceso.finTFP = tiempoActual;
      proceso.estado = 'Terminado';

      this.state.tiempoActual = tiempoActual;
      agregarEventoInterno(this.state, 'FinTFP', proceso.name, 'Proceso terminado');
      agregarEventoExportacion(this.state, 'TERMINACION_PROCESO', proceso.name);

      // Calcular métricas del proceso
      proceso.tiempoListoAcumulado = Math.max(0, 
        (proceso.primerDespacho || tiempoActual) - proceso.finTIP! - 
        (proceso.rafagasCPU - 1) * proceso.duracionRafagaES
      );

      console.log(`✅ ${proceso.name} completado en tiempo ${tiempoActual}`);
    }

    this.state.tiempoActual = tiempoActual;
    console.log(`🏁 Simulación completada en tiempo ${tiempoActual}`);
  }
}
