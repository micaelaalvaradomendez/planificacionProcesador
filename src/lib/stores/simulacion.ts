// src/lib/stores/simulacion.ts
import { writable, derived, get, type Readable } from 'svelte/store';
import type { Proceso } from '../model/proceso';
import type { Costos } from '../model/costos';
import type { Trace } from '../engine/types';
import type { GanttModel } from '../gantt/schema';
import { costosFromUI } from './costosFactory';
import { getRunner, type SchedulerCfg } from './schedulerFactory';
import { MetricsBuilder } from '../metrics/metricas';
import { GanttBuilder } from '../gantt/builder';
import { parseTandaJSON, extractBloqueoESGlobal, type ProcesoTanda } from '../io/parser';
import { getFixture, type Fixture } from '../io/fixtures';
import { validateInputs, type ValidationResult } from '../io/validate';
import { exportToJSON, exportMetricsToCSV, exportTraceToCSV } from '../io/export';

// ===== TIPOS PRINCIPALES =====

export type Politica = 'FCFS' | 'RR' | 'SPN' | 'SRTN' | 'PRIORITY';

export interface PriorityAgingCfg {
  step: number;      // cuánto "mejora" la prioridad por quantum de espera
  quantum: number;   // tamaño del bucket de espera (ticks/ms)
}

export interface SimulationConfig extends SchedulerCfg {
  costos?: Partial<Costos>;
}

export interface SimulationResult {
  trace: Trace;
  metricas: {
    porProceso: Array<{
      pid: number;
      arribo: number;
      fin: number;
      servicioCPU: number;
      TRp: number;       // Tiempo Respuesta = fin - arribo
      TE: number;        // Tiempo Espera = TRp - servicioCPU  
      TRn: number;       // Tiempo Respuesta Normalizado = TRp/servicioCPU
    }>;
    global: {
      TRpPromedio: number;
      TEPromedio: number;
      TRnPromedio: number;
      throughput: number;
      cambiosDeContexto: number;
      expropiaciones: number;
      tiempoTotalSimulacion: number;
    };
  };
  gantt: GanttModel;
}

// ===== STORES =====

/** Configuración actual de la simulación */
export const simulationConfig = writable<SimulationConfig>({
  politica: 'FCFS',
  costos: { TIP: 1, TCP: 1, TFP: 1, bloqueoES: 25 }
});

/** Procesos cargados para simular */
export const procesos = writable<Proceso[]>([]);

/** Resultado de la última simulación */
export const simulationResult = writable<SimulationResult | null>(null);

/** Estado de carga/ejecución */
export const isSimulating = writable<boolean>(false);

/** Errores de simulación */
export const simulationError = writable<string | null>(null);

/** Warnings de importación */
export const importWarnings = writable<string[]>([]);

// ===== DERIVED STORES =====

/** Indica si hay procesos cargados */
export const hasProcesses: Readable<boolean> = derived(
  procesos,
  $procesos => $procesos.length > 0
);

/** Indica si se puede ejecutar la simulación */
export const canExecute: Readable<boolean> = derived(
  [hasProcesses, isSimulating, simulationConfig],
  ([$hasProcesses, $isSimulating, $cfg]) => {
    if (!$hasProcesses || $isSimulating) return false;
    if ($cfg.politica === 'RR' && !($cfg.quantum && $cfg.quantum > 0)) return false;
    return true;
  }
);

/** Métricas de la última simulación */
export const metricas: Readable<SimulationResult['metricas'] | null> = derived(
  simulationResult,
  $result => $result?.metricas || null
);

/** Gantt de la última simulación */
export const gantt: Readable<GanttModel | null> = derived(
  simulationResult,
  $result => $result?.gantt || null
);

// ===== ACCIONES =====

/**
 * Función pura que ejecuta una simulación completa
 * No muta procesos de entrada ni toca DOM
 */
export function runSimulation(cfg: SimulationConfig, procesosInput: Proceso[]): SimulationResult {
  // Validaciones de entrada
  if (!Array.isArray(procesosInput) || procesosInput.length === 0) {
    throw new Error('Se requiere un array no vacío de procesos');
  }

  // 1) Costos saneados (defaults, validaciones)
  const costos = costosFromUI(cfg.costos);

  // 2) Clonado defensivo de procesos
  const procesosClon: Proceso[] = procesosInput.map(p => ({
    ...p,
    rafagasCPU: [...(p.rafagasCPU ?? [])],
    estado: 'N'
  }));

  // 3) Elegir runner según política
  const runner = getRunner(cfg);

  // 4) Ejecutar engine y obtener traza
  const trace: Trace = runner(procesosClon, costos, cfg);

  // 5) Métricas y Gantt
  const metricasPorProceso = MetricsBuilder.build(trace, procesosClon);
  const metricasGlobales = MetricsBuilder.buildGlobal(metricasPorProceso, trace);
  const ganttModel = GanttBuilder.build(trace);

  // 6) Devolver POJOs
  return {
    trace,
    metricas: {
      porProceso: metricasPorProceso,
      global: metricasGlobales
    },
    gantt: ganttModel
  };
}

