// src/lib/io/fixtures.ts
import type { Proceso } from '$lib/model/proceso';
import type { SimulationConfig } from '$lib/stores/simulacion';

type FixtureName = 'A_sinES_FCFS' | 'B_conES_25' | 'RR_q2' | 'SRTN_preempt';

export interface Fixture {
  cfg: SimulationConfig;
  procesos: Proceso[];
}

const baseCostos = { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 0 };

export const fixtures: Record<FixtureName, Fixture> = {
  A_sinES_FCFS: {
    cfg: { politica: 'FCFS', costos: { ...baseCostos } },
    procesos: [
      { pid: 1, label: 'P1', arribo: 0, rafagasCPU: [5], estado: 'N' },
      { pid: 2, label: 'P2', arribo: 2, rafagasCPU: [3], estado: 'N' },
    ],
  },
  B_conES_25: {
    cfg: { politica: 'FCFS', costos: { ...baseCostos, bloqueoES: 25 } },
    procesos: [
      { pid: 1, label: 'P1', arribo: 0, rafagasCPU: [4, 4], estado: 'N' }, // dos ráfagas → habrá B→L intermedio
      { pid: 2, label: 'P2', arribo: 1, rafagasCPU: [6], estado: 'N' },
    ],
  },
  RR_q2: {
    cfg: { politica: 'RR', quantum: 2, costos: { ...baseCostos } },
    procesos: [
      { pid: 1, label: 'P1', arribo: 0, rafagasCPU: [5], estado: 'N' },
      { pid: 2, label: 'P2', arribo: 0, rafagasCPU: [5], estado: 'N' },
      { pid: 3, label: 'P3', arribo: 1, rafagasCPU: [3], estado: 'N' },
    ],
  },
  SRTN_preempt: {
    cfg: { politica: 'SRTN', costos: { ...baseCostos } },
    procesos: [
      { pid: 1, label: 'P1', arribo: 0, rafagasCPU: [8], estado: 'N' },
      { pid: 2, label: 'P2', arribo: 2, rafagasCPU: [3], estado: 'N' },
    ],
  },
};

export function getFixture(name: FixtureName): Fixture {
  return structuredClone(fixtures[name]);
}