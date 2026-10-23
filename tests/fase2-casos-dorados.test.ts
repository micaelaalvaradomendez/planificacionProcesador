import { describe, it, expect } from 'vitest';
import { runFCFS, runRR, runSPN, runSRTN, runPriority } from '../src/lib/engine/engine';
import { MetricsBuilder } from '../src/lib/metrics/metricas';
import type { Proceso } from '../src/lib/model/proceso';

describe('Fase 2: Casos Dorados (Golden Benchmark Tests)', () => {

  /**
   * Tanda canónica de la bibliografía de Sistemas Operativos (Silberschatz / Stallings)
   * P1: Arribo 0, CPU 3
   * P2: Arribo 2, CPU 6
   * P3: Arribo 4, CPU 4
   * P4: Arribo 6, CPU 5
   * P5: Arribo 8, CPU 2
   */
  const tandaClasica: Proceso[] = [
    { pid: 1, label: 'P1', arribo: 0, rafagasCPU: [3], rafagasES: [], prioridadBase: 3, estado: 'N' },
    { pid: 2, label: 'P2', arribo: 2, rafagasCPU: [6], rafagasES: [], prioridadBase: 2, estado: 'N' },
    { pid: 3, label: 'P3', arribo: 4, rafagasCPU: [4], rafagasES: [], prioridadBase: 1, estado: 'N' },
    { pid: 4, label: 'P4', arribo: 6, rafagasCPU: [5], rafagasES: [], prioridadBase: 4, estado: 'N' },
    { pid: 5, label: 'P5', arribo: 8, rafagasCPU: [2], rafagasES: [], prioridadBase: 5, estado: 'N' }
  ];

  it('FCFS: debe despachar estrictamente por orden de arribo', () => {
    const trace = runFCFS(tandaClasica, { TIP: 0, TCP: 0, TFP: 0 });
    const metrics = MetricsBuilder.build(trace, tandaClasica);
    const global = MetricsBuilder.buildGlobal(metrics, trace);

    // Secuencia de ejecución en FCFS: P1(0-3), P2(3-9), P3(9-13), P4(13-18), P5(18-20)
    expect(trace.slices.map(s => s.pid)).toEqual([1, 2, 3, 4, 5]);

    // Tiempos de retorno: t_fin - arribo
    // P1: 3 - 0 = 3
    // P2: 9 - 2 = 7
    // P3: 13 - 4 = 9
    // P4: 18 - 6 = 12
    // P5: 20 - 8 = 12
    const mP1 = metrics.find(m => m.pid === 1)!;
    const mP2 = metrics.find(m => m.pid === 2)!;
    const mP3 = metrics.find(m => m.pid === 3)!;
    const mP4 = metrics.find(m => m.pid === 4)!;
    const mP5 = metrics.find(m => m.pid === 5)!;

    expect(mP1.TRp).toBe(3);
    expect(mP2.TRp).toBe(7);
    expect(mP3.TRp).toBe(9);
    expect(mP4.TRp).toBe(12);
    expect(mP5.TRp).toBe(12);

    // Tiempo medio de retorno = (3 + 7 + 9 + 12 + 12) / 5 = 43 / 5 = 8.6
    expect(global.TRpPromedio).toBeCloseTo(8.6, 1);
    expect(global.tiempoTotalSimulacion).toBe(20);
    expect(global.utilizacionCPU).toBe(100);
  });

  it('SPN: debe priorizar procesos más cortos entre los listos al momento del despacho', () => {
    const trace = runSPN(tandaClasica, { TIP: 0, TCP: 0, TFP: 0 });
    const metrics = MetricsBuilder.build(trace, tandaClasica);

    // En SPN:
    // t=0: P1 corre de 0 a 3.
    // t=3: P2 listo (duración 6). P2 corre de 3 a 9.
    // Durante la ejecución de P2 llegan P3(4 en t=4), P4(5 en t=6), P5(2 en t=8).
    // A t=9: listos son P5(2), P3(4), P4(5). El más corto es P5.
    // t=9..11: P5 corre.
    // A t=11: listos son P3(4), P4(5). El más corto es P3.
    // t=11..15: P3 corre.
    // A t=15: P4 corre de 15 a 20.
    expect(trace.slices.map(s => s.pid)).toEqual([1, 2, 5, 3, 4]);

    const mP5 = metrics.find(m => m.pid === 5)!;
    // P5 arriba en 8 y termina en 11 -> TR = 3
    expect(mP5.TRp).toBe(3);
  });

  it('SRTN: debe expropiar cuando arriba un proceso con menor tiempo restante', () => {
    const trace = runSRTN(tandaClasica, { TIP: 0, TCP: 0, TFP: 0 });

    // En SRTN:
    // t=0..3: P1(3) corre completo
    // t=3..4: P2 entra a CPU. A t=4 arriba P3(4). Como 4 < 5 restante, P3 expropia a P2 en t=4.
    // t=4..8: P3 corre y termina.
    // Slices generados según prioridad determinista de eventos
    expect(trace.slices.map(s => s.pid)).toEqual([1, 2, 3, 2, 5, 4]);

    // Verificar expropiación explícita de P2 en t=4
    const preemption = trace.events.find(e => e.type === 'C→L' && e.pid === 2);
    expect(preemption).toBeDefined();
    expect(preemption?.t).toBe(4);
  });

  it('Round Robin: debe alternar procesos equitativamente con quantum = 1', () => {
    const procesosRR: Proceso[] = [
      { pid: 1, label: 'A', arribo: 0, rafagasCPU: [3], rafagasES: [], estado: 'N' },
      { pid: 2, label: 'B', arribo: 0, rafagasCPU: [2], rafagasES: [], estado: 'N' }
    ];

    const trace = runRR(procesosRR, { TIP: 0, TCP: 0, TFP: 0 }, 1);

    // Con Q=1 y ambos arribando en 0:
    // t=0..1: A (resta 2)
    // t=1..2: B (resta 1)
    // t=2..3: A (resta 1)
    // t=3..4: B (termina)
    // t=4..5: A (termina)
    expect(trace.slices.map(s => s.pid)).toEqual([1, 2, 1, 2, 1]);
    expect(trace.slices[4].end).toBe(5);
  });

  it('Caso con E/S: debe respetar la secuencia de ráfagas CPU, bloqueo E/S y reincorporación a listo', () => {
    const procesosConES: Proceso[] = [
      { pid: 1, label: 'P1', arribo: 0, rafagasCPU: [2, 3], rafagasES: [4], estado: 'N' },
      { pid: 2, label: 'P2', arribo: 1, rafagasCPU: [3], rafagasES: [], estado: 'N' }
    ];

    const trace = runFCFS(procesosConES, { TIP: 0, TCP: 0, TFP: 0 });

    // P1 corre CPU 0..2. A t=2 pasa a E/S durante 4 unidades (hasta t=6).
    // A t=2, P2 que arribó en 1 pasa a CPU y corre de 2 a 5.
    // A t=5, P2 termina. CPU queda libre de 5 a 6.
    // A t=6, P1 termina E/S, reingresa a listo y corre su 2da ráfaga de 6 a 9.
    const sliceP1Part1 = trace.slices.find(s => s.pid === 1 && s.start === 0);
    const sliceP2 = trace.slices.find(s => s.pid === 2);
    const sliceP1Part2 = trace.slices.find(s => s.pid === 1 && s.start === 6);

    expect(sliceP1Part1).toBeDefined();
    expect(sliceP1Part1?.end).toBe(2);

    expect(sliceP2).toBeDefined();
    expect(sliceP2?.start).toBe(2);
    expect(sliceP2?.end).toBe(5);

    expect(sliceP1Part2).toBeDefined();
    expect(sliceP1Part2?.start).toBe(6);
    expect(sliceP1Part2?.end).toBe(9);

    // Eventos de transición de estado
    expect(trace.events.some(e => e.type === 'C→B' && e.pid === 1 && e.t === 2)).toBe(true);
    expect(trace.events.some(e => e.type === 'B→L' && e.pid === 1 && e.t === 6)).toBe(true);
  });
});
