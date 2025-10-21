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
    
    // PREGUNTA CRÍTICA: ¿Debería P2 ejecutar normalmente aunque P1 tenga array vacío?
    // Respuesta esperada: SÍ, P2 debería ejecutar independientemente de P1
    
    // Si P2 no ejecuta, hay un BUG REAL en el simulador
    if (slicesP2.length === 0 && !terminoP2) {
      console.log('\n🚨 BUG DETECTADO: P2 no ejecutó cuando debería haber ejecutado normalmente');
      console.log('El simulador está fallando al procesar procesos válidos cuando hay procesos con arrays vacíos');
    } else if (slicesP2.length > 0) {
      console.log('\n✅ P2 ejecutó correctamente - el simulador maneja bien este caso');
    }
    
    // No hacer expect() aquí, solo investigar y reportar
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