/**
 * Función conveniente que combina importación + simulación
 */
export function runSimulationFromTanda(
  cfg: SimulationConfig, 
  tandaData: ProcesoTanda[]
): SimulationResult & { warnings?: string[] } {
  // Importar procesos
  const procesosImportados = parseTandaJSON(tandaData);
  
  // Extraer bloqueoES si no está especificado
  const warnings: string[] = [];
  if (!cfg.costos?.bloqueoES) {
    const { bloqueoES, warning } = extractBloqueoESGlobal(tandaData);
    cfg.costos = { ...cfg.costos, bloqueoES };
    if (warning) {
      warnings.push(warning);
    }
  }
  
  // Ejecutar simulación
  const result = runSimulation(cfg, procesosImportados);
  
  return warnings.length > 0 ? { ...result, warnings } : result;
}

/**
 * Acción para cargar procesos desde tanda JSON
 */
export async function loadFromTanda(tandaData: ProcesoTanda[]): Promise<void> {
  try {
    simulationError.set(null);
    importWarnings.set([]);
    
    const procesosImportados = parseTandaJSON(tandaData);
    procesos.set(procesosImportados);
    
    // Extraer bloqueoES automáticamente
    const { bloqueoES, warning } = extractBloqueoESGlobal(tandaData);
    if (warning) {
      importWarnings.set([warning]);
    }
    
    // Actualizar configuración con bloqueoES extraído
    simulationConfig.update(cfg => ({
      ...cfg,
      costos: { ...cfg.costos, bloqueoES }
    }));
    
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    simulationError.set(`Error cargando tanda: ${msg}`);
  }
}

/**
 * Acción para ejecutar la simulación con la configuración actual
 */
export async function executeSimulation(): Promise<void> {
  try {
    isSimulating.set(true);
    simulationError.set(null);
    
    const cfg = get(simulationConfig);
    const procs = get(procesos);
    
    // Validar entradas antes de ejecutar
    const validation = validateInputs(procs, cfg);
    if (!validation.ok) {
      throw new Error(`Entradas inválidas: ${validation.issues.map(i => i.msg).join(' | ')}`);
    }
    
    // Clonar defensivamente para la simulación
    const cfgClon = globalThis.structuredClone ? 
      globalThis.structuredClone(cfg) : 
      JSON.parse(JSON.stringify(cfg));
    const procsClon = globalThis.structuredClone ? 
      globalThis.structuredClone(procs) : 
      JSON.parse(JSON.stringify(procs));
    
    // Ejecutar simulación
    const result = runSimulation(cfgClon, procsClon);
    simulationResult.set(result);
    
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    simulationError.set(`Error en simulación: ${msg}`);
  } finally {
    isSimulating.set(false);
  }
}

/**
 * Acción para limpiar todo el estado
 */
export function clearSimulation(): void {
  procesos.set([]);
  simulationResult.set(null);
  simulationError.set(null);
  importWarnings.set([]);
}

/**
 * Acción para cargar una fixture de pruebas
 */
export function loadFixture(name: 'A_sinES_FCFS' | 'B_conES_25' | 'RR_q2' | 'SRTN_preempt'): void {
  try {
    simulationError.set(null);
    importWarnings.set([]);
    
    const { cfg, procesos: ps } = getFixture(name);
    simulationConfig.set(cfg);
    procesos.set(ps);
    simulationResult.set(null); // no ejecutar automáticamente
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    simulationError.set(`Error cargando fixture: ${msg}`);
  }
}

/**
 * Acción conveniente para cargar desde tanda JSON
 */
export function loadFromTandaJSON(json: unknown): void {
  try {
    simulationError.set(null);
    importWarnings.set([]);
    
    const ps = parseTandaJSON(json as any);
    procesos.set(ps);
    simulationResult.set(null);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    simulationError.set(`Error cargando tanda: ${msg}`);
  }
}

// ===== EXPORTS DE CONVENIENCIA =====

/**
 * Exportar resultado completo como JSON (Paso 12)
 */
export function exportResultadoJSON(): void {
  const cfg = get(simulationConfig);
  const procs = get(procesos);
  const res = get(simulationResult);
  if (!cfg || !procs?.length || !res) return;

  // Convertir configuración al formato de export
  const exportCfg = {
    algoritmo: cfg.politica,
    costos: cfg.costos || {},
    quantum: cfg.quantum
  };

  const payload = buildResultadoJSON(exportCfg, procs, res.trace, res.metricas, res.gantt);
  downloadJSON('resultado-simulacion', payload);
}

/**
 * Exportar métricas como CSV
 */
export function exportMetricasCSV(): void {
  const res = get(simulationResult);
  if (!res) return;
  exportMetricsToCSV(res.metricas.porProceso, 'metricas.csv');
}

/**
 * Exportar trace como CSV
 */
export function exportTraceCSV(): void {
  const res = get(simulationResult);
  if (!res) return;
  exportTraceToCSV(res.trace, 'trace.csv');
}

