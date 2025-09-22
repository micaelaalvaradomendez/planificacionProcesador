/**
 * Servicio de dominio: Constructor de diagramas de Gantt
 * Contiene la lógica de negocio para generar representaciones visuales de la ejecución
 */

import type { SimEvent, GanttSlice, RunConfig } from '../types';
import { TipoEvento } from '../types';

export interface DiagramaGantt {
  segmentos: GanttSlice[];
  tiempoTotal: number;
  procesos: string[];
  estadisticas: EstadisticasGantt;
}

export interface EstadisticasGantt {
  utilizacionCPU: number;
  tiempoOcioso: number;
  tiempoSO: number;
  segmentosPorProceso: Map<string, number>;
  duracionPromedioPorTipo: Map<string, number>;
}

/**
 * Servicio de dominio para construcción de diagramas de Gantt
 */
export class GanttBuilder {
  
  /**
   * Construye un diagrama de Gantt completo a partir de eventos de simulación
   * @param eventos Lista de eventos de la simulación
   * @param config Configuración con parámetros TIP/TCP/TFP para determinar segmentos
   */
  static construirDiagramaGantt(eventos: SimEvent[], config?: RunConfig): DiagramaGantt {
    if (eventos.length === 0) {
      return {
        segmentos: [],
        tiempoTotal: 0,
        procesos: [],
        estadisticas: {
          utilizacionCPU: 0,
          tiempoOcioso: 0,
          tiempoSO: 0,
          segmentosPorProceso: new Map(),
          duracionPromedioPorTipo: new Map()
        }
      };
    }

    const segmentos = this.generarSegmentosAlternativos(eventos, config);
    // const segmentos = this.generarSegmentosGantt(eventos);
    const procesos = this.extraerProcesosUnicos(eventos);
    const tiempoTotal = this.calcularTiempoTotal(segmentos);
    const estadisticas = this.calcularEstadisticasGantt(segmentos, tiempoTotal);

    return {
      segmentos: segmentos.sort((a, b) => a.tStart - b.tStart),
      tiempoTotal,
      procesos: procesos.sort(),
      estadisticas
    };
  }

  /**
   * Genera segmentos de Gantt a partir de eventos ordenados cronológicamente
   * NUEVA IMPLEMENTACIÓN: Genera segmentos de duración basados en fases del proceso
   */
  private static generarSegmentosGantt(eventos: SimEvent[]): GanttSlice[] {
    console.log('🔄 Generando segmentos desde eventos:', eventos.length);
    
    const segmentos: GanttSlice[] = [];
    const eventosOrdenados = [...eventos].sort((a, b) => a.tiempo - b.tiempo);
    
    console.log('📊 Primeros eventos:', eventosOrdenados.slice(0, 3));

    // Generar segmentos basados en transiciones de estado
    for (let i = 0; i < eventosOrdenados.length; i++) {
      const evento = eventosOrdenados[i];
      const siguienteEvento = eventosOrdenados[i + 1];
      
      // Solo generar segmentos para eventos que tienen duración
      if (siguienteEvento && siguienteEvento.tiempo > evento.tiempo) {
        const segmento = this.crearSegmentoPorEvento(evento, siguienteEvento.tiempo);
        if (segmento) {
          segmentos.push(segmento);
        }
      }
    }

    console.log(`📊 Diagrama Gantt: ${segmentos.length} segmentos generados`);
    return segmentos;
  }

