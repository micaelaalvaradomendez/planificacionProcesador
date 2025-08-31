/**
 * Constructor de Gantt a partir de Eventos de Exportación
 * 
 * Este módulo implementa la construcción de diagramas de Gantt 
 * directamente a partir de los eventos registrados por el sistema,
 * garantizando que no haya solapes en la línea temporal.
 */

import type { EventoLog } from './eventLogger.js';
import type { GanttSlice } from '../../model/types.js';

export interface DiagramaGanttEventos {
  segmentos: GanttSlice[];
  tiempoTotal: number;
  procesos: string[];
  estadisticas: {
    utilizacionCPU: number;
    tiempoOcioso: number;
    tiempoSO: number;
    distribucionTiempos: Record<string, number>;
  };
  validacion: {
    sinSolapes: boolean;
    errores: string[];
    advertencias: string[];
  };
}

/**
 * Construye un diagrama de Gantt completo a partir de eventos de exportación
 * garantizando que no haya solapes en la línea temporal
 */
export function construirGanttDesdeEventos(eventos: EventoLog[]): DiagramaGanttEventos {
  console.log(`🔧 Construyendo Gantt desde ${eventos.length} eventos...`);

  if (eventos.length === 0) {
    return {
      segmentos: [],
      tiempoTotal: 0,
      procesos: [],
      estadisticas: {
        utilizacionCPU: 0,
        tiempoOcioso: 0,
        tiempoSO: 0,
        distribucionTiempos: {}
      },
      validacion: {
        sinSolapes: true,
        errores: [],
        advertencias: ['No hay eventos para procesar']
      }
    };
  }

  // 1. Ordenar eventos cronológicamente
  const eventosOrdenados = [...eventos].sort((a, b) => a.timestamp - b.timestamp);
  
  // 2. Extraer información de procesos y tiempo total
  const procesos = extraerProcesosDesdeEventos(eventosOrdenados);
  const tiempoTotal = Math.max(...eventosOrdenados.map(e => e.timestamp));

  // 3. Construir segmentos de la línea temporal
  const segmentos = construirSegmentosTemporales(eventosOrdenados, tiempoTotal);

  // 4. Validar que no hay solapes
  const validacion = validarLineaTemporal(segmentos);

  // 5. Calcular estadísticas
  const estadisticas = calcularEstadisticasGantt(segmentos, tiempoTotal);

  console.log(`✅ Gantt construido: ${segmentos.length} segmentos, ${procesos.length} procesos`);

  return {
    segmentos: segmentos.sort((a, b) => a.tStart - b.tStart),
    tiempoTotal,
    procesos: procesos.sort(),
    estadisticas,
    validacion
  };
}

/**
 * Extrae la lista única de procesos desde los eventos
 */
function extraerProcesosDesdeEventos(eventos: EventoLog[]): string[] {
  const procesos = new Set<string>();
  
  for (const evento of eventos) {
    if (evento.proceso && evento.proceso !== 'SISTEMA' && evento.proceso !== '-') {
      procesos.add(evento.proceso);
    }
  }
  
  return Array.from(procesos);
}

/**
 * Construye segmentos temporales sin solapes a partir de eventos
 */
function construirSegmentosTemporales(eventos: EventoLog[], tiempoTotal: number): GanttSlice[] {
  const segmentos: GanttSlice[] = [];
  const estadoCPU = new EstadoCPUTracker();
  
  let tiempoActual = 0;

  for (const evento of eventos) {
    // Completar tiempo entre eventos con estado actual
    if (evento.timestamp > tiempoActual) {
      const segmentoIntermedio = estadoCPU.generarSegmento(tiempoActual, evento.timestamp);
      if (segmentoIntermedio) {
        segmentos.push(segmentoIntermedio);
      }
    }

    // Procesar el evento y actualizar estado
    estadoCPU.procesarEvento(evento);
    tiempoActual = evento.timestamp;
  }

  // Completar hasta el final si es necesario
  if (tiempoActual < tiempoTotal) {
    const segmentoFinal = estadoCPU.generarSegmento(tiempoActual, tiempoTotal);
    if (segmentoFinal) {
      segmentos.push(segmentoFinal);
    }
  }

  return optimizarSegmentos(segmentos);
}

/**
 * Tracker del estado de la CPU para construcción de segmentos
 */
class EstadoCPUTracker {
  private estadoActual: 'OCIOSO' | 'SO' | 'CPU' | 'ES' = 'OCIOSO';
  private procesoActual: string | null = null;
  
  procesarEvento(evento: EventoLog): void {
    // Determinar nuevo estado basado en el tipo de evento
    switch (evento.tipo) {
      // Eventos que inician actividad del SO
      case 'Arribo':
      case 'Incorporación Sistema':
      case 'Cambio Contexto':
      case 'Terminación Proceso':
        this.estadoActual = 'SO';
        this.procesoActual = evento.proceso;
        break;

      // Eventos que inician ejecución en CPU
      case 'Despacho':
      case 'Inicio Ráfaga CPU':
        this.estadoActual = 'CPU';
        this.procesoActual = evento.proceso;
        break;

      // Eventos que inician E/S
      case 'Inicio E/S':
        this.estadoActual = 'ES';
        this.procesoActual = evento.proceso;
        break;

      // Eventos que terminan actividades
      case 'Fin Ráfaga CPU':
      case 'Agotamiento Quantum':
        this.estadoActual = 'SO'; // Vuelve al SO para decidir qué hacer
        break;

      case 'Fin E/S':
      case 'Atención Interrupción E/S':
        this.estadoActual = 'SO'; // Manejo de interrupción por el SO
        this.procesoActual = evento.proceso;
        break;

      default:
        // Mantener estado actual para eventos no reconocidos
        break;
    }
  }

