import { describe, it, expect } from 'vitest';
import { runFCFS } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

describe('Test del Fix de pendingDispatchAt', () => {
  
  it('debe verificar que el fix permita dispatch en mismo tiempo', () => {
    const procesos: Proceso[] = [
      { pid: 1, arribo: 0, rafagasCPU: [], estado: 'N' },
      { pid: 2, arribo: 0, rafagasCPU: [2], estado: 'N' }
    ];
    
    console.log('=== ANTES DEL FIX ===');
    console.log('El problema: P2 no ejecuta porque pendingDispatchAt=0 bloquea el dispatch');
    
    const trace = runFCFS(procesos);
    
    console.log('\nEventos generados:');
    trace.events.forEach((e: any) => {
      console.log(`t=${e.t}: ${e.type} pid=${e.pid}`);
    });
    
    console.log('\nSlices generados:');
    trace.slices.forEach((s: any) => {
      console.log(`pid=${s.pid}, start=${s.start}, end=${s.end}, duration=${s.end - s.start}`);
    });
    
    // Verificar si P2 ejecuta
    const tieneDispatchP2 = trace.events.some((e: any) => e.type === 'L→C' && e.pid === 2);
    const tieneTerminoP2 = trace.events.some((e: any) => e.type === 'C→T' && e.pid === 2);
    const slicesP2 = trace.slices.filter((s: any) => s.pid === 2).length;
    
    console.log(`\n📊 RESULTADO DEL TEST:`);
    console.log(`- P2 dispatch (L→C): ${tieneDispatchP2 ? '✅' : '❌'}`);
    console.log(`- P2 terminación (C→T): ${tieneTerminoP2 ? '✅' : '❌'}`);
    console.log(`- P2 slices: ${slicesP2}`);
    
    if (tieneDispatchP2 && tieneTerminoP2 && slicesP2 > 0) {
      console.log('\n🎉 ¡FIX EXITOSO! P2 ahora ejecuta correctamente');
    } else {
      console.log('\n❌ El fix aún no funciona');
    }
    
    // Test automático
    expect(tieneDispatchP2).toBe(true);
    expect(tieneTerminoP2).toBe(true);
    expect(slicesP2).toBeGreaterThan(0);
  });
});
