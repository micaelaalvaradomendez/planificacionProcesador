import { describe, it, expect } from 'vitest';
import { readJSON, writeJSON, GOLDENS_DIR, FIXTURES_DIR, shouldUpdateGoldens } from '../../_helpers/fs';
import { normalizeGantt, normalizeTrace } from '../../_helpers/compare';
import { runSimulation } from '$lib/stores/simulacion';

type Scenario = { cfg: any; procesos: any[] };

async function checkGolden(prefix: string) {
  const scenario = await readJSON<Scenario>(`${FIXTURES_DIR}/${prefix}.scenario.json`);
  const { trace, metricas, gantt } = runSimulation(scenario.cfg, scenario.procesos);

  // Normalizar para comparar establmente
  const T = normalizeTrace(trace);
  const G = normalizeGantt(gantt);

  const tracePath = `${GOLDENS_DIR}/${prefix}.trace.json`;
  const metrPath  = `${GOLDENS_DIR}/${prefix}.metricas.json`;
  const ganttPath = `${GOLDENS_DIR}/${prefix}.gantt.json`;

  if (shouldUpdateGoldens) {
    await writeJSON(tracePath, T);
    await writeJSON(metrPath,  metricas);
    await writeJSON(ganttPath, G);
    console.log(` Updated goldens for ${prefix}`);
    return; // No comparamos cuando actualizamos
  }

  const Tgolden = await readJSON(tracePath);
  const Mgolden = await readJSON(metrPath);
  const Ggolden = await readJSON(ganttPath);

  expect(T).toEqual(Tgolden);
  expect(metricas).toEqual(Mgolden);
  expect(G).toEqual(Ggolden);
}

describe('integration: goldens', () => {
  it('A_sinES_FCFS (goldens)', async () => {
    await checkGolden('A_sinES_FCFS');
  });

  it('B_conES_25 (goldens)', async () => {
    await checkGolden('B_conES_25');
  });

  it('RR_q2 (goldens)', async () => {
    await checkGolden('RR_q2');
  });

  it('SRTN_preempt (goldens)', async () => {
    await checkGolden('SRTN_preempt');
  });
});