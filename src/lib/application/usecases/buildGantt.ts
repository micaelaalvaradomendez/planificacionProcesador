/**
 * Caso de uso: Construir datos para diagrama de Gantt
 * Convierte eventos de simulación en segmentos visualizables del diagrama de Gantt
 */

import type { SimEvent, GanttSlice } from '../../model/types';

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
 * Construye un diagrama de Gantt completo a partir de eventos de simulación
 */
export function construirDiagramaGantt(eventos: SimEvent[]): DiagramaGantt {
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

  const segmentos = generarSegmentosGantt(eventos);
  const procesos = extraerProcesosUnicos(eventos);
  const tiempoTotal = calcularTiempoTotal(segmentos);
  const estadisticas = calcularEstadisticasGantt(segmentos, tiempoTotal);

  return {
    segmentos: segmentos.sort((a, b) => a.tStart - b.tStart),
    tiempoTotal,
    procesos: procesos.sort(),
    estadisticas
  };
}

/**
 * Genera segmentos de Gantt a partir de eventos ordenados cronológicamente
 */
function generarSegmentosGantt(eventos: SimEvent[]): GanttSlice[] {
  console.log('🔄 Generando segmentos desde eventos:', eventos.length);
  
  const segmentos: GanttSlice[] = [];
  const eventosOrdenados = [...eventos].sort((a, b) => a.tiempo - b.tiempo);
  
  let estadoActual: 'OCIOSO' | 'SO' | 'CPU' | 'ES' = 'OCIOSO';
  let procesoActual: string | null = null;
  let tiempoInicioSegmento = 0;
  let ultimoTiempo = 0;

  console.log('📊 Primeros eventos:', eventosOrdenados.slice(0, 3));

  for (const evento of eventosOrdenados) {
    // Cerrar segmento anterior si hay cambio de estado
    if (evento.tiempo > ultimoTiempo && estadoActual !== 'OCIOSO') {
      segmentos.push({
        process: procesoActual || 'SISTEMA',
        tStart: tiempoInicioSegmento,
        tEnd: ultimoTiempo,
        kind: mapearEstadoAKind(estadoActual)
      });
    }

    // Procesar evento actual
    const nuevoEstado = determinarNuevoEstado(evento, estadoActual);
    const nuevoProceso = determinarNuevoProceso(evento, procesoActual);

    // Iniciar nuevo segmento si hay cambio
    if (nuevoEstado !== estadoActual || nuevoProceso !== procesoActual) {
      estadoActual = nuevoEstado;
      procesoActual = nuevoProceso;
      tiempoInicioSegmento = evento.tiempo;
    }

    ultimoTiempo = evento.tiempo;
  }

  // Cerrar último segmento si existe
  if (estadoActual !== 'OCIOSO' && ultimoTiempo > tiempoInicioSegmento) {
    segmentos.push({
      process: procesoActual || 'SISTEMA',
      tStart: tiempoInicioSegmento,
      tEnd: ultimoTiempo,
      kind: mapearEstadoAKind(estadoActual)
    });
  }

  return completarSegmentosConOcioso(segmentos, ultimoTiempo);
}

/**
 * Determina el nuevo estado del sistema basado en el evento
 */
function determinarNuevoEstado(
  evento: SimEvent, 
  estadoAnterior: 'OCIOSO' | 'SO' | 'CPU' | 'ES'
): 'OCIOSO' | 'SO' | 'CPU' | 'ES' {
  switch (evento.tipo) {
    case 'ARRIBO_TRABAJO':
    case 'INCORPORACION_SISTEMA':
    case 'DESPACHO':
    case 'CAMBIO_CONTEXTO':
    case 'TERMINACION_PROCESO':
      return 'SO';
    
    case 'INICIO_RAFAGA_CPU':
      return 'CPU';
    
    case 'FIN_RAFAGA_CPU':
      return 'SO'; // TFP o preparación para E/S
    
    case 'INICIO_ES':
      return 'ES';
    
    case 'FIN_ES':
    case 'ATENCION_INTERRUPCION_ES':
      return 'SO'; // Manejo de interrupción
    
    case 'AGOTAMIENTO_QUANTUM':
      return 'SO'; // Cambio de contexto
    
    default:
      return estadoAnterior;
  }
}

/**
 * Determina qué proceso está asociado al evento actual
 */
function determinarNuevoProceso(
  evento: SimEvent, 
  procesoAnterior: string | null
): string | null {
  switch (evento.tipo) {
    case 'INICIO_RAFAGA_CPU':
    case 'INICIO_ES':
      return evento.proceso;
    
    case 'FIN_RAFAGA_CPU':
    case 'FIN_ES':
    case 'AGOTAMIENTO_QUANTUM':
    case 'TERMINACION_PROCESO':
      return null; // El proceso deja de usar recursos
    
    case 'ARRIBO_TRABAJO':
    case 'INCORPORACION_SISTEMA':
    case 'DESPACHO':
    case 'CAMBIO_CONTEXTO':
    case 'ATENCION_INTERRUPCION_ES':
      return evento.proceso;
    
    default:
      return procesoAnterior;
  }
}

