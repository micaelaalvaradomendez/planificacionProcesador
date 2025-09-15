/**
 * Parser de archivos JSON mejorado para cargar workloads de procesos
 * Formato: 6 campos exactos como en los parsers TXT/CSV para consistencia
 * Con mensajes de error claros y útiles
 */

import type { ProcessSpec, RunConfig, Workload, Policy } from '../../domain/types';
import { ParseError, ErrorMessages } from './ParseError';

function normalizarPolitica(s: string | undefined): Policy {
  const up = (s || '').toUpperCase();
  const ok = ['FCFS','PRIORITY','RR','SPN','SRTN'] as const;
  if ((ok as readonly string[]).includes(up)) return up as Policy;
  throw new Error(`política inválida: ${s}`);
}


/**
 * Parsea un archivo JSON y retorna un Workload completo
 */
export async function parseJsonToWorkload(file: File): Promise<Workload> {
  const filename = file.name;
  
  if (file.size === 0) {
    throw ErrorMessages.emptyFile(filename);
  }
  
  const text = await file.text();
  if (!text.trim()) {
    throw ErrorMessages.emptyFile(filename);
  }
  
  let jsonData;
  try {
    jsonData = JSON.parse(text);
  } catch (e) {
    throw ErrorMessages.invalidJson(filename);
  }

  // Caso 1: Array de procesos (formato estandarizado)
  if (Array.isArray(jsonData)) {
    const processes: ProcessSpec[] = jsonData.map((p: any, index: number) => {
      try {
        return parseProcessFromJson(p, filename);
      } catch (error) {
        if (error instanceof ParseError) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new ParseError(`Error en proceso ${index + 1}: ${errorMessage}`, filename);
      }
    });

    const wl: Workload = {
      workloadName: `Workload desde JSON (${processes.length} procesos)`,
      processes,
      config: {
        policy: null as any, // La UI debe asignar después
        tip: 0,
        tfp: 0,
        tcp: 0,
        quantum: undefined
      }
    };

    validateProcesses(processes, filename);
    return wl;
  }

  // Caso 2: Objeto completo con workloadName, processes y config
  if (jsonData && typeof jsonData === 'object' && Array.isArray(jsonData.processes)) {
    const processes: ProcessSpec[] = jsonData.processes.map((p: any, index: number) => {
      try {
        return parseProcessFromJson(p, filename);
      } catch (error) {
        if (error instanceof ParseError) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new ParseError(`Error en proceso ${index + 1}: ${errorMessage}`, filename);
      }
    });

    const wl: Workload = {
      workloadName: jsonData.workloadName || `Workload desde JSON`,
      processes,
      config: jsonData.config ? parseConfigFromJson(jsonData.config) : {
        policy: null as any,
        tip: 0,
        tfp: 0,
        tcp: 0,
        quantum: undefined
      }
    };

    validateProcesses(processes, filename);
    return wl;
  }

  throw ErrorMessages.invalidFileFormat(filename);
}

/**
 * Parsea un proceso individual desde JSON con compatibilidad hacia atrás
 */
