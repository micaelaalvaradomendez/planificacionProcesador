import { describe, it, expect } from 'vitest';
import { MetricsBuilder } from '$lib/metrics/metricas';
import { normalizeTrace } from '../../_helpers/compare';

describe('metrics/MetricsBuilder', () => {
  it('calcula TRp/TE/TRn coherentes para trace simple', () => {
    const trace = normalizeTrace({
      events: [
        { t: 0, type: 'N→L', pid: 1 },
        { t: 0, type: 'L→C', pid: 1 },
        { t: 3, type: 'C→T', pid: 1 },
        { t: 1, type: 'N→L', pid: 2 },
        { t: 3, type: 'L→C', pid: 2 },
        { t: 5, type: 'C→T', pid: 2 }
      ],
      slices: [
        { pid: 1, start: 0, end: 3 },
        { pid: 2, start: 3, end: 5 }
      ]
    });
    
    const procesos = [
      { pid: 1, arribo: 0, rafagasCPU: [3], estado: 'N' as const },
      { pid: 2, arribo: 1, rafagasCPU: [2], estado: 'N' as const }
    ];
    
    const metricas = MetricsBuilder.build(trace, procesos);
    const p1 = metricas.find((m: any) => m.pid === 1);
    const p2 = metricas.find((m: any) => m.pid === 2);

    expect(p1?.TRp).toBe(3); // fin(3) - arribo(0)
    expect(p1?.TE).toBe(0);  // TRp(3) - servicioCPU(3)
    expect(p1?.TRn).toBeCloseTo(1); // TRp(3) / servicioCPU(3)

    expect(p2?.TRp).toBe(4); // fin(5) - arribo(1)
    expect(p2?.TE).toBe(2);  // TRp(4) - servicioCPU(2)
    expect(p2?.TRn).toBeCloseTo(2); // TRp(4) / servicioCPU(2)
  });

  it('calcula promedios globales correctamente', () => {
    const trace = normalizeTrace({
      events: [],
      slices: [
        { pid: 1, start: 0, end: 2 },
        { pid: 2, start: 2, end: 4 }
      ]
    });
    
    const procesos = [
      { pid: 1, arribo: 0, rafagasCPU: [2], estado: 'N' as const },
      { pid: 2, arribo: 0, rafagasCPU: [2], estado: 'N' as const }
    ];
    
    const metricas = MetricsBuilder.build(trace, procesos);
    const globales = MetricsBuilder.buildGlobal(metricas, trace);

    expect(globales.TRpPromedio).toBe(3); // (2+4)/2
    expect(globales.TEPromedio).toBe(1); // (0+2)/2
    expect(globales.TRnPromedio).toBeCloseTo(1.5); // (1+2)/2
  });
});