  /**
   * Crea un segmento de Gantt basado en un evento específico
   */
  private static crearSegmentoPorEvento(evento: SimEvent, tiempoFin: number): GanttSlice | null {
    const duracion = tiempoFin - evento.tiempo;
    
    // Solo crear segmentos con duración > 0
    if (duracion <= 0) return null;

    switch (evento.tipo) {
      case TipoEvento.JOB_LLEGA:
        // TIP: Tiempo de Inicio de Proceso
        return {
          process: evento.proceso,
          tStart: evento.tiempo,
          tEnd: tiempoFin,
          kind: 'TIP'
        };

      case TipoEvento.LISTO_A_CORRIENDO:
        // TCP: Tiempo de Cambio de Proceso (despacho)
        return {
          process: evento.proceso,
          tStart: evento.tiempo,
          tEnd: tiempoFin,
          kind: 'TCP'
        };

      case TipoEvento.FIN_RAFAGA_CPU:
        // TFP: Tiempo de Finalización de Proceso (si es terminación)
        return {
          process: evento.proceso,
          tStart: evento.tiempo,
          tEnd: tiempoFin,
          kind: 'TFP'
        };

      case TipoEvento.NUEVO_A_LISTO:
        // Si hay duración, podría ser actividad del SO
        return {
          process: 'SO',
          tStart: evento.tiempo,
          tEnd: tiempoFin,
          kind: 'TCP'
        };

      default:
        return null;
    }
  }