function parseProcessFromJson(p: any, filename?: string): ProcessSpec {
  if (!p || typeof p !== 'object') {
    throw new ParseError('Proceso debe ser un objeto', filename);
  }

  // Formato estándar (español, igual que TXT/CSV)
  const nombre = p.nombre || p.name;
  const tiempoArribo = p.tiempo_arribo ?? p.tiempoArribo ?? p.arrivalTime;
  const rafagasCPU = p.cantidad_rafagas_cpu ?? p.rafagasCPU ?? p.cpuBursts;
  const duracionRafagaCPU = p.duracion_rafaga_cpu ?? p.duracionRafagaCPU ?? p.cpuBurstDuration;
  const duracionRafagaES = p.duracion_rafaga_es ?? p.duracionRafagaES ?? p.ioBurstDuration;
  const prioridad = p.prioridad_externa ?? p.prioridad ?? p.priority;

  // Validar campos requeridos con mensajes mejorados
  if (!nombre) {
    throw ErrorMessages.missingField('nombre', undefined, filename);
  }
  if (tiempoArribo === undefined || tiempoArribo === null) {
    throw ErrorMessages.missingField('tiempo_arribo', undefined, filename);
  }
  if (rafagasCPU === undefined || rafagasCPU === null) {
    throw ErrorMessages.missingField('cantidad_rafagas_cpu', undefined, filename);
  }
  if (duracionRafagaCPU === undefined || duracionRafagaCPU === null) {
    throw ErrorMessages.missingField('duracion_rafaga_cpu', undefined, filename);
  }
  if (duracionRafagaES === undefined || duracionRafagaES === null) {
    throw ErrorMessages.missingField('duracion_rafaga_es', undefined, filename);
  }
  if (prioridad === undefined || prioridad === null) {
    throw ErrorMessages.missingField('prioridad_externa', undefined, filename);
  }

  // Parsear y validar valores con mensajes de error específicos
  const nombreValid = String(nombre);
  const tiempoArriboValid = Number(tiempoArribo);
  const rafagasCPUValid = Number(rafagasCPU);
  const duracionCPUValid = Number(duracionRafagaCPU);
  const duracionESValid = Number(duracionRafagaES);
  const prioridadValid = Number(prioridad);

  // Validaciones numéricas
  if (isNaN(tiempoArriboValid)) {
    throw ErrorMessages.invalidNumber('tiempo_arribo', String(tiempoArribo), undefined, filename);
  }
  if (isNaN(rafagasCPUValid)) {
    throw ErrorMessages.invalidNumber('cantidad_rafagas_cpu', String(rafagasCPU), undefined, filename);
  }
  if (isNaN(duracionCPUValid)) {
    throw ErrorMessages.invalidNumber('duracion_rafaga_cpu', String(duracionRafagaCPU), undefined, filename);
  }
  if (isNaN(duracionESValid)) {
    throw ErrorMessages.invalidNumber('duracion_rafaga_es', String(duracionRafagaES), undefined, filename);
  }
  if (isNaN(prioridadValid)) {
    throw ErrorMessages.invalidNumber('prioridad_externa', String(prioridad), undefined, filename);
  }

  // Validaciones de rango
  if (tiempoArriboValid < 0) {
    throw ErrorMessages.outOfRange('tiempo_arribo', tiempoArriboValid, 0, undefined, undefined, filename);
  }
  if (rafagasCPUValid < 1) {
    throw ErrorMessages.outOfRange('cantidad_rafagas_cpu', rafagasCPUValid, 1, undefined, undefined, filename);
  }
  if (duracionCPUValid <= 0) {
    throw ErrorMessages.outOfRange('duracion_rafaga_cpu', duracionCPUValid, 0.1, undefined, undefined, filename);
  }
  if (duracionESValid < 0) {
    throw ErrorMessages.outOfRange('duracion_rafaga_es', duracionESValid, 0, undefined, undefined, filename);
  }
  if (prioridadValid < 1 || prioridadValid > 100) {
    throw ErrorMessages.outOfRange('prioridad_externa', prioridadValid, 1, 100, undefined, filename);
  }

  // Validar nombre de proceso
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(nombreValid)) {
    throw ErrorMessages.invalidProcessName(nombreValid, undefined, filename);
  }

  return {
    name: nombreValid,
    tiempoArribo: tiempoArriboValid,
    rafagasCPU: Math.floor(rafagasCPUValid), // Asegurar entero
    duracionRafagaCPU: duracionCPUValid,
    duracionRafagaES: duracionESValid,
    prioridad: Math.floor(prioridadValid) // Asegurar entero
  };
}

/**
 * Parsea configuración desde JSON
 */
function parseConfigFromJson(config: any): RunConfig {
  if (!config || typeof config !== 'object') {
    throw new ParseError('Config debe ser un objeto');
  }

  const policy = normalizarPolitica(config.policy);
  const tip = Number(config.tip || 1);
  const tfp = Number(config.tfp || 1);
  const tcp = Number(config.tcp || 1);
  const quantum = config.quantum ? Number(config.quantum) : undefined;

  // Validar quantum para RR
  if (policy === 'RR' && (!quantum || quantum <= 0)) {
    throw ErrorMessages.invalidQuantumForRR(quantum);
  }

  return {
    policy,
    tip,
    tfp,
    tcp,
    quantum
  };
}

/**
 * Valida procesos parseados
 */
function validateProcesses(processes: ProcessSpec[], filename?: string): void {
  if (processes.length === 0) {
    throw ErrorMessages.noProcesses(filename);
  }

  // Validar nombres únicos
  const nombres = processes.map(p => p.name);
  const duplicados = [...new Set(nombres.filter((nombre, index) => nombres.indexOf(nombre) !== index))];
  if (duplicados.length > 0) {
    throw ErrorMessages.duplicateNames(duplicados, filename);
  }
}
