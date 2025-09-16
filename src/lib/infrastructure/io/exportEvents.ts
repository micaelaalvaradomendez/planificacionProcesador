/**
 * Exportación de eventos de simulación
 * Proporciona funcionalidades para exportar los eventos generados durante la simulación
 */

import type { SimEvent } from '../../domain/types';
import { eventosACSV, eventoALineaCsv, ordenarEventosParaExportar, type CSVConfig } from './csvUtils';

/**
 * Formatos de exportación soportados
 */
export type FormatoExportacion = 'CSV' | 'JSON' | 'TXT';

/**
 * Configuración para la exportación de eventos
 */
export interface ConfiguracionExportacion {
  formato: FormatoExportacion;
  incluirHeader: boolean;
  separadorCSV: string;
  codificacion: string;
  filtros?: {
    tipoEvento?: string[];
    proceso?: string[];
    rangoTiempo?: [number, number];
  };
}

/**
 * Configuración por defecto para exportación
 */
export const DEFAULT_EXPORT_CONFIG: ConfiguracionExportacion = {
  formato: 'CSV',
  incluirHeader: true,
  separadorCSV: ';',
  codificacion: 'utf-8'
};

/**
 * Exporta eventos a formato CSV como Blob (versión legacy)
 */
export function exportarEventosCsv(eventos: SimEvent[]): Blob {
  const encabezado = 'tiempo;tipoEvento;proceso;extra';
  const lineas = ordenarEventosParaExportar(eventos).map(evento => eventoALineaCsv(evento));
  const csv = [encabezado, ...lineas].join('\n');
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}

/**
 * Exporta eventos a formato JSON como Blob (versión legacy)
 */
export function exportarEventosJson(eventos: SimEvent[]): Blob {
  const json = JSON.stringify(eventos, null, 2);
  return new Blob([json], { type: 'application/json;charset=utf-8' });
}

/**
 * Exporta eventos a formato CSV (nueva versión)
 */
export function exportarEventosCSV(
  eventos: SimEvent[], 
  config: Partial<CSVConfig> = {}
): string {
  const csvConfig: CSVConfig = {
    separator: config.separator || ';',
    encoding: config.encoding || 'utf-8',
    withHeader: config.withHeader ?? true,
    lineEnding: config.lineEnding || '\n'
  };
  
  console.log(`📊 Exportando ${eventos.length} eventos a CSV`);
  return eventosACSV(eventos, csvConfig);
}

/**
 * Exporta eventos a formato JSON (nueva versión)
 */