  generarSegmento(tiempoInicio: number, tiempoFin: number): GanttSlice | null {
    if (tiempoInicio >= tiempoFin) {
      return null;
    }

    return {
      process: this.procesoActual || 'SISTEMA',
      tStart: tiempoInicio,
      tEnd: tiempoFin,
      kind: this.mapearEstadoAKind()
    };
  }

  private mapearEstadoAKind(): GanttSlice['kind'] {
    switch (this.estadoActual) {
      case 'OCIOSO': return 'OCIOSO';
      case 'SO': return 'TIP'; // Podría ser TIP, TFP, TCP - simplificamos
      case 'CPU': return 'CPU';
      case 'ES': return 'ES';
    }
  }
}

/**
 * Optimiza segmentos consecutivos del mismo tipo
 */
function optimizarSegmentos(segmentos: GanttSlice[]): GanttSlice[] {
  if (segmentos.length === 0) return [];

  const optimizados: GanttSlice[] = [];
  let segmentoActual = { ...segmentos[0] };

  for (let i = 1; i < segmentos.length; i++) {
    const siguiente = segmentos[i];

    // Verificar si podemos fusionar segmentos consecutivos
    if (
      segmentoActual.tEnd === siguiente.tStart &&
      segmentoActual.process === siguiente.process &&
      segmentoActual.kind === siguiente.kind
    ) {
      // Fusionar extendiendo el segmento actual
      segmentoActual.tEnd = siguiente.tEnd;
    } else {
      // No se puede fusionar, guardar el actual e iniciar uno nuevo
      optimizados.push(segmentoActual);
      segmentoActual = { ...siguiente };
    }
  }

  // Agregar el último segmento
  optimizados.push(segmentoActual);

  return optimizados;
}

/**
 * Valida que la línea temporal no tenga solapes
 */
function validarLineaTemporal(segmentos: GanttSlice[]): {
  sinSolapes: boolean;
  errores: string[];
  advertencias: string[];
} {
  const errores: string[] = [];
  const advertencias: string[] = [];

  // Verificar que no hay overlaps
  const segmentosOrdenados = [...segmentos].sort((a, b) => a.tStart - b.tStart);
  
  for (let i = 1; i < segmentosOrdenados.length; i++) {
    const actual = segmentosOrdenados[i];
    const anterior = segmentosOrdenados[i - 1];
    
    if (actual.tStart < anterior.tEnd) {
      errores.push(
        `Solape detectado: ${anterior.process} (${anterior.tStart}-${anterior.tEnd}) ` +
        `se solapa con ${actual.process} (${actual.tStart}-${actual.tEnd})`
      );
    }
    
    // Verificar gaps (advertencia)
    if (actual.tStart > anterior.tEnd) {
      advertencias.push(
        `Gap temporal detectado entre ${anterior.tEnd} y ${actual.tStart}`
      );
    }
  }

  // Verificar consistency temporal
  for (const segmento of segmentos) {
    if (segmento.tStart >= segmento.tEnd) {
      errores.push(
        `Segmento inválido: ${segmento.process} tiene tStart >= tEnd (${segmento.tStart} >= ${segmento.tEnd})`
      );
    }
  }

  return {
    sinSolapes: errores.length === 0,
    errores,
    advertencias
  };
}

/**
 * Calcula estadísticas del diagrama de Gantt
 */
function calcularEstadisticasGantt(segmentos: GanttSlice[], tiempoTotal: number): {
  utilizacionCPU: number;
  tiempoOcioso: number;
  tiempoSO: number;
  distribucionTiempos: Record<string, number>;
} {
  if (segmentos.length === 0 || tiempoTotal === 0) {
    return {
      utilizacionCPU: 0,
      tiempoOcioso: 0,
      tiempoSO: 0,
      distribucionTiempos: {}
    };
  }

  let tiempoCPU = 0;
  let tiempoOcioso = 0;
  let tiempoSO = 0;
  const distribucionTiempos: Record<string, number> = {};

  for (const segmento of segmentos) {
    const duracion = segmento.tEnd - segmento.tStart;
    
    // Contabilizar por tipo
    switch (segmento.kind) {
      case 'CPU':
        tiempoCPU += duracion;
        break;
      case 'OCIOSO':
        tiempoOcioso += duracion;
        break;
      case 'TIP':
      case 'TFP':
      case 'TCP':
        tiempoSO += duracion;
        break;
      case 'ES':
        // E/S se cuenta como tiempo no de CPU
        break;
    }

    // Distribución por tipo
    const tipo = segmento.kind;
    distribucionTiempos[tipo] = (distribucionTiempos[tipo] || 0) + duracion;
  }

  const utilizacionCPU = tiempoTotal > 0 ? (tiempoCPU / tiempoTotal) * 100 : 0;

  return {
    utilizacionCPU,
    tiempoOcioso,
    tiempoSO,
    distribucionTiempos
  };
}

/**
 * Exporta el diagrama de Gantt en formato compatible con la UI
 */
export function exportarGanttParaVisualizacion(diagrama: DiagramaGanttEventos): {
  segmentos: Array<{
    proceso: string;
    tiempoInicio: number;
    tiempoFin: number;
    tipo: string;
    duracion: number;
  }>;
  metadata: {
    tiempoTotal: number;
    procesos: string[];
    estadisticas: typeof diagrama.estadisticas;
  };
} {
  return {
    segmentos: diagrama.segmentos.map(s => ({
      proceso: s.process,
      tiempoInicio: s.tStart,
      tiempoFin: s.tEnd,
      tipo: s.kind,
      duracion: s.tEnd - s.tStart
    })),
    metadata: {
      tiempoTotal: diagrama.tiempoTotal,
      procesos: diagrama.procesos,
      estadisticas: diagrama.estadisticas
    }
  };
}
