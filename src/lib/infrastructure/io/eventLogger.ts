/**
 * Exportador de logs de eventos del simulador
 * Genera logs en formato JSON y CSV con todos los eventos del sistema
 */

import type { SimEvent } from '../../domain/types';
import type { EventoInterno } from '../../core/state';

export interface EventoLog {
  timestamp: number;
  tipo: string;
  proceso: string;
  descripcion: string;
  detalles?: string;
}

/**
 * Mapea los tipos de eventos internos a nombres más descriptivos para el log
 */
const MAPEO_TIPOS_EVENTOS = {
  'Arribo': 'Arribo',
  'FinTIP': 'Incorporación Sistema',
  'Despacho': 'Despacho',
  'FinRafagaCPU': 'Fin Ráfaga CPU',
  'AgotamientoQuantum': 'Agotamiento Quantum',
  'FinES': 'Fin E/S',
  'FinTFP': 'Terminación Proceso'
} as const;

/**
 * Mapea los tipos de eventos de exportación a nombres descriptivos
 */
const MAPEO_TIPOS_EXPORTACION = {
  'ARRIBO_TRABAJO': 'Arribo',
  'INCORPORACION_SISTEMA': 'Incorporación Sistema',
  'DESPACHO': 'Despacho',
  'CAMBIO_CONTEXTO': 'Cambio Contexto',
  'INICIO_RAFAGA_CPU': 'Inicio Ráfaga CPU',
  'FIN_RAFAGA_CPU': 'Fin Ráfaga CPU',
  'AGOTAMIENTO_QUANTUM': 'Agotamiento Quantum',
  'INICIO_ES': 'Inicio E/S',
  'FIN_ES': 'Fin E/S',
  'ATENCION_INTERRUPCION_ES': 'Atención Interrupción E/S',
  'EXPROPIACION': 'Expropiación',
  'INICIO_TERMINACION': 'Inicio Terminación',
  'TERMINACION_PROCESO': 'Terminación Proceso'
} as const;

/**
 * Convierte eventos internos del simulador a formato de log estructurado
 */
export function convertirEventosInternos(eventos: EventoInterno[]): EventoLog[] {
  return eventos.map(evento => ({
    timestamp: evento.tiempo,
    tipo: MAPEO_TIPOS_EVENTOS[evento.tipo] || evento.tipo,
    proceso: evento.proceso || 'SISTEMA',
    descripcion: generarDescripcionEvento(evento),
    detalles: evento.extra
  }));
}

/**
 * Convierte eventos de exportación del simulador a formato de log estructurado
 */
export function convertirEventosExportacion(eventos: SimEvent[]): EventoLog[] {
  return eventos.map(evento => ({
    timestamp: evento.tiempo,
    tipo: MAPEO_TIPOS_EXPORTACION[evento.tipo] || evento.tipo,
    proceso: evento.proceso || 'SISTEMA',
    descripcion: generarDescripcionEventoExportacion(evento),
    detalles: evento.extra
  }));
}

/**
 * Genera una descripción legible para un evento interno
 */
function generarDescripcionEvento(evento: EventoInterno): string {
  const proceso = evento.proceso || 'SISTEMA';
  
  switch (evento.tipo) {
    case 'Arribo':
      return `Proceso ${proceso} llega al sistema`;
    case 'FinTIP':
      return `Proceso ${proceso} completó TIP, incorporado al sistema`;
    case 'Despacho':
      return `Proceso ${proceso} despachado para ejecución`;
    case 'FinRafagaCPU':
      return `Proceso ${proceso} completó ráfaga de CPU`;
    case 'AgotamientoQuantum':
      return `Proceso ${proceso} agotó su quantum`;
    case 'FinES':
      return `Proceso ${proceso} completó E/S`;
    case 'FinTFP':
      return `Proceso ${proceso} completó TFP, terminado`;
    default:
      return `Evento ${evento.tipo} del proceso ${proceso}`;
  }
}

/**
 * Genera una descripción legible para un evento de exportación
 */
function generarDescripcionEventoExportacion(evento: SimEvent): string {
  const proceso = evento.proceso || 'SISTEMA';
  
  switch (evento.tipo) {
    case 'ARRIBO_TRABAJO':
      return `Proceso ${proceso} arriba al sistema`;
    case 'INCORPORACION_SISTEMA':
      return `Proceso ${proceso} incorporado al sistema`;
    case 'DESPACHO':
      return `Proceso ${proceso} despachado`;
    case 'CAMBIO_CONTEXTO':
      return `Cambio de contexto para proceso ${proceso}`;
    case 'FIN_RAFAGA_CPU':
      return `Proceso ${proceso} termina ráfaga CPU`;
    case 'AGOTAMIENTO_QUANTUM':
      return `Proceso ${proceso} agota quantum`;
    case 'FIN_ES':
      return `Proceso ${proceso} termina E/S`;
    case 'EXPROPIACION':
      return `Proceso ${proceso} expropia la CPU`;
    case 'INICIO_TERMINACION':
      return `Proceso ${proceso} inicia terminación`;
    case 'TERMINACION_PROCESO':
      return `Proceso ${proceso} terminado`;
    default:
      return `Evento ${evento.tipo} del proceso ${proceso}`;
  }
}

/**
 * Combina y ordena eventos internos y de exportación
 */