  /**
   * MÉTODO CORREGIDO: Genera solo segmentos que consumen tiempo real
   * TIP/TCP/TFP son eventos instantáneos cuando duración=0, segmentos cuando duración>0
   * I/O debe ser secuencial, no simultáneo con CPU
   * @param eventos Lista de eventos ordenados cronológicamente
   * @param config Configuración con parámetros TIP/TCP/TFP para determinar si generar segmentos
   */
  private static generarSegmentosAlternativos(eventos: SimEvent[], config?: RunConfig): GanttSlice[] {
    const segmentos: GanttSlice[] = [];
    const eventosOrdenados = [...eventos].sort((a, b) => a.tiempo - b.tiempo);
    
    console.log('🔧 Generando segmentos de Gantt corregidos (solo tiempo real):', eventosOrdenados.length);
    
    // Estado de la CPU: quien está ejecutando actualmente
    let procesoEjecutando: string | null = null;
    let tiempoInicioEjecucion: number | null = null;
    
    for (const evento of eventosOrdenados) {
      console.log(`⏱️  Procesando: T=${evento.tiempo} | ${evento.tipo} | ${evento.proceso}`);
      
      // INICIO DE EJECUCIÓN EN CPU (DISPATCH)
      if (evento.tipo === TipoEvento.LISTO_A_CORRIENDO || evento.tipo === TipoEvento.DISPATCH) {
        // Terminar ejecución anterior si existe
        if (procesoEjecutando && tiempoInicioEjecucion !== null) {
          segmentos.push({
            process: procesoEjecutando,
            tStart: tiempoInicioEjecucion,
            tEnd: evento.tiempo,
            kind: 'CPU'
          });
          console.log(`  📦 CPU: ${procesoEjecutando} [${tiempoInicioEjecucion}-${evento.tiempo}]`);
        }
        
        // TCP: Si duración > 0, generar segmento ANTES de la ejecución real
        let tiempoInicioReal = evento.tiempo;
        if (config && config.tcp > 0) {
          segmentos.push({
            process: 'SO',
            tStart: evento.tiempo,
            tEnd: evento.tiempo + config.tcp,
            kind: 'TCP'
          });
          console.log(`  📦 TCP segmento: SO [${evento.tiempo}-${evento.tiempo + config.tcp}]`);
          tiempoInicioReal = evento.tiempo + config.tcp;
        }
        
        // Iniciar nueva ejecución (después del TCP si existe)
        procesoEjecutando = evento.proceso;
        tiempoInicioEjecucion = tiempoInicioReal;
        console.log(`  🚀 Iniciando CPU: ${evento.proceso} desde ${tiempoInicioReal}`);
      }
      
      // FIN DE RÁFAGA CPU
      else if (evento.tipo === TipoEvento.FIN_RAFAGA_CPU) {
        if (procesoEjecutando === evento.proceso && tiempoInicioEjecucion !== null) {
          segmentos.push({
            process: procesoEjecutando,
            tStart: tiempoInicioEjecucion,
            tEnd: evento.tiempo,
            kind: 'CPU'
          });
          console.log(`  📦 CPU: ${procesoEjecutando} [${tiempoInicioEjecucion}-${evento.tiempo}]`);
          
          // Si el proceso va a I/O, crear segmento I/O
          if (evento.extra && evento.extra.includes('I/O')) {
            // Buscar el evento FinES correspondiente
            const finESEvento = eventosOrdenados.find(e => 
              e.tiempo > evento.tiempo && 
              e.proceso === evento.proceso && 
              (e.tipo as string) === 'FinES'
            );
            
            if (finESEvento) {
              segmentos.push({
                process: evento.proceso,
                tStart: evento.tiempo,
                tEnd: finESEvento.tiempo,
                kind: 'ES'
              });
              console.log(`  📦 I/O: ${evento.proceso} [${evento.tiempo}-${finESEvento.tiempo}]`);
            }
          }
          
          // CPU libre
          procesoEjecutando = null;
          tiempoInicioEjecucion = null;
        }
      }
      
      // PREEMPCIÓN (AGOTAMIENTO QUANTUM)
      else if (evento.tipo === TipoEvento.CORRIENDO_A_LISTO) {
        if (procesoEjecutando === evento.proceso && tiempoInicioEjecucion !== null) {
          segmentos.push({
            process: procesoEjecutando,
            tStart: tiempoInicioEjecucion,
            tEnd: evento.tiempo,
            kind: 'CPU'
          });
          console.log(`  📦 CPU (preemption): ${procesoEjecutando} [${tiempoInicioEjecucion}-${evento.tiempo}]`);
          
          // CPU libre tras preempción
          procesoEjecutando = null;
          tiempoInicioEjecucion = null;
        }
      }
      
      // TERMINACIÓN DE PROCESO
      else if (evento.tipo === TipoEvento.CORRIENDO_A_TERMINADO) {
        if (procesoEjecutando === evento.proceso && tiempoInicioEjecucion !== null) {
          segmentos.push({
            process: procesoEjecutando,
            tStart: tiempoInicioEjecucion,
            tEnd: evento.tiempo,
            kind: 'CPU'
          });
          console.log(`  📦 CPU (hasta terminar): ${procesoEjecutando} [${tiempoInicioEjecucion}-${evento.tiempo}]`);
          
          // CPU libre tras terminación
          procesoEjecutando = null;
          tiempoInicioEjecucion = null;
        }
        
        // TFP: Si duración > 0, generar segmento
        if (config && config.tfp > 0) {
          segmentos.push({
            process: 'SO',
            tStart: evento.tiempo,
            tEnd: evento.tiempo + config.tfp,
            kind: 'TFP'
          });
          console.log(`  📦 TFP segmento: SO [${evento.tiempo}-${evento.tiempo + config.tfp}]`);
        } else {
          console.log(`  ⚡ TFP instantáneo: ${evento.proceso} en ${evento.tiempo}`);
        }
      }
      
      // LLEGADA DE PROCESO: TIP
      else if (evento.tipo === TipoEvento.JOB_LLEGA) {
        if (config && config.tip > 0) {
          segmentos.push({
            process: 'SO',
            tStart: evento.tiempo,
            tEnd: evento.tiempo + config.tip,
            kind: 'TIP'
          });
          console.log(`  📦 TIP segmento: SO [${evento.tiempo}-${evento.tiempo + config.tip}]`);
        } else {
          console.log(`  ⚡ TIP instantáneo: ${evento.proceso} en ${evento.tiempo}`);
        }
      }
    }
    
    // Cerrar última ejecución si quedó abierta
    if (procesoEjecutando && tiempoInicioEjecucion !== null) {
      const tiempoFinal = Math.max(...eventosOrdenados.map(e => e.tiempo));
      segmentos.push({
        process: procesoEjecutando,
        tStart: tiempoInicioEjecucion,
        tEnd: tiempoFinal,
        kind: 'CPU'
      });
      console.log(`  📦 CPU (final): ${procesoEjecutando} [${tiempoInicioEjecucion}-${tiempoFinal}]`);
    }

    console.log(`📊 Total segmentos generados (solo tiempo real): ${segmentos.length}`);
    
    // Agregar segmentos OCIOSO para llenar huecos en la timeline
    const segmentosConOcioso = this.agregarSegmentosOcioso(segmentos);
    
    console.log(`📊 Segmentos finales con OCIOSO: ${segmentosConOcioso.length}`);
    return segmentosConOcioso;
  }