/**
 * Mapea estados internos a tipos de segmento del Gantt
 */
function mapearEstadoAKind(estado: 'OCIOSO' | 'SO' | 'CPU' | 'ES'): GanttSlice['kind'] {
  console.log('🔍 Mapeando estado:', estado);
  switch (estado) {
    case 'OCIOSO': 
      return 'OCIOSO';
    case 'SO': 
      return 'TIP'; // TIP es uno de los posibles estados del SO
    case 'CPU': 
      return 'CPU';
    case 'ES': 
      return 'ES';
    default:
      console.warn('Estado no reconocido:', estado);
      return 'OCIOSO';
  }
}

/**
 * Completa los espacios vacíos con segmentos de ocioso
 */
function completarSegmentosConOcioso(
  segmentos: GanttSlice[], 
  tiempoFinal: number
): GanttSlice[] {
  if (segmentos.length === 0) {
    return tiempoFinal > 0 ? [{
      process: 'SISTEMA',
      tStart: 0,
      tEnd: tiempoFinal,
      kind: 'OCIOSO'
    }] : [];
  }

  const segmentosCompletos: GanttSlice[] = [];
  let tiempoActual = 0;

  for (const segmento of segmentos.sort((a, b) => a.tStart - b.tStart)) {
    // Agregar ocioso si hay gap
    if (segmento.tStart > tiempoActual) {
      segmentosCompletos.push({
        process: 'SISTEMA',
        tStart: tiempoActual,
        tEnd: segmento.tStart,
        kind: 'OCIOSO'
      });
    }

    segmentosCompletos.push(segmento);
    tiempoActual = Math.max(tiempoActual, segmento.tEnd);
  }

  // Agregar ocioso final si es necesario
  if (tiempoActual < tiempoFinal) {
    segmentosCompletos.push({
      process: 'SISTEMA',
      tStart: tiempoActual,
      tEnd: tiempoFinal,
      kind: 'OCIOSO'
    });
  }

  return segmentosCompletos;
}

/**
 * Extrae lista única de procesos involucrados en la simulación
 */
function extraerProcesosUnicos(eventos: SimEvent[]): string[] {
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
function calcularTiempoTotal(segmentos: GanttSlice[]): number {
  if (segmentos.length === 0) return 0;
  
  return Math.max(...segmentos.map(s => s.tEnd));
}

/**
 * Calcula estadísticas detalladas del diagrama de Gantt
 */
function calcularEstadisticasGantt(
  segmentos: GanttSlice[], 
  tiempoTotal: number
): EstadisticasGantt {
  if (segmentos.length === 0 || tiempoTotal === 0) {
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
  const duracionPorTipo = new Map<string, number[]>();

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
    }

    // Contabilizar por proceso
    if (segmento.process !== 'SISTEMA') {
      segmentosPorProceso.set(
        segmento.process,
        (segmentosPorProceso.get(segmento.process) || 0) + 1
      );
    }

    // Recopilar duraciones por tipo
    const tipo = segmento.kind;
    if (!duracionPorTipo.has(tipo)) {
      duracionPorTipo.set(tipo, []);
    }
    duracionPorTipo.get(tipo)!.push(duracion);
  }

  // Calcular promedios
  const duracionPromedioPorTipo = new Map<string, number>();
  for (const [tipo, duraciones] of duracionPorTipo) {
    const promedio = duraciones.reduce((sum, d) => sum + d, 0) / duraciones.length;
    duracionPromedioPorTipo.set(tipo, promedio);
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
 * Valida la consistencia de un diagrama de Gantt
 */
export function validarDiagramaGantt(diagrama: DiagramaGantt): {
  valido: boolean;
  errores: string[];
  advertencias: string[];
} {
  const errores: string[] = [];
  const advertencias: string[] = [];

  // Verificar que no hay overlaps
  const segmentosOrdenados = [...diagrama.segmentos].sort((a, b) => a.tStart - b.tStart);
  
  for (let i = 1; i < segmentosOrdenados.length; i++) {
    const actual = segmentosOrdenados[i];
    const anterior = segmentosOrdenados[i - 1];
    
    if (actual.tStart < anterior.tEnd) {
      errores.push(
        `Overlap detectado: segmento ${anterior.process} (${anterior.tStart}-${anterior.tEnd}) ` +
        `se solapa con ${actual.process} (${actual.tStart}-${actual.tEnd})`
      );
    }
  }

  // Verificar consistency temporal
  for (const segmento of diagrama.segmentos) {
    if (segmento.tStart >= segmento.tEnd) {
      errores.push(
        `Segmento inválido: ${segmento.process} tiene tStart >= tEnd (${segmento.tStart} >= ${segmento.tEnd})`
      );
    }
  }

  // Advertencias de rendimiento
  if (diagrama.estadisticas.utilizacionCPU < 50) {
    advertencias.push(
      `Baja utilización de CPU (${diagrama.estadisticas.utilizacionCPU.toFixed(1)}%)`
    );
  }

  return {
    valido: errores.length === 0,
    errores,
    advertencias
  };
}
