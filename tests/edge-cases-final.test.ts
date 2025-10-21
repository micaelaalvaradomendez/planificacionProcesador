import { describe, it, expect } from 'vitest';
import { runFCFS, runRR } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

// Tests de edge cases para prevenir regresiones
describe('Scheduler Edge Cases - Prevención de Regresiones', () => {

  describe('Round Robin - Cases Críticos', () => {
    
    it('debe manejar quantum=1 sin bucles infinitos', () => {
      const procesos: Proceso[] = [
        { pid: 1, arribo: 0, rafagasCPU: [3], estado: 'N' },
        { pid: 2, arribo: 0, rafagasCPU: [3], estado: 'N' }
      ];
      
      const trace = runRR(procesos, {}, 1);
      
      // Debe generar slices válidos
      expect(trace.slices.length).toBeGreaterThan(0);
      
      // Debe terminar correctamente 
      const hasTermination = trace.events.some((e: any) => e.type === 'C→T');
      expect(hasTermination).toBe(true);
      
      // No debe "colgarse" - tiempo máximo razonable
      if (trace.events.length > 0) {
        const tiempoMax = Math.max(...trace.events.map((e: any) => e.t));
        expect(tiempoMax).toBeLessThan(20);
      }
    });

    it('debe manejar quantum muy grande sin preempciones innecesarias', () => {
      const procesos: Proceso[] = [
        { pid: 1, arribo: 0, rafagasCPU: [2], estado: 'N' },
        { pid: 2, arribo: 0, rafagasCPU: [3], estado: 'N' }
      ];
      
      const trace = runRR(procesos, {}, 100);
      
      // Con quantum grande, no debe haber preempciones por quantum
      const preemptions = trace.events.filter((e: any) => e.type === 'C→L');
      expect(preemptions.length).toBe(0);
      
      expect(trace.slices.length).toBeGreaterThan(0);
    });

    it('debe manejar múltiples procesos con arribos simultáneos', () => {
      const procesos: Proceso[] = [
        { pid: 1, arribo: 0, rafagasCPU: [4], estado: 'N' },
        { pid: 2, arribo: 0, rafagasCPU: [4], estado: 'N' },
        { pid: 3, arribo: 0, rafagasCPU: [4], estado: 'N' }
      ];
      
      const trace = runRR(procesos, {}, 2);
      
      // Todos deben ejecutar
      const pidsEjecutados = new Set(trace.slices.map((s: any) => s.pid));
      expect(pidsEjecutados.has(1)).toBe(true);
      expect(pidsEjecutados.has(2)).toBe(true);
      expect(pidsEjecutados.has(3)).toBe(true);
    });
  });

  describe('Traces Degeneradas', () => {
    
    it('debe manejar proceso único', () => {
      const procesos: Proceso[] = [
        { pid: 1, arribo: 0, rafagasCPU: [5], estado: 'N' }
      ];
      
      const trace = runRR(procesos, {}, 2);
      
      expect(trace.events.length).toBeGreaterThan(0);
      expect(trace.slices.length).toBeGreaterThan(0);
      
      const termino = trace.events.some((e: any) => e.type === 'C→T' && e.pid === 1);
      expect(termino).toBe(true);
    });

    it('debe manejar arribos tardíos', () => {
      const procesos: Proceso[] = [
        { pid: 1, arribo: 10, rafagasCPU: [2], estado: 'N' },
        { pid: 2, arribo: 15, rafagasCPU: [3], estado: 'N' }
      ];
      
      const trace = runFCFS(procesos);
      
      // No debe haber actividad antes de t=10
      const eventosTempranos = trace.events.filter((e: any) => e.t < 10);
      expect(eventosTempranos.length).toBe(0);
      
      if (trace.events.length > 0) {
        const eventos = [...trace.events].sort((a: any, b: any) => a.t - b.t);
        expect(eventos[0].t).toBe(10);
      }
    });

    it('debe manejar ráfagas de duración 0', () => {
      const procesos: Proceso[] = [
        { pid: 1, arribo: 0, rafagasCPU: [0], estado: 'N' },
        { pid: 2, arribo: 0, rafagasCPU: [3], estado: 'N' }
      ];
      
      const trace = runFCFS(procesos);
      
      // P1 no debe generar slices CPU
      const slicesP1 = trace.slices.filter((s: any) => s.pid === 1);
      expect(slicesP1.length).toBe(0);
      
      // P1 debe terminar inmediatamente
      const terminoP1 = trace.events.some((e: any) => e.type === 'C→T' && e.pid === 1);
      expect(terminoP1).toBe(true);
    });

    it('debe manejar arrays de ráfagas vacíos', () => {
      const procesos: Proceso[] = [
        { pid: 1, arribo: 0, rafagasCPU: [], estado: 'N' },
        { pid: 2, arribo: 0, rafagasCPU: [2], estado: 'N' }
      ];
      
      const trace = runFCFS(procesos);
      
      // P1 no debe generar slices
      const slicesP1 = trace.slices.filter((s: any) => s.pid === 1);
      expect(slicesP1.length).toBe(0);
      
      // P2 debe ejecutar normalmente ya que el simulador está corregido
      const slicesP2 = trace.slices.filter((s: any) => s.pid === 2);
      expect(slicesP2.length).toBe(1);
      expect(slicesP2[0].pid).toBe(2);
      expect(slicesP2[0].end - slicesP2[0].start).toBe(2); // duración de la ráfaga
      
      // Debe generar eventos de terminación para ambos procesos
      const eventosTerminacion = trace.events.filter((e: any) => e.type === 'C→T');
      expect(eventosTerminacion.length).toBe(2);
      
      // Verificar que ambos procesos terminaron
      const terminoP1 = eventosTerminacion.some((e: any) => e.pid === 1);
      const terminoP2 = eventosTerminacion.some((e: any) => e.pid === 2);
      expect(terminoP1).toBe(true);
      expect(terminoP2).toBe(true);
    });
  });

  describe('Validación de Datos', () => {
    
    it('debe generar timestamps válidos', () => {
      const procesos: Proceso[] = [
        { pid: 1, arribo: 0, rafagasCPU: [3], estado: 'N' },
        { pid: 2, arribo: 1, rafagasCPU: [2], estado: 'N' }
      ];
      
      const trace = runRR(procesos, {}, 2);
      
      // Validar eventos
      for (const event of trace.events) {
        expect((event as any).t).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite((event as any).t)).toBe(true);
      }
      
      // Validar slices
      for (const slice of trace.slices) {
        expect((slice as any).end).toBeGreaterThan((slice as any).start);
        expect((slice as any).start).toBeGreaterThanOrEqual(0);
      }
    });

    it('debe mantener orden temporal', () => {
      const procesos: Proceso[] = [
        { pid: 1, arribo: 0, rafagasCPU: [2], estado: 'N' },
        { pid: 2, arribo: 3, rafagasCPU: [2], estado: 'N' }
      ];
      
      const trace = runFCFS(procesos);
      
      // Eventos en orden no decreciente
      for (let i = 1; i < trace.events.length; i++) {
        expect((trace.events[i] as any).t).toBeGreaterThanOrEqual((trace.events[i-1] as any).t);
      }
    });
  });

  describe('Robustez del Sistema', () => {
    
    it('debe recuperarse de situaciones extremas', () => {
      const procesos: Proceso[] = [
        { pid: 1, arribo: 0, rafagasCPU: [1], estado: 'N' },     // Muy corto
        { pid: 2, arribo: 0, rafagasCPU: [50], estado: 'N' },   // Muy largo
        { pid: 3, arribo: 25, rafagasCPU: [1], estado: 'N' }    // Arribo tardío
      ];
      
      const trace = runRR(procesos, {}, 1);
      
      // Todos deben terminar
      const terminaciones = trace.events.filter((e: any) => e.type === 'C→T');
      expect(terminaciones.length).toBe(3);
      
      // No debe colgarse
      if (trace.events.length > 0) {
        const tiempoMax = Math.max(...trace.events.map((e: any) => e.t));
        expect(tiempoMax).toBeLessThan(200); // Límite generoso
      }
    });

    it('debe manejar muchos procesos pequeños', () => {
      const procesos: Proceso[] = [];
      for (let i = 1; i <= 10; i++) {
        procesos.push({ pid: i, arribo: 0, rafagasCPU: [1], estado: 'N' });
      }
      
      const trace = runRR(procesos, {}, 1);
      
      // Todos deben terminar
      const terminaciones = trace.events.filter((e: any) => e.type === 'C→T');
      expect(terminaciones.length).toBe(10);
      
      // Debe generar slices para todos
      const pidsConSlices = new Set(trace.slices.map((s: any) => s.pid));
      expect(pidsConSlices.size).toBe(10);
    });
  });
});