  /**
   * Agrega segmentos OCIOSO solo en huecos donde NO hay CPU activa
   * I/O puede ejecutarse en paralelo y no cuenta como "hueco" en la CPU
   */
  private static agregarSegmentosOcioso(segmentos: GanttSlice[]): GanttSlice[] {
    if (segmentos.length === 0) return segmentos;
    
    // Separar segmentos de CPU de segmentos de I/O
    const segmentosCPU = segmentos.filter(s => s.kind === 'CPU');
    const segmentosIO = segmentos.filter(s => s.kind === 'ES');
    
    console.log(`  🔍 Segmentos CPU: ${segmentosCPU.length}, I/O: ${segmentosIO.length}`);
    
    const resultado: GanttSlice[] = [];
    const tiempoInicial = 0;
    const tiempoFinal = Math.max(...segmentos.map(s => s.tEnd));
    
    // Ordenar solo segmentos de CPU para detectar huecos
    const segmentosCPUOrdenados = [...segmentosCPU].sort((a, b) => a.tStart - b.tStart);
    
    let tiempoActual = tiempoInicial;
    
    // Procesar huecos entre segmentos de CPU
    for (const segmentoCPU of segmentosCPUOrdenados) {
      // Agregar OCIOSO si hay hueco antes de este segmento de CPU
      if (tiempoActual < segmentoCPU.tStart) {
        resultado.push({
          process: 'SISTEMA',
          tStart: tiempoActual,
          tEnd: segmentoCPU.tStart,
          kind: 'OCIOSO'
        });
        console.log(`  📦 OCIOSO (CPU libre): [${tiempoActual}-${segmentoCPU.tStart}]`);
      }
      
      // Agregar el segmento de CPU
      resultado.push(segmentoCPU);
      tiempoActual = segmentoCPU.tEnd;
    }
    
    // Agregar OCIOSO final si la CPU está libre al final
    if (tiempoActual < tiempoFinal) {
      resultado.push({
        process: 'SISTEMA',
        tStart: tiempoActual,
        tEnd: tiempoFinal,
        kind: 'OCIOSO'
      });
      console.log(`  📦 OCIOSO final (CPU libre): [${tiempoActual}-${tiempoFinal}]`);
    }
    
    // Agregar todos los segmentos de I/O (sin modificar)
    resultado.push(...segmentosIO);
    
    // Ordenar el resultado final por tiempo de inicio
    return resultado.sort((a, b) => a.tStart - b.tStart);
  }

