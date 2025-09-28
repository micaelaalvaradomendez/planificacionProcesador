import { describe, it, expect } from 'vitest';
import { GanttBuilder } from '$lib/gantt/builder';
import { normalizeTrace } from '../../_helpers/compare';

describe('gantt/GanttBuilder', () => {
  it('construye modelo gantt básico con CPU slices', () => {
    const trace = normalizeTrace({
      events: [],
      slices: [
        { pid: 1, start: 0, end: 3 }, 
        { pid: 2, start: 3, end: 5 }
      ],
      overheads: []
    });
    
    const gantt = GanttBuilder.build(trace);
    
    expect(gantt.tracks).toHaveLength(2);
    expect(gantt.tMin).toBe(0);
    expect(gantt.tMax).toBe(5);
    
    const track1 = gantt.tracks.find(t => t.pid === '1');
    const track2 = gantt.tracks.find(t => t.pid === '2');
    
    expect(track1?.segments).toHaveLength(1);
    expect(track1?.segments[0]).toEqual({ start: 0, end: 3, type: 'cpu' });
    
    expect(track2?.segments).toHaveLength(1);
    expect(track2?.segments[0]).toEqual({ start: 3, end: 5, type: 'cpu' });
  });

  it('incluye overheads en el gantt cuando están presentes', () => {
    const trace = normalizeTrace({
      events: [],
      slices: [{ pid: 1, start: 2, end: 5 }],
      overheads: [
        { pid: 1, t0: 0, t1: 2, kind: 'TIP' },
        { pid: 1, t0: 5, t1: 7, kind: 'TFP' }
      ]
    });
    
    const gantt = GanttBuilder.build(trace);
    const track1 = gantt.tracks.find(t => t.pid === '1');
    
    expect(track1?.segments).toHaveLength(3);
    
    // Debe incluir CPU slice + overheads
    const segments = track1?.segments.sort((a, b) => a.start - b.start);
    expect(segments?.[0]).toEqual({ start: 0, end: 2, type: 'tip' });
    expect(segments?.[1]).toEqual({ start: 2, end: 5, type: 'cpu' });
    expect(segments?.[2]).toEqual({ start: 5, end: 7, type: 'tfp' });
  });

  it('maneja traces vacíos sin errores', () => {
    const trace = normalizeTrace({
      events: [],
      slices: [],
      overheads: []
    });
    
    const gantt = GanttBuilder.build(trace);
    
    expect(gantt.tracks).toHaveLength(0);
    expect(gantt.tMin).toBe(0);
    expect(gantt.tMax).toBe(0);
  });
});