// ==================== PASO 12: NUEVAS FUNCIONES DE EXPORT/IMPORT ====================

import { 
  buildResultadoJSON, 
  downloadJSON, 
  downloadMetricasCSV, 
  downloadTraceCSV,
  type ResultadoExport,
  type ExportSimulationConfig
} from '../io/export';

// Aliases para stores existentes (compatibilidad con tu spec)
export const cfgStore = simulationConfig;
export const procesosStore = procesos;  
export const resultadoStore = simulationResult;

/**
 * Exportar métricas como CSV (nueva versión)
 */
export function exportMetricasCSVNew(): void {
  const r = get(simulationResult);
  if (!r) return;
  downloadMetricasCSV('resultado-simulacion', r.metricas);
}

/**
 * Exportar trace como CSV (nueva versión)
 */
export function exportTraceCSVNew(): void {
  const r = get(simulationResult);
  if (!r) return;
  downloadTraceCSV('resultado-simulacion', r.trace);
}

// ===== Importar =====
type EscenarioImport = { cfg: ExportSimulationConfig; procesos: Proceso[] };
type ResultadoImport = { 
  kind?: string; 
  cfg: ExportSimulationConfig; 
  procesos: Proceso[]; 
  trace: any; 
  metricas: any; 
  gantt: any 
};

/**
 * Importar un escenario (cfg + procesos) sin ejecutar
 */
export async function importEscenario(file: File): Promise<void> {
  const data = JSON.parse(await file.text()) as EscenarioImport;
  if (!data?.cfg || !Array.isArray(data?.procesos)) {
    throw new Error('Archivo inválido: requiere { cfg, procesos }');
  }

  // Convertir cfg de export a formato interno
  const internalCfg: SimulationConfig = {
    politica: data.cfg.algoritmo as Politica,
    costos: data.cfg.costos,
    quantum: data.cfg.quantum
  };

  // Setear stores y NO ejecutar (el usuario decide)
  simulationConfig.set(internalCfg);
  procesos.set(data.procesos);
  simulationResult.set(null);
}

/**
 * Importar un resultado completo (solo para visualizar)
 */
export async function importResultado(file: File): Promise<void> {
  const data = JSON.parse(await file.text()) as ResultadoImport;
  if (!data?.cfg || !Array.isArray(data?.procesos) || !data.trace || !data.metricas || !data.gantt) {
    throw new Error('Archivo inválido: requiere { cfg, procesos, trace, metricas, gantt }');
  }

  // Convertir cfg de export a formato interno
  const internalCfg: SimulationConfig = {
    politica: data.cfg.algoritmo as Politica,
    costos: data.cfg.costos,
    quantum: data.cfg.quantum
  };

  // Setear stores solo para visualizar (no alterar core)
  simulationConfig.set(internalCfg);
  procesos.set(data.procesos);
  simulationResult.set({ 
    trace: data.trace, 
    metricas: data.metricas, 
    gantt: data.gantt 
  });
}

/**
 * Reproducir simulación desde escenario actual
 */
export function reproducirEscenario(): void {
  const cfg = get(simulationConfig);
  const procs = get(procesos);
  if (!cfg || !procs?.length) return;

  // Usar la función runSimulation existente
  const result = runSimulation(cfg, procs);
  simulationResult.set(result);
}

/**
 * Comparador sencillo para verificar reproducibilidad
 */
export function compararContraImportado(): { ok: boolean; difs: string[] } {
  const cfg = get(simulationConfig);
  const procs = get(procesos);
  const importado = get(simulationResult);
  if (!cfg || !procs?.length || !importado) {
    return { ok: false, difs: ['Faltan datos para comparar'] };
  }

  // Ejecutar simulación temporalmente para comparar
  const originalResult = importado;
  
  // Crear simulación temporal
  const tempRunner = getRunner(cfg);
  const tempCostos = costosFromUI(cfg.costos || {});
  const tempTrace = tempRunner(procs, tempCostos, cfg);
  const tempMetricas = MetricsBuilder.build(tempTrace, procs);
  const tempGantt = GanttBuilder.build(tempTrace);

  const difs: string[] = [];
  
  // Comparar longitudes básicas
  const evImp = importado.trace?.events?.length ?? -1;
  const evRep = tempTrace?.events?.length ?? -2;
  if (evImp !== evRep) {
    difs.push(`Trace length difiere: import=${evImp} vs repro=${evRep}`);
  }

  const slImp = importado.gantt?.tracks?.length ?? -1;
  const slRep = tempGantt?.tracks?.length ?? -2;
  if (slImp !== slRep) {
    difs.push(`Gantt tracks difieren: import=${slImp} vs repro=${slRep}`);
  }

  // Comparar métricas básicas
  const metImp = importado.metricas?.porProceso?.length ?? -1;
  const metRep = tempMetricas?.length ?? -2;
  if (metImp !== metRep) {
    difs.push(`Métricas length difiere: import=${metImp} vs repro=${metRep}`);
  }

  const ok = difs.length === 0;
  return { ok, difs };
}