  /**
   * Determina el nuevo estado basándose en el tipo de evento
   */
  private static determinarNuevoEstado(evento: SimEvent, estadoActual: string): 'OCIOSO' | 'SO' | 'CPU' | 'ES' {
    // Eventos que representan actividad del Sistema Operativo
    const tiposEventosSO = [
      'INCORPORACION_SISTEMA',
      'DESPACHO', 
      'CAMBIO_CONTEXTO',
      'INICIO_TERMINACION',
      // Eventos de nuestro simulador que son actividad del SO
      TipoEvento.JOB_LLEGA,  // Arribo de trabajo - SO procesa
      TipoEvento.NUEVO_A_LISTO,  // Fin de TIP - actividad del SO
      TipoEvento.LISTO_A_CORRIENDO,  // Despacho - incluye TCP
      TipoEvento.DISPATCH  // Despacho genérico
    ];

    // Eventos que representan actividad de CPU por parte de los procesos
    const tiposEventosCPU = [
      'INICIO_RAFAGA_CPU',
      TipoEvento.FIN_RAFAGA_CPU
    ];

    // Eventos que representan actividad de E/S
    const tiposEventosES = [
      'INICIO_ES',
      'FIN_ES',
      'ATENCION_INTERRUPCION_ES',
      TipoEvento.CORRIENDO_A_BLOQUEADO,
      TipoEvento.BLOQUEADO_A_LISTO,
      TipoEvento.IO_COMPLETA
    ];

    // Eventos de terminación que podrían ser SO (TFP) o fin de proceso
    if (evento.tipo === TipoEvento.CORRIENDO_A_TERMINADO) {
      return 'SO';  // TFP es actividad del SO
    }

    if (tiposEventosSO.includes(evento.tipo)) {
      return 'SO';
    } else if (tiposEventosCPU.includes(evento.tipo)) {
      return 'CPU';
    } else if (tiposEventosES.includes(evento.tipo)) {
      return 'ES';
    }

    return 'OCIOSO';
  }

  /**
   * Determina el proceso asociado al evento
   */
  private static determinarNuevoProceso(evento: SimEvent, procesoActual: string | null): string | null {
    // Si el evento tiene un proceso específico, usarlo
    if (evento.proceso && evento.proceso !== 'SISTEMA') {
      return evento.proceso;
    }

    // Para eventos del sistema, mantener el proceso actual o usar SISTEMA
    if (evento.tipo === TipoEvento.DISPATCH || evento.tipo === TipoEvento.LISTO_A_CORRIENDO) {
      return procesoActual || 'SISTEMA';
    }

    return 'SISTEMA';
  }

  /**
   * Mapea estados internos a tipos de segmento de Gantt
   */
  private static mapearEstadoAKind(estado: string): GanttSlice['kind'] {
    switch (estado) {
      case 'CPU': return 'CPU';
      case 'ES': return 'ES';
      case 'SO': return 'TCP'; // Tiempo de Sistema Operativo como TCP genérico
      case 'OCIOSO': return 'OCIOSO';
      default: return 'OCIOSO';
    }
  }

  /**
   * Extrae lista única de procesos de los eventos
   */
  private static extraerProcesosUnicos(eventos: SimEvent[]): string[] {
    const procesos = new Set<string>();
    
    for (const evento of eventos) {
      if (evento.proceso && evento.proceso !== 'SISTEMA') {
        procesos.add(evento.proceso);
      }
    }
    
    return Array.from(procesos);
  }

  /**
   * Calcula el tiempo total de la simulación
   */
  private static calcularTiempoTotal(segmentos: GanttSlice[]): number {
    if (segmentos.length === 0) return 0;
    return Math.max(...segmentos.map(s => s.tEnd));
  }

