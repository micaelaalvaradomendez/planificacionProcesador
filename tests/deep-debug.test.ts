import { describe, it, expect } from 'vitest';
import { runFCFS } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

describe('Debug Profundo - Flujo de Eventos', () => {
  
  it('debe rastrear el flujo completo de eventos para encontrar el bug', () => {
    const procesos: Proceso[] = [
      { pid: 1, arribo: 0, rafagasCPU: [], estado: 'N' },
      { pid: 2, arribo: 0, rafagasCPU: [2], estado: 'N' }
    ];
    
    console.log('=== ANÁLISIS PROFUNDO DEL FLUJO ===');
    const trace = runFCFS(procesos);
    
    // Mapear todos los eventos por timestamp
    const eventosPorTiempo = new Map();
    trace.events.forEach((e: any) => {
      if (!eventosPorTiempo.has(e.t)) {
        eventosPorTiempo.set(e.t, []);
      }
      eventosPorTiempo.get(e.t).push(e);
    });
    
    console.log('\n=== FLUJO TEMPORAL DE EVENTOS ===');
    const tiempos = Array.from(eventosPorTiempo.keys()).sort((a, b) => a - b);
    
    tiempos.forEach(t => {
      console.log(`\n⏰ TIEMPO ${t}:`);
      const eventos = eventosPorTiempo.get(t);
      eventos.forEach((e: any, i: number) => {
        console.log(`  [${i}] ${e.type} - PID ${e.pid}`);
      });
    });
    
    console.log('\n=== ANÁLISIS DE EXPECTATIVAS ===');
    console.log('Lo que DEBERÍA pasar:');
    console.log('t=0: N→L pid=1, N→L pid=2');
    console.log('t=0: L→C pid=1 (despacho de P1)');
    console.log('t=0: C→T pid=1 (termina instantáneamente)');
    console.log('t=0: L→C pid=2 (despacho de P2 después de que P1 termine)');
    console.log('t=2: C→T pid=2 (termina después de ejecutar 2 unidades)');
    
    // Verificar específicamente qué falta
    const tiposEventos = trace.events.map((e: any) => `${e.type}-${e.pid}`);
    console.log('\nEventos reales:', tiposEventos);
    
    const tieneDispatchP2 = trace.events.some((e: any) => e.type === 'L→C' && e.pid === 2);
    const tieneTerminoP2 = trace.events.some((e: any) => e.type === 'C→T' && e.pid === 2);
    
    console.log(`\n❌ DIAGNÓSTICO:`);
    console.log(`- P2 dispatch (L→C): ${tieneDispatchP2 ? '✅' : '❌ FALTA'}`);
    console.log(`- P2 terminación (C→T): ${tieneTerminoP2 ? '✅' : '❌ FALTA'}`);
    
    if (!tieneDispatchP2) {
      console.log('\n🔍 HIPÓTESIS: El problema está en despacharSiLibre() después de que P1 termina');
      console.log('   - P1 termina y llama despacharSiLibre(0)');
      console.log('   - Pero P2 no se despacha ¿Por qué?');
      console.log('   - Posibles causas:');
      console.log('     1. P2 no está en ready queue cuando debería');
      console.log('     2. despacharSiLibre() tiene bug');
      console.log('     3. next() de scheduler no retorna P2');
    }
  });
  
  it('debe verificar el estado de la ready queue en tiempo de despacho', () => {
    // Para esta prueba necesitaríamos instrumentar el scheduler
    // Pero podemos hacer una prueba indirecta
    
    const procesosControl1: Proceso[] = [
      { pid: 2, arribo: 0, rafagasCPU: [2], estado: 'N' }
    ];
    
    const procesosControl2: Proceso[] = [
      { pid: 1, arribo: 0, rafagasCPU: [1], estado: 'N' },  // P1 con duración 1 (no 0)
      { pid: 2, arribo: 0, rafagasCPU: [2], estado: 'N' }
    ];
    
    console.log('\n=== CONTROL 1: Solo P2 ===');
    const trace1 = runFCFS(procesosControl1);
    console.log('Eventos:', trace1.events.map((e: any) => `${e.type}-${e.pid}`));
    console.log('P2 ejecuta:', trace1.slices.length > 0 ? '✅' : '❌');
    
    console.log('\n=== CONTROL 2: P1 con duración 1, P2 con duración 2 ===');
    const trace2 = runFCFS(procesosControl2);
    console.log('Eventos:', trace2.events.map((e: any) => `${e.type}-${e.pid}`));
    const slicesP1 = trace2.slices.filter((s: any) => s.pid === 1);
    const slicesP2 = trace2.slices.filter((s: any) => s.pid === 2);
    console.log(`P1 slices: ${slicesP1.length}, P2 slices: ${slicesP2.length}`);
    
    if (slicesP2.length > 0) {
      console.log('✅ Cuando P1 tiene duración > 0, P2 SÍ ejecuta');
      console.log('🎯 CONFIRMADO: El bug es específico a ráfagas de duración 0');
    }
  });
});
