import type { Metrics } from '../model/types';

export function exportMetricsJson(m: Metrics): Blob {
  return new Blob([JSON.stringify(m, null, 2)], { type: 'application/json' });
}

export function withPercentages(m: Metrics): Metrics {
  const total = m.batch.cpuIdle + m.batch.cpuOS + m.batch.cpuUser || 0;
  const pct = (x: number) => (total > 0 ? +(100 * x / total).toFixed(2) : 0);
  return {
    ...m,
    batch: {
      ...m.batch,
      cpuIdlePct: pct(m.batch.cpuIdle),
      cpuOSPct: pct(m.batch.cpuOS),
      cpuUserPct: pct(m.batch.cpuUser)
    }
  };
}
