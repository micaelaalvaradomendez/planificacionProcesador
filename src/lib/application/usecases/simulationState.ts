import type { Workload, SimEvent, Metrics, Policy, GanttSlice } from '$lib/model/types';
import type { EstadisticasExtendidas } from '$lib/application/usecases/computeStatistics';

export interface SimulationState {
  file: File | null;
  mode: 'json' | 'csv';
  policy: Policy;
  tip: number;
  tfp: number;
  tcp: number;
  quantum?: number;
  workload: Workload | null;
  errors: string[];
  loaded: boolean;
  simulacionEnCurso: boolean;
  simulacionCompletada: boolean;
  events: SimEvent[];
  metrics: Metrics;
  ganttSlices: GanttSlice[];
  estadisticasExtendidas: EstadisticasExtendidas | null;
  tiempoTotalSimulacion: number;
  advertencias: string[];
}

export function getInitialSimulationState(): SimulationState {
  return {
    file: null,
    mode: 'json',
    policy: 'FCFS',
    tip: 0,
    tfp: 0,
    tcp: 0,
    quantum: undefined,
    workload: null,
    errors: [],
    loaded: false,
    simulacionEnCurso: false,
    simulacionCompletada: false,
    events: [],
    metrics: {
      porProceso: [],
      tanda: { tiempoRetornoTanda: 0, tiempoMedioRetorno: 0, cpuOcioso: 0, cpuSO: 0, cpuProcesos: 0 }
    },
    ganttSlices: [],
    estadisticasExtendidas: null,
    tiempoTotalSimulacion: 0,
    advertencias: []
  };
}

export function resetSimulationState(state: SimulationState) {
  state.simulacionCompletada = false;
  state.events = [];
  state.metrics = {
    porProceso: [],
    tanda: { tiempoRetornoTanda: 0, tiempoMedioRetorno: 0, cpuOcioso: 0, cpuSO: 0, cpuProcesos: 0 }
  };
  state.ganttSlices = [];
  state.estadisticasExtendidas = null;
  state.tiempoTotalSimulacion = 0;
  state.advertencias = [];
  state.errors = [];
}