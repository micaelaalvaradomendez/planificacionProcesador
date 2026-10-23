import { describe, it, expect } from 'vitest';
import { runFCFS, runRR, runSPN, runSRTN, runPriority } from '../src/lib/engine/engine';
import { MetricsBuilder } from '../src/lib/metrics/metricas';
import type { Proceso } from '../src/lib/model/proceso';

/**
 * Generador pseudoaleatorio determinista (PRNG Mulberry32)
 * Permite reproducibilidad absoluta en tests de propiedades sin librerías externas.
 */
function createPRNG(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Genera una tanda aleatoria de procesos controlada por un seed
 */
function generarTandaAleatoria(cantidad: number, rng: () => number, baseTime = 0): Proceso[] {
  const procesos: Proceso[] = [];
  let ultimoArribo = baseTime;

  for (let i = 1; i <= cantidad; i++) {
    // Arribos escalonados o simultáneos
    if (i > 1 && rng() > 0.3) {
      ultimoArribo += Math.floor(rng() * 4) + 1;
    }
    const cantRafagas = Math.floor(rng() * 3) + 1; // 1 a 3 ráfagas
    const rafagasCPU: number[] = [];
    const rafagasES: number[] = [];

    for (let r = 0; r < cantRafagas; r++) {
      rafagasCPU.push(Math.floor(rng() * 6) + 1); // 1 a 6 ticks
      if (r < cantRafagas - 1) {
        rafagasES.push(Math.floor(rng() * 4) + 1); // 1 a 4 ticks
      }
    }

    const prioridadBase = Math.floor(rng() * 10) + 1; // 1 a 10

    procesos.push({
      pid: i,
      label: `P${i}`,
      arribo: ultimoArribo,
      rafagasCPU,
      rafagasES,
      prioridadBase,
      estado: 'N'
    });
  }

  return procesos;
}

describe('Fase 2: Pruebas Basadas en Propiedades e Invariantes', () => {

  const schedulers = [
    { name: 'FCFS', run: (ps: Proceso[]) => runFCFS(ps, { TIP: 0, TCP: 0, TFP: 0 }) },
    { name: 'SPN', run: (ps: Proceso[]) => runSPN(ps, { TIP: 0, TCP: 0, TFP: 0 }) },
    { name: 'SRTN', run: (ps: Proceso[]) => runSRTN(ps, { TIP: 0, TCP: 0, TFP: 0 }) },
    { name: 'RR (q=2)', run: (ps: Proceso[]) => runRR(ps, { TIP: 0, TCP: 0, TFP: 0 }, 2) },
    { name: 'Priority (aging)', run: (ps: Proceso[]) => runPriority(ps, { TIP: 0, TCP: 0, TFP: 0 }, { quantum: 2, incremento: 1 }) }
  ];

  it('Invariante 1 [Exclusión Mutua]: Nunca hay dos procesos ejecutando en CPU simultáneamente', () => {
    const rng = createPRNG(42);

    for (let i = 0; i < 30; i++) {
      const tanda = generarTandaAleatoria(5, rng);

      for (const { name, run } of schedulers) {
        const trace = run(tanda);

        // Verificar cada par consecutivo de slices
        for (let j = 0; j < trace.slices.length - 1; j++) {
          const actual = trace.slices[j];
          const siguiente = trace.slices[j + 1];

          expect(
            actual.end <= siguiente.start,
            `[${name}] Solapamiento detectado entre P${actual.pid} [${actual.start}-${actual.end}] y P${siguiente.pid} [${siguiente.start}-${siguiente.end}]`
          ).toBe(true);
        }
      }
    }
  });

  it('Invariante 2 [Conservación de Trabajo]: El tiempo de CPU ejecutado coincide exactamente con la suma de ráfagas', () => {
    const rng = createPRNG(1337);

    for (let i = 0; i < 30; i++) {
      const tanda = generarTandaAleatoria(4, rng);

      for (const { name, run } of schedulers) {
        const trace = run(tanda);

        for (const p of tanda) {
          const sumaRafagasEsperada = p.rafagasCPU.reduce((acc, v) => acc + v, 0);
          const cpuEjecutadaReal = trace.slices
            .filter(s => s.pid === p.pid)
            .reduce((acc, s) => acc + (s.end - s.start), 0);

          expect(
            cpuEjecutadaReal,
            `[${name}] Proceso P${p.pid} ejecutó ${cpuEjecutadaReal} de CPU pero sus ráfagas sumaban ${sumaRafagasEsperada}`
          ).toBe(sumaRafagasEsperada);
        }
      }
    }
  });

  it('Invariante 3 [Unicidad de Finalización]: Todo proceso que ingresa finaliza exactamente una vez', () => {
    const rng = createPRNG(999);

    for (let i = 0; i < 25; i++) {
      const tanda = generarTandaAleatoria(4, rng);

      for (const { name, run } of schedulers) {
        const trace = run(tanda);

        for (const p of tanda) {
          const eventosFin = trace.events.filter(e => e.type === 'C→T' && e.pid === p.pid);
          expect(
            eventosFin.length,
            `[${name}] Proceso P${p.pid} tiene ${eventosFin.length} eventos de finalización (C→T), esperado: 1`
          ).toBe(1);
        }
      }
    }
  });

  it('Invariante 4 [Determinismo Estricto]: La misma tanda ejecutada múltiples veces produce idéntico resultado', () => {
    const rng = createPRNG(2026);
    const tanda = generarTandaAleatoria(6, rng);

    for (const { name, run } of schedulers) {
      const corrida1 = run(tanda);
      const corrida2 = run(tanda);

      expect(corrida1.slices).toEqual(corrida2.slices);
      expect(corrida1.events.map(e => ({ t: e.t, type: e.type, pid: e.pid })))
        .toEqual(corrida2.events.map(e => ({ t: e.t, type: e.type, pid: e.pid })));
    }
  });
});

describe('Fase 2: Pruebas Metamórficas (Metamorphic Testing)', () => {

  it('Metamórfica 1 [Desplazamiento Temporal]: Desplazar todos los arribos en +K desplaza la traza en +K y preserva métricas', () => {
    const rng = createPRNG(777);
    const tandaOriginal = generarTandaAleatoria(4, rng, 0);
    const K = 15;

    // Tanda desplazada en K unidades
    const tandaDesplazada: Proceso[] = tandaOriginal.map(p => ({
      ...p,
      arribo: p.arribo + K
    }));

    const schedulers = [
      { name: 'FCFS', run: (ps: Proceso[]) => runFCFS(ps, { TIP: 0, TCP: 0, TFP: 0 }) },
      { name: 'SPN', run: (ps: Proceso[]) => runSPN(ps, { TIP: 0, TCP: 0, TFP: 0 }) },
      { name: 'SRTN', run: (ps: Proceso[]) => runSRTN(ps, { TIP: 0, TCP: 0, TFP: 0 }) },
      { name: 'RR', run: (ps: Proceso[]) => runRR(ps, { TIP: 0, TCP: 0, TFP: 0 }, 2) }
    ];

    for (const { name, run } of schedulers) {
      const traceOrig = run(tandaOriginal);
      const traceDesp = run(tandaDesplazada);

      const metricsOrig = MetricsBuilder.build(traceOrig, tandaOriginal);
      const metricsDesp = MetricsBuilder.build(traceDesp, tandaDesplazada);

      // 1. Cada slice desplazado exactamente en K
      expect(traceDesp.slices.length).toBe(traceOrig.slices.length);
      for (let s = 0; s < traceOrig.slices.length; s++) {
        expect(traceDesp.slices[s].start).toBe(traceOrig.slices[s].start + K);
        expect(traceDesp.slices[s].end).toBe(traceOrig.slices[s].end + K);
        expect(traceDesp.slices[s].pid).toBe(traceOrig.slices[s].pid);
      }

      // 2. Las métricas de tiempo de retorno y espera por proceso deben ser idénticas
      for (const mOrig of metricsOrig) {
        const mDesp = metricsDesp.find(m => m.pid === mOrig.pid)!;
        expect(mDesp.TRp, `[${name}] P${mOrig.pid} retorno`).toBe(mOrig.TRp);
        expect(mDesp.TE, `[${name}] P${mOrig.pid} espera`).toBe(mOrig.TE);
      }
    }
  });

  it('Metamórfica 2 [Equivalencia Monoproceso]: Con un solo proceso continuo, todas las políticas producen idéntico tiempo de retorno', () => {
    const unProceso: Proceso[] = [
      { pid: 1, label: 'Solo', arribo: 5, rafagasCPU: [8], rafagasES: [], prioridadBase: 1, estado: 'N' }
    ];

    const fcfs = runFCFS(unProceso, { TIP: 0, TCP: 0, TFP: 0 });
    const spn = runSPN(unProceso, { TIP: 0, TCP: 0, TFP: 0 });
    const srtn = runSRTN(unProceso, { TIP: 0, TCP: 0, TFP: 0 });
    const rr = runRR(unProceso, { TIP: 0, TCP: 0, TFP: 0 }, 10);
    const pri = runPriority(unProceso, { TIP: 0, TCP: 0, TFP: 0 }, { quantum: 2, incremento: 1 });

    const retornos = [fcfs, spn, srtn, rr, pri].map(t => {
      const m = MetricsBuilder.build(t, unProceso);
      return m[0].TRp;
    });

    // En todos los casos el proceso arriba en 5, corre 8 ticks y termina en 13 -> TR = 8
    expect(new Set(retornos).size).toBe(1);
    expect(retornos[0]).toBe(8);
  });
});
