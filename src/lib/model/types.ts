/**
 * Tipos modernos para entrada/salida del simulador
 * Compatible con los tipos existentes en src/lib/domain/types.ts
 */

export type Policy = 'FCFS' | 'PRIORITY' | 'RR' | 'SPN' | 'SRTN';

export interface ProcessSpec {
  name: string;
  tiempoArribo: number;
  rafagasCPU: number;
  duracionRafagaCPU: number;
  duracionRafagaES: number;
  prioridad: number; // 1..100 (mayor = más prioridad)
}

export interface RunConfig {
  policy: Policy;
  tip: number;   // tiempo de ingreso al sistema
  tfp: number;   // tiempo de finalización de proceso
  tcp: number;   // tiempo de cambio de contexto
  quantum?: number; // requerido si policy=RR
}

export interface Workload {
  workloadName?: string;
  processes: ProcessSpec[];
  config: RunConfig;
}

export interface MetricsPerProcess {
  name: string;
  tiempoRetorno: number;        // TRp
  tiempoRetornoNormalizado: number;     // TRn
  tiempoEnListo: number;        // tiempo en estado listo
}

export interface BatchMetrics {
  tiempoRetornoTanda: number;          // TRt
  tiempoMedioRetorno: number;    // TM_Rt
  cpuOcioso: number;          // tiempo ocioso
  cpuSO: number;            // TIP + TFP + TCP
  cpuProcesos: number;          // tiempo de CPU efectiva de procesos
  porcentajeCpuOcioso?: number;
  porcentajeCpuSO?: number;
  porcentajeCpuProcesos?: number;
}

export interface Metrics {
  porProceso: MetricsPerProcess[];
  tanda: BatchMetrics;
}

export type EventType =
  | 'ARRIBO_TRABAJO'
  | 'INCORPORACION_SISTEMA'     // NUEVO->LISTO tras TIP
  | 'DESPACHO'                  // LISTO->EJECUTANDO con TCP
  | 'CAMBIO_CONTEXTO'           // cobro de TCP
  | 'INICIO_RAFAGA_CPU'
  | 'FIN_RAFAGA_CPU'
  | 'AGOTAMIENTO_QUANTUM'
  | 'INICIO_ES'
  | 'FIN_ES'
  | 'ATENCION_INTERRUPCION_ES'
  | 'TERMINACION_PROCESO';

export interface SimEvent {
  tiempo: number;
  tipo: EventType;
  proceso: string;   // nombre/id del proceso; para eventos globales podés usar '-'
  extra?: string;    // TIP=, TFP=, TCP=, restante=, etc.
}

export interface GanttSlice {
  process: string;        // nombre o 'SO'/'OCIOSO'/'CTX'
  tStart: number;
  tEnd: number;
  kind: 'CPU' | 'ES' | 'TIP' | 'TFP' | 'TCP' | 'OCIOSO';
}

// Mapeos para compatibilidad con tipos existentes
export const POLICY_MAP: Record<Policy, import('../domain/types').Algoritmo> = {
  'FCFS': 'FCFS',
  'PRIORITY': 'PRIORITY', 
  'RR': 'RR',
  'SPN': 'SJF',
  'SRTN': 'SRTF'
};

export const ALGORITHM_MAP: Record<import('../domain/types').Algoritmo, Policy> = {
  'FCFS': 'FCFS',
  'PRIORITY': 'PRIORITY',
  'RR': 'RR', 
  'SJF': 'SPN',
  'SRTF': 'SRTN'
};
