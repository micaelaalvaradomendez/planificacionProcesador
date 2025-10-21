import { describe, it, expect } from 'vitest';
import { GanttBuilder } from '../src/lib/gantt/builder';
import type { Trace } from '../src/lib/engine/types';
import type { GanttSeg } from '../src/lib/gantt/schema';

describe('GanttBuilder - Calidad de Salida', () => {
  
  it('debe fusionar segmentos CPU adyacentes del mismo proceso', () => {
    const trace: Trace = {
      events: [],
      slices: [
        { pid: 1, start: 0, end: 2 },
        { pid: 1, start: 2, end: 4 }, // Adyacente al anterior
        { pid: 1, start: 5, end: 7 }, // Gap, no se fusiona
      ],
      overheads: []
    };
    
    const gantt = GanttBuilder.build(trace);
    const p1Track = gantt.tracks.find(t => t.pid === '1');
    
    expect(p1Track).toBeDefined();
    expect(p1Track!.segments).toHaveLength(2); // Fusionó los primeros dos
    expect(p1Track!.segments[0]).toMatchObject({ start: 0, end: 4, type: 'cpu' });
    expect(p1Track!.segments[1]).toMatchObject({ start: 5, end: 7, type: 'cpu' });
  });

  it('debe manejar overheads sin crear solapamientos problemáticos', () => {
    const trace: Trace = {
      events: [],
      slices: [
        { pid: 1, start: 0, end: 5 }
      ],
      overheads: [
        { pid: 1, t0: 1, t1: 2, kind: 'TCP' }, // Solapa con CPU
        { pid: 1, t0: 6, t1: 7, kind: 'TFP' }  // No solapa
      ]
    };
    
    const gantt = GanttBuilder.build(trace);
    const p1Track = gantt.tracks.find(t => t.pid === '1');
    
    expect(p1Track).toBeDefined();
    
    // Verificar que no hay solapamientos temporales
    const segments = p1Track!.segments.sort((a, b) => a.start - b.start);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].start).toBeGreaterThanOrEqual(segments[i-1].end);
    }
  });

  it('debe construir períodos I/O correctamente emparejando C→B con B→L', () => {
    const trace: Trace = {
      events: [
        { pid: 1, t: 10, type: 'C→B' },
        { pid: 1, t: 15, type: 'B→L' },
        { pid: 2, t: 20, type: 'C→B' },
        { pid: 2, t: 25, type: 'B→L' }
      ],
      slices: [],
      overheads: []
    };
    
    const gantt = GanttBuilder.build(trace);
    
    const p1Track = gantt.tracks.find(t => t.pid === '1');
    const p2Track = gantt.tracks.find(t => t.pid === '2');
    
    expect(p1Track?.segments).toHaveLength(1);
    expect(p1Track?.segments[0]).toMatchObject({ start: 10, end: 15, type: 'io' });
    
    expect(p2Track?.segments).toHaveLength(1);
    expect(p2Track?.segments[0]).toMatchObject({ start: 20, end: 25, type: 'io' });
  });

  it('debe descartar overheads malformados', () => {
    const validOverhead = { pid: 1, t0: 0, t1: 2, kind: 'TCP' as const };
    const invalidOverheads = [
      { pid: 1, t0: 5, t1: 3, kind: 'TCP' as const },    // Inválido: t1 < t0
      { pid: 1, t0: -1, t1: 1, kind: 'TCP' as const },   // Inválido: t0 negativo
      { pid: 1, t0: NaN, t1: 5, kind: 'TCP' as const },  // Inválido: NaN
    ];
    
    // Simular overhead con kind inválido usando Object.assign
    const invalidKindOverhead = Object.assign({}, validOverhead, { kind: 'INVALID' });
    
    const trace: Trace = {
      events: [],
      slices: [],
      overheads: [
        validOverhead,
        ...invalidOverheads,
        invalidKindOverhead as any
      ]
    };
    
    const gantt = GanttBuilder.build(trace);
    const p1Track = gantt.tracks.find(t => t.pid === '1');
    
    expect(p1Track?.segments).toHaveLength(1); // Solo el válido
    expect(p1Track?.segments[0]).toMatchObject({ start: 0, end: 2, type: 'tcp' });
  });

  it('debe priorizar CPU sobre overheads en caso de solapamiento', () => {
    const trace: Trace = {
      events: [],
      slices: [
        { pid: 1, start: 0, end: 10 } // CPU
      ],
      overheads: [
        { pid: 1, t0: 5, t1: 8, kind: 'TCP' } // Solapa con CPU en 5-8
      ]
    };
    
    const gantt = GanttBuilder.build(trace);
    const p1Track = gantt.tracks.find(t => t.pid === '1');
    
    expect(p1Track).toBeDefined();
    
    // CPU debe permanecer intacto, overhead debe ser truncado o eliminado
    const cpuSegs = p1Track!.segments.filter(s => s.type === 'cpu');
    expect(cpuSegs).toHaveLength(1);
    expect(cpuSegs[0]).toMatchObject({ start: 0, end: 10 });
    
    // Verificar que no hay solapamientos
    const segments = p1Track!.segments.sort((a, b) => a.start - b.start);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].start).toBeGreaterThanOrEqual(segments[i-1].end);
    }
  });

  it('debe detectar huecos correctamente', () => {
    const segments: GanttSeg[] = [
      { start: 0, end: 2, type: 'cpu' },
      { start: 5, end: 8, type: 'cpu' }, // Gap 2-5
      { start: 8, end: 10, type: 'tcp' } // Adyacente, no gap
    ];
    
    const huecos = GanttBuilder.detectarHuecos({ pid: '1', segments });
    
    expect(huecos).toHaveLength(1);
    expect(huecos[0]).toMatchObject({ start: 2, end: 5 });
  });

  it('debe manejar traces vacíos sin fallar', () => {
    const trace: Trace = {
      events: [],
      slices: [],
      overheads: []
    };
    
    const gantt = GanttBuilder.build(trace);
    
    expect(gantt.tracks).toHaveLength(0);
    expect(gantt.tMin).toBe(0);
    expect(gantt.tMax).toBe(0);
  });

  it('debe mantener orden temporal correcto después de fusiones', () => {
    const trace: Trace = {
      events: [],
      slices: [
        { pid: 1, start: 10, end: 12 },
        { pid: 1, start: 0, end: 2 },   // Desordenado intencionalmente
        { pid: 1, start: 2, end: 4 },   // Adyacente al anterior
        { pid: 1, start: 15, end: 18 }
      ],
      overheads: []
    };
    
    const gantt = GanttBuilder.build(trace);
    const p1Track = gantt.tracks.find(t => t.pid === '1');
    
    expect(p1Track?.segments).toHaveLength(3); // Fusionó 0-2 y 2-4
    
    // Verificar orden temporal
    const segments = p1Track!.segments;
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].start).toBeGreaterThanOrEqual(segments[i-1].end);
    }
    
    expect(segments[0]).toMatchObject({ start: 0, end: 4 }); // Fusionado
    expect(segments[1]).toMatchObject({ start: 10, end: 12 });
    expect(segments[2]).toMatchObject({ start: 15, end: 18 });
  });
});
