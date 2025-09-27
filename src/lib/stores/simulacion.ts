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
 * Exportar resultado completo como JSON
 */
export function exportResultadoJSON(): void {
  const res = get(simulationResult);
  const cfg = get(simulationConfig);
  if (!res) return;
  
  // Crear formato de exportación completo
  const exportData = {
    metadata: {
      timestamp: new Date().toISOString(),
      politica: cfg.politica,
      configuracion: cfg as unknown as Record<string, unknown>
    },
    trace: res.trace,
    metricas: res.metricas,
    gantt: res.gantt
  };
  
  exportToJSON(exportData, 'resultado-simulacion.json');
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