export function exportarEventosJSON(eventos: SimEvent[]): string {
  console.log(`📊 Exportando ${eventos.length} eventos a JSON`);
  
  const exportData = {
    metadata: {
      totalEventos: eventos.length,
      fechaGeneracion: new Date().toISOString(),
      version: '1.0'
    },
    eventos: eventos.map(evento => ({
      tiempo: evento.tiempo,
      tipo: evento.tipo,
      proceso: evento.proceso,
      extra: evento.extra || null
    }))
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Exporta eventos a formato de texto plano
 */
export function exportarEventosTXT(eventos: SimEvent[]): string {
  console.log(`📊 Exportando ${eventos.length} eventos a TXT`);
  
  let texto = `=== EVENTOS DE SIMULACIÓN ===\n`;
  texto += `Total de eventos: ${eventos.length}\n`;
  texto += `Generado: ${new Date().toLocaleString()}\n\n`;
  
  // Ordenar eventos por tiempo
  const eventosOrdenados = ordenarEventosParaExportar(eventos);
  
  for (const evento of eventosOrdenados) {
    texto += `[${evento.tiempo.toString().padStart(3, ' ')}] `;
    texto += `${evento.tipo.padEnd(15, ' ')} `;
    texto += `${evento.proceso.padEnd(10, ' ')} `;
    if (evento.extra) {
      texto += `| ${evento.extra}`;
    }
    texto += '\n';
  }
  
  return texto;
}

/**
 * Exporta eventos como CSV y devuelve un Blob
 */
export function exportarEventosComoCSV(
  eventos: SimEvent[], 
  config: ConfiguracionExportacion
): Blob {
  const csvConfig: CSVConfig = {
    separator: config.separadorCSV,
    encoding: config.codificacion,
    withHeader: config.incluirHeader,
    lineEnding: '\n'
  };
  
  const csvContent = exportarEventosCSV(eventos, csvConfig);
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
}

/**
 * Exporta eventos como TXT y devuelve un Blob
 */
export function exportarEventosComoTXT(
  eventos: SimEvent[], 
  config: ConfiguracionExportacion
): Blob {
  const txtContent = exportarEventosTXT(eventos);
  return new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
}

/**
 * Filtra eventos según los criterios especificados
 */
export function filtrarEventos(
  eventos: SimEvent[], 
  filtros: ConfiguracionExportacion['filtros']
): SimEvent[] {
  if (!filtros) return eventos;
  
  return eventos.filter(evento => {
    // Filtro por tipo de evento
    if (filtros.tipoEvento && !filtros.tipoEvento.includes(evento.tipo)) {
      return false;
    }
    
    // Filtro por proceso
    if (filtros.proceso && !filtros.proceso.includes(evento.proceso)) {
      return false;
    }
    
    // Filtro por rango de tiempo
    if (filtros.rangoTiempo) {
      const [inicio, fin] = filtros.rangoTiempo;
      if (evento.tiempo < inicio || evento.tiempo > fin) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Exporta eventos según la configuración especificada
 */
export function exportarEventos(
  eventos: SimEvent[], 
  config: Partial<ConfiguracionExportacion> = {}
): string {
  const configuracion = { ...DEFAULT_EXPORT_CONFIG, ...config };
  
  console.log(`🔄 Configurando exportación: ${configuracion.formato}`);
  
  // Aplicar filtros si están especificados
  const eventosFiltrados = filtrarEventos(eventos, configuracion.filtros);
  
  console.log(`📋 Eventos después de filtrar: ${eventosFiltrados.length}/${eventos.length}`);
  
  switch (configuracion.formato) {
    case 'CSV':
      return exportarEventosCSV(eventosFiltrados, {
        separator: configuracion.separadorCSV,
        withHeader: configuracion.incluirHeader,
        encoding: configuracion.codificacion
      });
      
    case 'JSON':
      return exportarEventosJSON(eventosFiltrados);
      
    case 'TXT':
      return exportarEventosTXT(eventosFiltrados);
      
    default:
      throw new Error(`Formato de exportación no soportado: ${configuracion.formato}`);
  }
}

/**
 * Genera estadísticas básicas de los eventos
 */
export function generarEstadisticasEventos(eventos: SimEvent[]): {
  totalEventos: number;
  tiposEvento: Record<string, number>;
  procesosMasActivos: string[];
  rangoTemporal: [number, number];
  distribucionTemporal: Record<string, number>;
} {
  const tiposEvento: Record<string, number> = {};
  const procesoContador: Record<string, number> = {};
  const distribucionTemporal: Record<string, number> = {};
  
  let tiempoMin = Infinity;
  let tiempoMax = -Infinity;
  
  for (const evento of eventos) {
    // Contar tipos de evento
    tiposEvento[evento.tipo] = (tiposEvento[evento.tipo] || 0) + 1;
    
    // Contar eventos por proceso
    procesoContador[evento.proceso] = (procesoContador[evento.proceso] || 0) + 1;
    
    // Rango temporal
    tiempoMin = Math.min(tiempoMin, evento.tiempo);
    tiempoMax = Math.max(tiempoMax, evento.tiempo);
    
    // Distribución temporal (por rangos de 10 unidades)
    const rango = Math.floor(evento.tiempo / 10) * 10;
    const rangoKey = `${rango}-${rango + 9}`;
    distribucionTemporal[rangoKey] = (distribucionTemporal[rangoKey] || 0) + 1;
  }
  
  // Obtener procesos más activos (top 5)
  const procesosMasActivos = Object.entries(procesoContador)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([proceso]) => proceso);
  
  return {
    totalEventos: eventos.length,
    tiposEvento,
    procesosMasActivos,
    rangoTemporal: [tiempoMin, tiempoMax],
    distribucionTemporal
  };
}
