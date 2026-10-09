import { describe, it, expect } from 'vitest';
import { runFCFS } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

describe('Investigación Real del Bug - Arrays Vacíos', () => {
  
  it('debe investigar qué pasa realmente con arrays de ráfagas vacíos', () => {
    const procesos: Proceso[] = [
      { pid: 1, arribo: 0, rafagasCPU: [], estado: 'N' },
      { pid: 2, arribo: 0, rafagasCPU: [2], estado: 'N' }
    ];
    
    console.log('=== INVESTIGANDO COMPORTAMIENTO REAL ===');
    console.log('Procesos input:', JSON.stringify(procesos, null, 2));
    
    const trace = runFCFS(procesos);
    
    console.log('=== RESULTADOS DEL TRACE ===');
    console.log('Total eventos:', trace.events.length);
    console.log('Total slices:', trace.slices.length);
    
    console.log('\n=== EVENTOS GENERADOS ===');
    trace.events.forEach((e: any, i) => {
      console.log(`[${i}] t=${e.t}, type=${e.type}, pid=${e.pid}`);
    });
    
    console.log('\n=== SLICES GENERADOS ===');
    trace.slices.forEach((s: any, i) => {
      console.log(`[${i}] pid=${s.pid}, start=${s.start}, end=${s.end}, duration=${s.end - s.start}`);
    });
    
    // Análisis específico por proceso
    const slicesP1 = trace.slices.filter((s: any) => s.pid === 1);
    const slicesP2 = trace.slices.filter((s: any) => s.pid === 2);
    const eventosP1 = trace.events.filter((e: any) => e.pid === 1);
    const eventosP2 = trace.events.filter((e: any) => e.pid === 2);
    
    console.log('\n=== ANÁLISIS POR PROCESO ===');
    console.log(`P1 (rafagasCPU=[]): ${slicesP1.length} slices, ${eventosP1.length} eventos`);
    console.log(`P2 (rafagasCPU=[2]): ${slicesP2.length} slices, ${eventosP2.length} eventos`);
    
    // Verificar si P1 genera algún evento de terminación
    const terminoP1 = trace.events.some((e: any) => e.type === 'C→T' && e.pid === 1);
    const terminoP2 = trace.events.some((e: any) => e.type === 'C→T' && e.pid === 2);
    
    console.log(`P1 terminó: ${terminoP1}`);
    console.log(`P2 terminó: ${terminoP2}`);
    
    // P2 debe ejecutar y terminar normalmente a pesar de que P1 tenga ráfagas vacías
    expect(slicesP2.length).toBeGreaterThan(0);
    expect(terminoP2).toBe(true);
  });
  
  it('debe comparar con un caso de control (sin procesos con arrays vacíos)', () => {
    const procesosControl: Proceso[] = [
      { pid: 2, arribo: 0, rafagasCPU: [2], estado: 'N' }
    ];
    
    console.log('\n=== CASO DE CONTROL (sin arrays vacíos) ===');
    const traceControl = runFCFS(procesosControl);
    
    console.log('Eventos control:', traceControl.events.length);
    console.log('Slices control:', traceControl.slices.length);
    
    const slicesP2Control = traceControl.slices.filter((s: any) => s.pid === 2);
    console.log(`P2 en control: ${slicesP2Control.length} slices`);
    
    // Este DEBE generar slices para P2
    expect(slicesP2Control.length).toBeGreaterThan(0);
  });
});