  /**
   * Calcula estadísticas del diagrama de Gantt
   */
  private static calcularEstadisticasGantt(segmentos: GanttSlice[], tiempoTotal: number): EstadisticasGantt {
    if (tiempoTotal === 0) {
      return {
        utilizacionCPU: 0,
        tiempoOcioso: 0,
        tiempoSO: 0,
        segmentosPorProceso: new Map(),
        duracionPromedioPorTipo: new Map()
      };
    }

    let tiempoCPU = 0;
    let tiempoOcioso = 0;
    let tiempoSO = 0;
    const segmentosPorProceso = new Map<string, number>();
    const tiempoPorTipo = new Map<string, number>();

    for (const segmento of segmentos) {
      const duracion = segmento.tEnd - segmento.tStart;

      // Acumular tiempo por tipo de actividad
      switch (segmento.kind) {
        case 'CPU':
          tiempoCPU += duracion;
          break;
        case 'ES':
          // I/O no cuenta como tiempo de CPU ni como ocioso
          break;
        case 'OCIOSO':
          tiempoOcioso += duracion;
          break;
        case 'TCP':
        case 'TIP':
        case 'TFP':
          // Ya no deberían existir estos segmentos, pero por si acaso
          tiempoSO += duracion;
          break;
      }

      // Contar segmentos por proceso
      const proceso = segmento.process;
      segmentosPorProceso.set(proceso, (segmentosPorProceso.get(proceso) || 0) + 1);

      // Acumular tiempo por tipo para promedio
      const tipo = segmento.kind;
      tiempoPorTipo.set(tipo, (tiempoPorTipo.get(tipo) || 0) + duracion);
    }

    // Calcular duraciones promedio por tipo
    const duracionPromedioPorTipo = new Map<string, number>();
    for (const [tipo, tiempoTotal] of tiempoPorTipo) {
      const segmentosDeTipo = segmentos.filter(s => s.kind === tipo).length;
      if (segmentosDeTipo > 0) {
        duracionPromedioPorTipo.set(tipo, tiempoTotal / segmentosDeTipo);
      }
    }

    return {
      utilizacionCPU: (tiempoCPU / tiempoTotal) * 100,
      tiempoOcioso,
      tiempoSO,
      segmentosPorProceso,
      duracionPromedioPorTipo
    };
  }

  /**
   * Valida la consistencia del diagrama de Gantt
   */
  static validarDiagramaGantt(diagrama: DiagramaGantt): string[] {
    const errores: string[] = [];

    // Validar que no hay solapamientos
    const segmentosOrdenados = [...diagrama.segmentos].sort((a, b) => a.tStart - b.tStart);
    
    for (let i = 1; i < segmentosOrdenados.length; i++) {
      const anterior = segmentosOrdenados[i-1];
      const actual = segmentosOrdenados[i];
      
      if (actual.tStart < anterior.tEnd) {
        errores.push(`Solapamiento detectado: ${anterior.process} (${anterior.tStart}-${anterior.tEnd}) y ${actual.process} (${actual.tStart}-${actual.tEnd})`);
      }
    }

    // Validar que todos los segmentos tienen duración positiva
    for (const segmento of diagrama.segmentos) {
      if (segmento.tEnd <= segmento.tStart) {
        errores.push(`Segmento inválido: ${segmento.process} tiene duración <= 0`);
      }
    }

    // Validar que el tiempo total es consistente
    const tiempoCalculado = this.calcularTiempoTotal(diagrama.segmentos);
    if (Math.abs(tiempoCalculado - diagrama.tiempoTotal) > 0.01) {
      errores.push(`Inconsistencia en tiempo total: calculado=${tiempoCalculado}, declarado=${diagrama.tiempoTotal}`);
    }

    return errores;
  }

  /**
   * Optimiza el diagrama de Gantt combinando segmentos adyacentes del mismo tipo
   */
  static optimizarDiagramaGantt(diagrama: DiagramaGantt): DiagramaGantt {
    const segmentosOptimizados: GanttSlice[] = [];
    const segmentosOrdenados = [...diagrama.segmentos].sort((a, b) => a.tStart - b.tStart);

    let segmentoActual: GanttSlice | null = null;

    for (const segmento of segmentosOrdenados) {
      if (!segmentoActual) {
        segmentoActual = { ...segmento };
        continue;
      }

      // Combinar si es el mismo proceso y tipo, y son adyacentes
      if (segmentoActual.process === segmento.process && 
          segmentoActual.kind === segmento.kind &&
          segmentoActual.tEnd === segmento.tStart) {
        segmentoActual.tEnd = segmento.tEnd;
      } else {
        segmentosOptimizados.push(segmentoActual);
        segmentoActual = { ...segmento };
      }
    }

    // Agregar último segmento
    if (segmentoActual) {
      segmentosOptimizados.push(segmentoActual);
    }

    return {
      ...diagrama,
      segmentos: segmentosOptimizados,
      estadisticas: this.calcularEstadisticasGantt(segmentosOptimizados, diagrama.tiempoTotal)
    };
  }
}
