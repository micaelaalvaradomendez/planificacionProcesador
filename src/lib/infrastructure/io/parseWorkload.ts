import type { ProcessSpec, RunConfig, Workload, Policy } from '../../model/types';
import { validarTandaDeProcesos, validarProceso } from '../../model/validators';
import { ParseError, ErrorMessages } from '../parsers/ParseError';

function normalizarPolitica(s: string | undefined): Policy {
  const up = (s || '').toUpperCase();
  const ok = ['FCFS','PRIORITY','RR','SPN','SRTN'] as const;
  if ((ok as readonly string[]).includes(up)) return up as Policy;
  throw new Error(`política inválida: ${s}`);
}

/** 
 * Parser JSON para workloads - Formato estandarizado
 * Soporta los mismos 6 campos que el parser TXT/CSV para consistencia
 */

/** Formato JSON estándar (igual semántica que TXT/CSV):
{
  "workloadName": "Nombre de la tanda",
  "processes": [
    {
      "nombre": "P1",
      "tiempo_arribo": 0,
      "cantidad_rafagas_cpu": 3,
      "duracion_rafaga_cpu": 5,
      "duracion_rafaga_es": 4,
      "prioridad_externa": 2
    }
  ],
  "config": {
    "policy": "RR",
    "tip": 1,
    "tfp": 1,
    "tcp": 1,
    "quantum": 4
  }
}

O formato de array simple (solo procesos):
[
  {
    "nombre": "P1",
    "tiempo_arribo": 0,
    "cantidad_rafagas_cpu": 3,
    "duracion_rafaga_cpu": 5,
    "duracion_rafaga_es": 4,
    "prioridad_externa": 2
  }
]
*/
export async function analizarTandaJson(file: File): Promise<Workload> {
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
  if (!rafagasCPU) {
    throw ErrorMessages.missingField('cantidad_rafagas_cpu', undefined, filename);
  }
  if (!duracionRafagaCPU) {
    throw ErrorMessages.missingField('duracion_rafaga_cpu', undefined, filename);
  }
  if (duracionRafagaES === undefined || duracionRafagaES === null) {
    throw ErrorMessages.missingField('duracion_rafaga_es', undefined, filename);
  }
  if (prioridad === undefined || prioridad === null) {
    throw ErrorMessages.missingField('prioridad_externa', undefined, filename);
  }

  // Validar tipos y rangos
  const tiempoArriboNum = Number(tiempoArribo);
  const rafagasCPUNum = Number(rafagasCPU);
  const duracionRafagaCPUNum = Number(duracionRafagaCPU);
  const duracionRafagaESNum = Number(duracionRafagaES);
  const prioridadNum = Number(prioridad);

  if (isNaN(tiempoArriboNum)) {
    throw ErrorMessages.invalidNumber('tiempo_arribo', String(tiempoArribo), undefined, filename);
  }
  if (isNaN(rafagasCPUNum)) {
    throw ErrorMessages.invalidNumber('cantidad_rafagas_cpu', String(rafagasCPU), undefined, filename);
  }
  if (isNaN(duracionRafagaCPUNum)) {
    throw ErrorMessages.invalidNumber('duracion_rafaga_cpu', String(duracionRafagaCPU), undefined, filename);
  }
  if (isNaN(duracionRafagaESNum)) {
    throw ErrorMessages.invalidNumber('duracion_rafaga_es', String(duracionRafagaES), undefined, filename);
  }
  if (isNaN(prioridadNum)) {
    throw ErrorMessages.invalidNumber('prioridad_externa', String(prioridad), undefined, filename);
  }

  // Validar rangos
  if (tiempoArriboNum < 0) {
    throw ErrorMessages.outOfRange('tiempo_arribo', tiempoArriboNum, 0, undefined, undefined, filename);
  }
  if (rafagasCPUNum < 1) {
    throw ErrorMessages.outOfRange('cantidad_rafagas_cpu', rafagasCPUNum, 1, undefined, undefined, filename);
  }
  if (duracionRafagaCPUNum <= 0) {
    throw ErrorMessages.outOfRange('duracion_rafaga_cpu', duracionRafagaCPUNum, 0.1, undefined, undefined, filename);
  }
  if (duracionRafagaESNum < 0) {
    throw ErrorMessages.outOfRange('duracion_rafaga_es', duracionRafagaESNum, 0, undefined, undefined, filename);
  }
  if (prioridadNum < 1 || prioridadNum > 100) {
    throw ErrorMessages.outOfRange('prioridad_externa', prioridadNum, 1, 100, undefined, filename);
  }

  return {
    name: String(nombre),
    tiempoArribo: tiempoArriboNum,
    rafagasCPU: rafagasCPUNum,
    duracionRafagaCPU: duracionRafagaCPUNum,
    duracionRafagaES: duracionRafagaESNum,
    prioridad: prioridadNum
  };
}

/**
 * Parsea configuración desde JSON
 */
function parseConfigFromJson(config: any): RunConfig {
  return {
    policy: normalizarPolitica(config.policy),
    tip: Number(config.tip ?? 0),
    tfp: Number(config.tfp ?? 0),
    tcp: Number(config.tcp ?? 0),
    quantum: config.quantum != null ? Number(config.quantum) : undefined
  };
}

/**
 * Valida array de procesos con mensajes mejorados
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

  // Validar cada proceso individualmente
  const errores = processes.map(validarProceso).flat();
  if (errores.length) {
    throw new ParseError(`Procesos inválidos:\n- ${errores.join('\n- ')}`, filename);
  }
}

/** CSV/TXT opcional (una línea por proceso):
name,tiempoArribo,rafagasCPU,duracionRafagaCPU,duracionRafagaES,prioridad
P1,0,3,5,4,50
*/
export async function analizarTandaCsv(file: File, config: Omit<RunConfig, 'policy'> & { policy: string }): Promise<Workload> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const [header, ...rows] = lines;
  const cols = header.split(',').map(s => s.trim());

  const idx = (k: string) => {
    const i = cols.indexOf(k);
    if (i < 0) throw new Error(`CSV: falta columna ${k}`);
    return i;
  };
  const iName = idx('name');
  const iArr = idx('tiempoArribo');
  const iCB = idx('rafagasCPU');
  const iCBD = idx('duracionRafagaCPU');
  const iIOD = idx('duracionRafagaES');
  const iPr  = idx('prioridad');

  const processes: ProcessSpec[] = rows.map((r, j) => {
    const c = r.split(',').map(s => s.trim());
    if (c.length !== cols.length) throw new Error(`CSV: fila ${j+2} con cantidad de columnas inválida`);
    return {
      name: c[iName],
      tiempoArribo: Number(c[iArr]),
      rafagasCPU: Number(c[iCB]),
      duracionRafagaCPU: Number(c[iCBD]),
      duracionRafagaES: Number(c[iIOD]),
      prioridad: Number(c[iPr])
    };
  });

  const wl: Workload = {
    workloadName: 'tanda-csv',
    processes,
    config: {
      policy: normalizarPolitica(config.policy),
      tip: Number(config.tip ?? 0),
      tfp: Number(config.tfp ?? 0),
      tcp: Number(config.tcp ?? 0),
      quantum: config.quantum != null ? Number(config.quantum) : undefined
    }
  };

  const errors = validarTandaDeProcesos(wl);
  if (errors.length) throw new Error(`Entrada CSV inválida:\n- ${errors.join('\n- ')}`);
  return wl;
}
