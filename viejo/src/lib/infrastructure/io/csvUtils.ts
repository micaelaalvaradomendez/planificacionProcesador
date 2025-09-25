/**
 * Utilidades para manejo y exportación de archivos CSV
 * Centraliza toda la lógica de conversión a formato CSV
 */

import type { SimEvent } from '../../domain/types';

/**
 * Configuración para la exportación de CSV
 */
export interface CSVConfig {
  separator: string;
  encoding: string;
  withHeader: boolean;
  lineEnding: string;
}

/**
 * Configuración por defecto para CSV
 */
export const DEFAULT_CSV_CONFIG: CSVConfig = {
  separator: ';',
  encoding: 'utf-8',
  withHeader: true,
  lineEnding: '\n'
};

/**
 * Ordena eventos para exportación en orden cronológico
 * Mantiene el orden de creación cuando hay empates en tiempo (ordenamiento estable)
 */
export function ordenarEventosParaExportar(eventos: SimEvent[]): SimEvent[] {
  return [...eventos].sort((a, b) => a.tiempo - b.tiempo);
}

/**
 * Convierte un evento de simulación a línea CSV
 * Escapa caracteres especiales para evitar conflictos con separadores
 */
export function eventoALineaCsv(evento: SimEvent, config: CSVConfig = DEFAULT_CSV_CONFIG): string {
  const extra = evento.extra ? evento.extra.replaceAll(config.separator, ',') : '';
  return `${evento.tiempo}${config.separator}${evento.tipo}${config.separator}${evento.proceso}${config.separator}${extra}`;
}

/**
 * Convierte un array de eventos a formato CSV completo
 */
export function eventosACSV(eventos: SimEvent[], config: CSVConfig = DEFAULT_CSV_CONFIG): string {
  const eventosOrdenados = ordenarEventosParaExportar(eventos);
  let csv = '';
  
  // Agregar header si está configurado
  if (config.withHeader) {
    csv += `Tiempo${config.separator}Tipo${config.separator}Proceso${config.separator}Extra${config.lineEnding}`;
  }
  
  // Agregar eventos
  for (const evento of eventosOrdenados) {
    csv += eventoALineaCsv(evento, config) + config.lineEnding;
  }
  
  return csv;
}

/**
 * Escapa una cadena para CSV
 */
export function escaparCampoCSV(campo: string, config: CSVConfig = DEFAULT_CSV_CONFIG): string {
  if (!campo) return '';
  
  // Si contiene el separador, comillas o saltos de línea, encerrar en comillas
  if (campo.includes(config.separator) || campo.includes('"') || campo.includes('\n')) {
    // Escapar comillas duplicándolas
    const campoEscapado = campo.replaceAll('"', '""');
    return `"${campoEscapado}"`;
  }
  
  return campo;
}

/**
 * Convierte un array de objetos a CSV genérico
 */
export function objetosACSV<T extends Record<string, any>>(
  objetos: T[],
  columnas?: (keyof T)[],
  config: CSVConfig = DEFAULT_CSV_CONFIG
): string {
  if (objetos.length === 0) return '';
  
  // Usar todas las claves del primer objeto si no se especifican columnas
  const columnasFinales = columnas || Object.keys(objetos[0]) as (keyof T)[];
  
  let csv = '';
  
  // Header
  if (config.withHeader) {
    csv += columnasFinales
      .map(col => escaparCampoCSV(String(col), config))
      .join(config.separator) + config.lineEnding;
  }
  
  // Datos
  for (const objeto of objetos) {
    csv += columnasFinales
      .map(col => escaparCampoCSV(String(objeto[col] ?? ''), config))
      .join(config.separator) + config.lineEnding;
  }
  
  return csv;
}
