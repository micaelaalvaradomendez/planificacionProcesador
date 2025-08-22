/**
 * Tipos modernos para entrada/salida del simulador
 * Compatible con los tipos existentes en src/lib/domain/types.ts
 */

export type Policy = 'FCFS' | 'PRIORITY' | 'RR' | 'SPN' | 'SRTN';

export interface ProcessSpec {
  name: string;
  arrivalTime: number;
  cpuBursts: number;
  cpuBurstDuration: number;
  ioBurstDuration: number;
  priority: number; // 1..100 (mayor = más prioridad)
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
  turnaround: number;       // TRp
  normalizedTR: number;     // TRn
  readyTime: number;        // tiempo en listo
}

export interface BatchMetrics {
  batchTR: number;          // TRt
  avgTurnaround: number;    // TM_Rt
  cpuIdle: number;          // tiempo ocioso
  cpuOS: number;            // TIP + TFP + TCP
  cpuUser: number;          // tiempo de CPU efectiva de procesos
  cpuIdlePct?: number;
  cpuOSPct?: number;
  cpuUserPct?: number;
}

export interface Metrics {
  perProcess: MetricsPerProcess[];
  batch: BatchMetrics;
}

export type EventType =
  | 'ARRIVE'
  | 'ADMIT'                // NEW->READY tras TIP (o aceptación)
  | 'DISPATCH'             // READY->RUN con TCP
  | 'CONTEXT_SWITCH'       // cobro de TCP
  | 'CPU_BURST_START'
  | 'CPU_BURST_COMPLETE'
  | 'QUANTUM_EXPIRED'
  | 'IO_START'
  | 'IO_COMPLETE'
  | 'IO_INTERRUPT_HANDLED'
  | 'PROCESS_FINISHED';

export interface SimEvent {
  time: number;
  type: EventType;
  process: string;   // nombre/id del proceso; para eventos globales podés usar '-'
  extra?: string;    // TIP=, TFP=, TCP=, restante=, etc.
}

export interface GanttSlice {
  process: string;        // nombre o 'SO'/'IDLE'/'CTX'
  tStart: number;
  tEnd: number;
  kind: 'CPU' | 'IO' | 'TIP' | 'TFP' | 'CTX' | 'IDLE';
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
