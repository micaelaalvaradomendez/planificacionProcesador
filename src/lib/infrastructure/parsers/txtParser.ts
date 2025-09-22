/**
 * Parser de archivos TXT/CSV mejorado para cargar workloads de procesos
 * Formato según consigna del profesor: 6 campos exactos separados por comas
 * Con mensajes de error claros y útiles
 */

import type { ProcessSpec, Workload, Policy } from '../../domain/types';
import { ParseError, ErrorMessages } from './ParseError';

/**
 * Formato esperado del archivo TXT/CSV según la consigna del profesor:
 * - Archivo TXT/CSV donde cada línea define un proceso
 * - Cada campo separado por comas (sin headers)
 * 
 * Campos (en orden exacto según consigna):
 * 1. Nombre del proceso
 * 2. Tiempo de arribo
 * 3. Ráfagas de CPU para completarse
 * 4. Duración de ráfagas de CPU
 * 5. Duración de ráfagas de I/O
 * 6. Prioridad (1-100, mayor = más prioridad)
 * 
 * Ejemplo según consigna:
 * P1,0,3,6,2,3
 * P2,1,2,4,3,1
 * P3,2,1,8,1,2
 */

export interface TxtParseConfig {
  separator?: string; // Auto-detectar si no se especifica
  policy: Policy | null;
  tip: number;
  tfp: number;
  tcp: number;
  quantum?: number;
}

/**
 * Parsea un archivo TXT/CSV y retorna un Workload completo
 */
export function parseTxtToWorkload(
  content: string, 
  config: TxtParseConfig,
  filename?: string
): Workload {
  try {
    const processes = parseTxtToProcesses(content, config.separator, filename);
    
    return {
      workloadName: filename ? `Workload desde ${filename}` : 'Workload desde TXT',
      processes,
      config: {
        policy: config.policy || 'FCFS', // Usar FCFS por defecto si es null
        tip: config.tip,
        tfp: config.tfp,
        tcp: config.tcp,
        quantum: config.quantum
      }
    };
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ParseError(`Error general al parsear archivo: ${errorMessage}`, filename);
  }
}

/**
 * Parsea solo los procesos desde contenido TXT/CSV
 */
export function parseTxtToProcesses(
  content: string,
  separator: string = 'auto',
  filename?: string
): ProcessSpec[] {
  if (!content || content.trim().length === 0) {
    throw ErrorMessages.emptyFile(filename);
  }

  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) {
    throw ErrorMessages.emptyFile(filename);
  }

  const processes: ProcessSpec[] = [];
  let detectedSeparator = separator === 'auto' ? detectSeparator(lines) : separator;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    try {
      // Saltar headers si están presentes
      if (i === 0 && isHeaderLine(line, detectedSeparator)) {
        continue; // Saltar línea de headers
      }

      const process = parseProcessLine(line, detectedSeparator, lineNumber, filename);
      processes.push(process);

    } catch (error) {
      if (error instanceof ParseError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ParseError(`Error en línea ${lineNumber}: ${errorMessage}`, filename, lineNumber);
    }
  }

  if (processes.length === 0) {
    throw ErrorMessages.noProcesses(filename);
  }

  // Validar que no hay nombres duplicados
  const nombres = processes.map(p => p.id);  // CORRECCIÓN: usar p.id en lugar de p.name
  const duplicados = [...new Set(nombres.filter((nombre, index) => nombres.indexOf(nombre) !== index))];
  if (duplicados.length > 0) {
    throw ErrorMessages.duplicateNames(duplicados, filename);
  }

  return processes;
}

/**
 * Detecta automáticamente el separador usado en el archivo
 */
function detectSeparator(lines: string[]): string {
  const separators = [',', '\t', ' ', ';'];
  const sampleLine = lines.find(line => !isHeaderLine(line, ',')) || lines[0];
  
  for (const sep of separators) {
    const parts = sampleLine.split(sep).map(s => s.trim()).filter(Boolean);
    if (parts.length === 6) {
      return sep;
    }
  }
  
  // Por defecto usar coma
  return ',';
}

/**
 * Detecta si una línea contiene headers
 */
function isHeaderLine(line: string, separator: string): boolean {
  const parts = line.split(separator).map(s => s.trim());
  return parts.length === 6 && parts.includes('nombre');
}

/**
 * Parsea una línea individual del archivo
 */
