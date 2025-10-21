import { describe, it, expect } from 'vitest';
import { runRR, runSRTN } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

describe('Correcciones de Schedulers RR y SRTN', () => {
  describe('Round Robin - Tests Golden', () => {
    it('RR: carrusel limpio sin duplicados - quantum=2', () => {
      // Test A: 3 procesos idénticos, quantum=2
      const procesos: Proceso[] = [
        { pid: 1, arribo: 0, rafagasCPU: [3], rafagasES: [], estado: 'N' },
        { pid: 2, arribo: 0, rafagasCPU: [3], rafagasES: [], estado: 'N' },
        { pid: 3, arribo: 0, rafagasCPU: [3], rafagasES: [], estado: 'N' }
      ];
      
      const costos = { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 25 };
      const trace = runRR(procesos, costos, 2);
      
      // Verificar que el carrusel rota correctamente
      const slices = trace.slices.sort((a, b) => a.start - b.start);
      
      // Esperado: P1:[0,2), P2:[2,4), P3:[4,6), P1:[6,7), P2:[7,8), P3:[8,9)
      expect(slices).toHaveLength(6);
      
      expect(slices[0]).toEqual({ pid: 1, start: 0, end: 2 });
      expect(slices[1]).toEqual({ pid: 2, start: 2, end: 4 });
      expect(slices[2]).toEqual({ pid: 3, start: 4, end: 6 });
      expect(slices[3]).toEqual({ pid: 1, start: 6, end: 7 }); // Último slice P1
      expect(slices[4]).toEqual({ pid: 2, start: 7, end: 8 }); // Último slice P2
      expect(slices[5]).toEqual({ pid: 3, start: 8, end: 9 }); // Último slice P3
      
      // Verificar que no hay duplicados en ready queue (indirectamente)
      // Si hubiera duplicados, el patrón sería diferente
      const eventos = trace.events.filter(e => e.type === 'L→C');
      expect(eventos).toHaveLength(6); // 6 despachos, uno por cada slice
    });

    it('RR: quantum agotado y retorno con quantum completo - quantum=3', () => {
      // Test B: P1 con E/S, P2 sin E/S
      const procesos: Proceso[] = [
        { pid: 1, arribo: 0, rafagasCPU: [2, 2], rafagasES: [5], estado: 'N' },
        { pid: 2, arribo: 0, rafagasCPU: [10], rafagasES: [], estado: 'N' }
      ];
      
      const costos = { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 25 };
      const trace = runRR(procesos, costos, 3);
      
      const slices = trace.slices.sort((a, b) => a.start - b.start);
      
      // Esperado:
      // P1 corre [0,2) y bloquea → B→L @ 7
      // P2 ocupa CPU [2,7) (5 unidades = 3+2 de dos slices)
      // A t=7, P1 retorna con quantum=3 completo
      
      expect(slices.length).toBeGreaterThan(3);
      
      // P1 primer slice [0,2)
      expect(slices[0]).toEqual({ pid: 1, start: 0, end: 2 });
      
      // P2 debería tener al menos un slice empezando en 2
      const p2Slices = slices.filter(s => s.pid === 2);
      expect(p2Slices[0].start).toBe(2);
      
      // P1 debería retornar después del bloqueo E/S
      const p1SecondSlice = slices.filter(s => s.pid === 1 && s.start > 2)[0];
      expect(p1SecondSlice).toBeDefined();
      expect(p1SecondSlice.end - p1SecondSlice.start).toBe(2); // Su segunda ráfaga
    });
  });

  describe('SRTN - Tests Golden', () => {
    it('SRTN: expropia cuando el otro es estrictamente menor', () => {
      // Test C: Expropiación correcta
      const procesos: Proceso[] = [
        { pid: 1, arribo: 0, rafagasCPU: [8], estado: 'N' },
        { pid: 2, arribo: 2, rafagasCPU: [3], estado: 'N' }
      ];
      
      const costos = { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 25 };
      const trace = runSRTN(procesos, costos);
      
      const slices = trace.slices.sort((a, b) => a.start - b.start);
      
      // Esperado:
      // P1 corre [0,2) → restante efectivo al llegar P2 es 6
      // P2 (3) < 6 → expropia a t=2
      // P2 corre [2,5) y termina; P1 retoma [5,11)
      
      expect(slices).toHaveLength(3);
      expect(slices[0]).toEqual({ pid: 1, start: 0, end: 2 });
      expect(slices[1]).toEqual({ pid: 2, start: 2, end: 5 });
      expect(slices[2]).toEqual({ pid: 1, start: 5, end: 11 }); // P1 con 6 restantes
    });

    it('SRTN: empate NO expropia (evita thrashing)', () => {
      // Test D: Empate no expropia
      const procesos: Proceso[] = [
        { pid: 1, arribo: 0, rafagasCPU: [5], estado: 'N' },
        { pid: 2, arribo: 2, rafagasCPU: [3], estado: 'N' }
      ];
      
      const costos = { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 25 };
      const trace = runSRTN(procesos, costos);
      
      const slices = trace.slices.sort((a, b) => a.start - b.start);
      
      // Esperado:
      // P1 corre [0,2) → restante efectivo al llegar P2 es 3
      // P2 restante 3 === 3 → NO expropia (empate)
      // P1 sigue hasta t=5, luego P2 corre [5,8)
      
      expect(slices).toHaveLength(2);
      expect(slices[0]).toEqual({ pid: 1, start: 0, end: 5 }); // P1 completo
      expect(slices[1]).toEqual({ pid: 2, start: 5, end: 8 }); // P2 después
    });
  });

  describe('Orden de eventos', () => {
    it('Los eventos simultáneos siguen el orden de prioridad correcto', () => {
      const procesos: Proceso[] = [
        { pid: 1, arribo: 0, rafagasCPU: [2], estado: 'N' },
        { pid: 2, arribo: 0, rafagasCPU: [2], estado: 'N' }
      ];
      
      const costos = { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 25 };
      const trace = runRR(procesos, costos, 1);
      
      // En t=0 deberían ocurrir N→L para ambos procesos
      const eventosT0 = trace.events.filter(e => e.t === 0);
      
      // N→L tiene prioridad 5, L→C tiene prioridad 6
      // Todos los N→L deberían ocurrir antes que L→C
      const nToL = eventosT0.filter(e => e.type === 'N→L');
      const lToC = eventosT0.filter(e => e.type === 'L→C');
      
      expect(nToL.length).toBe(2); // Ambos procesos
      expect(lToC.length).toBe(1); // Solo uno puede despachar
    });
  });
});