export function combinarEventos(internos: EventoInterno[], exportacion: SimEvent[]): EventoLog[] {
  const eventosInternos = convertirEventosInternos(internos);
  const eventosExportacion = convertirEventosExportacion(exportacion);
  
  // Combinar y ordenar por timestamp, luego por tipo para estabilidad
  const todosCombinados = [...eventosInternos, ...eventosExportacion];
  
  return todosCombinados.sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    // Orden secundario por tipo de evento para eventos simultáneos
    return a.tipo.localeCompare(b.tipo);
  });
}

/**
 * Exporta eventos a formato JSON
 */
export function exportarEventosJSON(eventos: EventoLog[]): string {
  const logData = {
    metadata: {
      generadoEn: new Date().toISOString(),
      totalEventos: eventos.length,
      simulador: 'Planificador de Procesos v1.0'
    },
    eventos: eventos.map(evento => ({
      tiempo: evento.timestamp,
      tipo: evento.tipo,
      proceso: evento.proceso,
      descripcion: evento.descripcion,
      detalles: evento.detalles || null
    }))
  };
  
  return JSON.stringify(logData, null, 2);
}

/**
 * Exporta eventos a formato CSV
 */
export function exportarEventosCSV(eventos: EventoLog[]): string {
  const headers = ['Tiempo', 'Tipo', 'Proceso', 'Descripción', 'Detalles'];
  const filas = eventos.map(evento => [
    evento.timestamp.toString(),
    evento.tipo,
    evento.proceso,
    `"${evento.descripcion}"`, // Escapar comillas en CSV
    `"${evento.detalles || ''}"`
  ]);
  
  const csvContent = [
    headers.join(','),
    ...filas.map(fila => fila.join(','))
  ].join('\n');
  
  return csvContent;
}

/**
 * Filtra eventos por tipo específico
 */
export function filtrarEventosPorTipo(eventos: EventoLog[], tipos: string[]): EventoLog[] {
  return eventos.filter(evento => tipos.includes(evento.tipo));
}

/**
 * Filtra eventos por proceso específico
 */
export function filtrarEventosPorProceso(eventos: EventoLog[], procesos: string[]): EventoLog[] {
  return eventos.filter(evento => procesos.includes(evento.proceso));
}

/**
 * Filtra eventos por rango de tiempo
 */
export function filtrarEventosPorTiempo(eventos: EventoLog[], inicio: number, fin: number): EventoLog[] {
  return eventos.filter(evento => evento.timestamp >= inicio && evento.timestamp <= fin);
}

/**
 * Genera resumen estadístico de eventos
 */
export function generarResumenEventos(eventos: EventoLog[]): {
  totalEventos: number;
  eventosPorTipo: Record<string, number>;
  eventosPorProceso: Record<string, number>;
  tiempoInicio: number;
  tiempoFin: number;
  duracionTotal: number;
} {
  const eventosPorTipo: Record<string, number> = {};
  const eventosPorProceso: Record<string, number> = {};
  
  for (const evento of eventos) {
    eventosPorTipo[evento.tipo] = (eventosPorTipo[evento.tipo] || 0) + 1;
    eventosPorProceso[evento.proceso] = (eventosPorProceso[evento.proceso] || 0) + 1;
  }
  
  const tiempos = eventos.map(e => e.timestamp);
  const tiempoInicio = Math.min(...tiempos);
  const tiempoFin = Math.max(...tiempos);
  
  return {
    totalEventos: eventos.length,
    eventosPorTipo,
    eventosPorProceso,
    tiempoInicio,
    tiempoFin,
    duracionTotal: tiempoFin - tiempoInicio
  };
}

/**
 * Exporta eventos a un archivo JSON en el sistema de archivos
 */
export async function exportarEventosAArchivoJSON(
  eventos: EventoLog[], 
  rutaArchivo: string = 'eventos.json'
): Promise<void> {
  if (typeof window !== 'undefined') {
    // Entorno del navegador - descarga automática
    const json = exportarEventosJSON(eventos);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = rutaArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    // Entorno Node.js - escritura directa
    const fs = await import('fs/promises');
    const json = exportarEventosJSON(eventos);
    await fs.writeFile(rutaArchivo, json, 'utf-8');
  }
}

/**
 * Exporta eventos a un archivo CSV en el sistema de archivos
 */
export async function exportarEventosAArchivoCSV(
  eventos: EventoLog[], 
  rutaArchivo: string = 'eventos.csv'
): Promise<void> {
  if (typeof window !== 'undefined') {
    // Entorno del navegador - descarga automática
    const csv = exportarEventosCSV(eventos);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = rutaArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    // Entorno Node.js - escritura directa
    const fs = await import('fs/promises');
    const csv = exportarEventosCSV(eventos);
    await fs.writeFile(rutaArchivo, csv, 'utf-8');
  }
}

/**
 * Exporta eventos a ambos formatos (JSON y CSV) simultaneamente
 */
export async function exportarEventosAArchivos(
  eventos: EventoLog[],
  nombreBase: string = 'eventos',
  carpetaDestino: string = './salida'
): Promise<{ archivoJSON: string; archivoCSV: string }> {
  const archivoJSON = `${carpetaDestino}/${nombreBase}.json`;
  const archivoCSV = `${carpetaDestino}/${nombreBase}.csv`;
  
  // Crear carpeta si no existe (solo en Node.js)
  if (typeof window === 'undefined') {
    const fs = await import('fs/promises');
    try {
      await fs.mkdir(carpetaDestino, { recursive: true });
    } catch (error) {
      // La carpeta ya existe
    }
  }
  
  await Promise.all([
    exportarEventosAArchivoJSON(eventos, archivoJSON),
    exportarEventosAArchivoCSV(eventos, archivoCSV)
  ]);
  
  return { archivoJSON, archivoCSV };
}