function parseProcessLine(line: string, separator: string, lineNumber: number, filename?: string): ProcessSpec {
  const parts = line.split(separator).map(s => s.trim()).filter(Boolean);

  if (parts.length !== 6) {
    throw ErrorMessages.wrongFieldCount(6, parts.length, lineNumber, filename);
  }

  const [nombreRaw, arriboRaw, rafagasRaw, duracionCpuRaw, duracionEsRaw, prioridadRaw] = parts;

  // Validar y parsear cada campo
  const nombre = parseNombre(nombreRaw, lineNumber, filename);
  const tiempoArribo = parseNumero(arriboRaw, 'tiempo_arribo', lineNumber, 0, undefined, filename);
  const rafagasCPU = parseEntero(rafagasRaw, 'cantidad_rafagas_cpu', lineNumber, 1, undefined, filename);
  const duracionRafagaCPU = parseNumero(duracionCpuRaw, 'duracion_rafaga_cpu', lineNumber, 0.1, undefined, filename);
  const duracionRafagaES = parseNumero(duracionEsRaw, 'duracion_rafaga_es', lineNumber, 0, undefined, filename);
  const prioridad = parseEntero(prioridadRaw, 'prioridad_externa', lineNumber, 1, 100, filename);

  return {
    id: nombre,                   // CORRECCIÓN: cambiar name → id
    arribo: tiempoArribo,         // CORRECCIÓN: cambiar tiempoArribo → arribo  
    rafagasCPU,                   // ✅ Correcto
    duracionCPU: duracionRafagaCPU,   // CORRECCIÓN: cambiar duracionRafagaCPU → duracionCPU
    duracionIO: duracionRafagaES,     // CORRECCIÓN: cambiar duracionRafagaES → duracionIO
    prioridad                     // ✅ Correcto
  };
}

/**
 * Parsea y valida nombre de proceso
 */
function parseNombre(valor: string, lineNumber: number, filename?: string): string {
  if (!valor || valor.length === 0) {
    throw ErrorMessages.invalidProcessName('', lineNumber, filename);
  }
  
  // Remover comillas si las tiene
  const cleaned = valor.replace(/^["']|["']$/g, '');
  
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(cleaned)) {
    throw ErrorMessages.invalidProcessName(cleaned, lineNumber, filename);
  }
  
  return cleaned;
}

/**
 * Parsea número con validación de rango
 */
function parseNumero(
  valor: string, 
  campo: string, 
  lineNumber: number,
  minimo: number = 0,
  maximo?: number,
  filename?: string
): number {
  const numero = parseFloat(valor);
  
  if (isNaN(numero)) {
    throw ErrorMessages.invalidNumber(campo, valor, lineNumber, filename);
  }
  
  if (numero < minimo) {
    throw ErrorMessages.outOfRange(campo, numero, minimo, maximo, lineNumber, filename);
  }
  
  if (maximo !== undefined && numero > maximo) {
    throw ErrorMessages.outOfRange(campo, numero, minimo, maximo, lineNumber, filename);
  }
  
  return numero;
}

/**
 * Parsea entero con validación de rango
 */
function parseEntero(
  valor: string, 
  campo: string, 
  lineNumber: number,
  minimo: number = 0,
  maximo?: number,
  filename?: string
): number {
  const numero = parseNumero(valor, campo, lineNumber, minimo, maximo, filename);
  
  if (!Number.isInteger(numero)) {
    throw new ParseError(`"${campo}" debe ser un número entero`, filename, lineNumber, campo, 'Usa números enteros sin decimales, por ejemplo: 1, 2, 10');
  }
  
  return numero;
}

/**
 * Valida un workload parseado
 */
export function validateWorkload(workload: Workload): string[] {
  const errors: string[] = [];
  
  // Validar configuración
  if (!workload.config.policy) {
    errors.push('Política de planificación es requerida');
  }
  
  if (workload.config.policy === 'RR' && !workload.config.quantum) {
    errors.push('Quantum es requerido para política Round Robin');
  }
  
  // Validar procesos
  if (workload.processes.length === 0) {
    errors.push('Se requiere al menos un proceso');
  }
  
  // Validar tiempos de arribo no negativos
  const arribos = workload.processes.map(p => p.arribo).sort((a, b) => a - b);  // CORRECCIÓN: usar p.arribo
  if (arribos[0] < 0) {
    errors.push('Los tiempos de arribo no pueden ser negativos');
  }
  
  return errors;
}

/**
 * Función utilitaria para crear configuración predeterminada
 */
export function createDefaultConfig(policy: Policy = 'FCFS'): TxtParseConfig {
  return {
    policy,
    tip: 1,
    tfp: 1, 
    tcp: 1,
    quantum: policy === 'RR' ? 4 : undefined
  };
}

/**
 * Parsea un archivo File (TXT/CSV) y retorna un Workload
 * Compatible con la interfaz del parser JSON
 */
export async function parseWorkloadTxt(file: File): Promise<Workload> {
  try {
    if (file.size === 0) {
      throw ErrorMessages.emptyFile(file.name);
    }

    const content = await file.text();
    if (!content.trim()) {
      throw ErrorMessages.emptyFile(file.name);
    }

    const config = createDefaultConfig(); // Usar configuración por defecto
    return parseTxtToWorkload(content, config, file.name);
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ParseError(`Error al procesar archivo: ${errorMessage}`, file.name);
  }
}
