import { describe, it, expect } from 'vitest';
import { runFCFS, runRR, runPriority } from '../src/lib/engine/engine';
import { MetricsBuilder } from '../src/lib/metrics/metricas';
import { buildResultadoJSON } from '../src/lib/io/export';
import { validateJSONData } from '../src/lib/io/json-validator';
import type { Proceso } from '../src/lib/model/proceso';

describe('Fase 0 - Verificación de Contratos y Correcciones Críticas', () => {

  describe('Hallazgo 3: TFP no debe solaparse con el siguiente despacho cuando TCP = 0', () => {
    it('TFP de P1 debe culminar antes de que P2 comience a ejecutar', () => {
      const procesos: Proceso[] = [
        { pid: 1, arribo: 0, rafagasCPU: [2], rafagasES: [], estado: 'N' },
        { pid: 2, arribo: 0, rafagasCPU: [3], rafagasES: [], estado: 'N' }
      ];

      // Costos con TFP > 0 y TCP = 0
      const costos = { TIP: 0, TCP: 0, TFP: 3, bloqueoES: 25 };
      const trace = runFCFS(procesos, costos);

      // P1 corre CPU [0, 2), luego TFP ocupa [2, 5).
      // P2 no debe despachar antes de t = 5.
      const slicesP1 = trace.slices.filter(s => s.pid === 1);
      const slicesP2 = trace.slices.filter(s => s.pid === 2);
      const tfpP1 = (trace.overheads ?? []).find(o => o.pid === 1 && o.kind === 'TFP');

      expect(slicesP1).toHaveLength(1);
      expect(slicesP1[0]).toEqual({ pid: 1, start: 0, end: 2 });

      expect(tfpP1).toBeDefined();
      expect(tfpP1).toMatchObject({ pid: 1, t0: 2, t1: 5, kind: 'TFP' });

      expect(slicesP2).toHaveLength(1);
      // P2 no debe solaparse con el TFP de P1: debe iniciar en o después de t=5
      expect(slicesP2[0].start).toBeGreaterThanOrEqual(tfpP1!.t1);
    });
  });

  describe('Hallazgos 4 y 5: Métricas globales desde min(arribo) y tiempoRespuesta', () => {
    it('debe calcular tiempo total desde el primer arribo y reportar tiempo de respuesta', () => {
      const procesos: Proceso[] = [
        { pid: 1, arribo: 10, rafagasCPU: [4], rafagasES: [], estado: 'N' },
        { pid: 2, arribo: 12, rafagasCPU: [2], rafagasES: [], estado: 'N' }
      ];

      const trace = runFCFS(procesos, { TIP: 0, TCP: 0, TFP: 0 });
      const processMetrics = MetricsBuilder.build(trace, procesos);
      const globalMetrics = MetricsBuilder.buildGlobal(processMetrics, trace);

      // P1 corre [10, 14), P2 corre [14, 16)
      // Primer arribo = 10, último fin = 16. Tiempo total = 16 - 10 = 6 (no 16!)
      expect(globalMetrics.tiempoTotalSimulacion).toBe(6);
      expect(globalMetrics.throughput).toBeCloseTo(2 / 6, 2);

      // Tiempo de respuesta: P1 llega en 10 y despacha en 10 -> 0.
      // P2 llega en 12 y despacha en 14 -> 2.
      const mP1 = processMetrics.find(m => m.pid === 1)!;
      const mP2 = processMetrics.find(m => m.pid === 2)!;
      expect(mP1.tiempoRespuesta).toBe(0);
      expect(mP2.tiempoRespuesta).toBe(2);
      expect(globalMetrics.tiempoRespuestaPromedio).toBe(1);
    });

    it('cpuOciosa debe manejar timestamps grandes sin asignar arrays gigantes', () => {
      const procesos: Proceso[] = [
        { pid: 1, arribo: 100000, rafagasCPU: [5], rafagasES: [], estado: 'N' }
      ];

      const trace = runFCFS(procesos, { TIP: 0, TCP: 0, TFP: 0 });
      const processMetrics = MetricsBuilder.build(trace, procesos);
      const globalMetrics = MetricsBuilder.buildGlobal(processMetrics, trace);

      // Tiempo total de simulación = 5 (desde 100000 a 100005)
      expect(globalMetrics.tiempoTotalSimulacion).toBe(5);
      expect(globalMetrics.cpuOciosa).toBe(0);
      expect(globalMetrics.utilizacionCPU).toBe(100);
    });
  });

  describe('Hallazgo 6: Prioridad con aging expropia según prioridad efectiva', () => {
    it('un proceso de prioridad base inferior pero envejecido debe poder expropiar', () => {
      // P1: prioridadBase 2, ráfaga 20. Despacha en 0.
      // P2: arriba en t=0 con prioridadBase 5.
      // Con ageQuantum=2, tras esperar en listo, P2 reduce su prioridad (mejora hacia 1).
      // Tras esperar suficiente tiempo en listo, su prioridad efectiva será menor a 2 y expropiará.
      const procesos: Proceso[] = [
        { pid: 1, arribo: 0, rafagasCPU: [20], prioridadBase: 2, estado: 'N' },
        { pid: 2, arribo: 0, rafagasCPU: [5], prioridadBase: 5, estado: 'N' }
      ];

      const trace = runPriority(procesos, { TIP: 0, TCP: 0, TFP: 0 });
      
      // Debe haber al menos una expropiación por envejecimiento
      const preemptEvents = trace.events.filter(e => e.type === 'C→L');
      expect(preemptEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Hallazgo 7: Round-trip de exportación e importación', () => {
    it('el JSON exportado por buildResultadoJSON debe ser validado exitosamente por validateJSONData', () => {
      const procesos: Proceso[] = [
        { pid: 1, label: 'P1', arribo: 0, rafagasCPU: [3], rafagasES: [], prioridadBase: 2, estado: 'N' },
        { pid: 2, label: 'P2', arribo: 1, rafagasCPU: [4], rafagasES: [], prioridadBase: 1, estado: 'N' }
      ];

      const cfg = {
        politica: 'RR',
        algoritmo: 'RR',
        costos: { TIP: 1, TCP: 1, TFP: 1, bloqueoES: 25 },
        quantum: 2
      };

      const trace = runRR(procesos, cfg.costos, cfg.quantum);
      const metricas = {
        porProceso: MetricsBuilder.build(trace, procesos),
        global: MetricsBuilder.buildGlobal(MetricsBuilder.build(trace, procesos), trace)
      };
      const gantt = { tracks: [], totalDuration: 10 };

      const exportedPayload = buildResultadoJSON(cfg, procesos, trace, metricas, gantt);
      const jsonString = JSON.stringify(exportedPayload);
      const parsed = JSON.parse(jsonString);

      const validation = validateJSONData(parsed);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

});
