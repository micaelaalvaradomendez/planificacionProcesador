import type { Metrics } from '../../domain/types';

export function exportarMetricasJson(m: Metrics): Blob {
  return new Blob([JSON.stringify(m, null, 2)], { type: 'application/json' });
}

export function conPorcentajes(m: Metrics): Metrics {
  const total = m.tanda.cpuOcioso + m.tanda.cpuSO + m.tanda.cpuProcesos || 0;
  const pct = (x: number) => (total > 0 ? +(100 * x / total).toFixed(2) : 0);
  return {
    ...m,
    tanda: {
      ...m.tanda,
      porcentajeCpuOcioso: pct(m.tanda.cpuOcioso),
      porcentajeCpuSO: pct(m.tanda.cpuSO),
      porcentajeCpuProcesos: pct(m.tanda.cpuProcesos)
    }
  };
}
