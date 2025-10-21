import { describe, it, expect } from 'vitest';
import { runFCFS } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

describe('Debug Orden de Eventos', () => {
  
  it('debe mostrar el orden exacto de procesamiento de eventos en tiempo 0', () => {
    const procesos: Proceso[] = [
      { pid: 1, arribo: 0, rafagasCPU: [], estado: 'N' },
      { pid: 2, arribo: 0, rafagasCPU: [2], estado: 'N' }
    ];
    
    console.log('=== ANÁLISIS DE ORDEN DE EVENTOS ===');
    
    // Lo que esperaríamos en el orden correcto:
    console.log('\n📝 SECUENCIA ESPERADA EN TIEMPO 0:');
    console.log('1. N→L pid=1 (admitir P1)');
    console.log('2. N→L pid=2 (admitir P2)');
    console.log('3. L→C pid=1 (despachar P1)');
    console.log('4. C→T pid=1 (P1 termina inmediatamente)');
    console.log('5. L→C pid=2 (despachar P2 después de que termine P1)');
    console.log('6. (programar CPU_DONE para P2 en tiempo 2)');
    
    const trace = runFCFS(procesos);
    
    console.log('\n🔍 SECUENCIA REAL:');
    trace.events.forEach((e: any, i: number) => {
      console.log(`${i+1}. ${e.type} pid=${e.pid} t=${e.t}`);
    });
    
    // Análisis de la cola de eventos programados (esto tendríamos que inferirlo)
    console.log('\n⚙️ HIPÓTESIS SOBRE LA COLA DE EVENTOS:');
    console.log('Momento 0 - Eventos programados probablemente incluyen:');
    console.log('- ADMIT pid=1 t=0');
    console.log('- ADMIT pid=2 t=0');  
    console.log('- DISPATCH pid=1 t=0 (por despacharSiLibre tras ADMIT)');
    console.log('- CPU_DONE pid=1 t=0 (porque ráfaga es duración 0)');
    console.log('- DISPATCH pid=2 t=? (debería programarse tras CPU_DONE de P1)');
    console.log('- CPU_DONE pid=2 t=2 (tras dispatch de P2)');
    
    // Verificar específicamente lo que falta
    const eventosT0 = trace.events.filter((e: any) => e.t === 0);
    const eventosT2 = trace.events.filter((e: any) => e.t === 2);
    
    console.log('\n📊 EVENTOS POR TIEMPO:');
    console.log(`Tiempo 0: ${eventosT0.length} eventos`);
    eventosT0.forEach((e: any) => console.log(`  - ${e.type} pid=${e.pid}`));
    
    console.log(`Tiempo 2: ${eventosT2.length} eventos`);
    eventosT2.forEach((e: any) => console.log(`  - ${e.type} pid=${e.pid}`));
    
    // El problema clave
    const tieneDispatchP2 = trace.events.some((e: any) => e.type === 'L→C' && e.pid === 2);
    console.log(`\n❗ PROBLEMA IDENTIFICADO:`);
    console.log(`P2 nunca recibe DISPATCH (L→C): ${tieneDispatchP2 ? 'SÍ' : 'NO'}`);
    
    if (!tieneDispatchP2) {
      console.log('\n🔧 POSIBLES CAUSAS:');
      console.log('1. despacharSiLibre(0) tras CPU_DONE de P1 no encuentra P2 en ready');
      console.log('2. scheduler.next() no retorna P2 cuando debería');
      console.log('3. P2 no está siendo agregado correctamente a la ready queue');
      console.log('4. Hay alguna condición que impide el dispatch de P2');
    }
  });
  
  it('debe probar si el problema es el timing simultáneo', () => {
    // Test con arrivals diferentes para evitar timing 0
    const procesosEscalonados: Proceso[] = [
      { pid: 1, arribo: 0, rafagasCPU: [], estado: 'N' },
      { pid: 2, arribo: 1, rafagasCPU: [2], estado: 'N' }  // P2 llega en t=1
    ];
    
    console.log('\n=== TEST CON ARRIVALS ESCALONADOS ===');
    console.log('P1: arribo=0, rafagasCPU=[]');
    console.log('P2: arribo=1, rafagasCPU=[2]');
    
    const trace = runFCFS(procesosEscalonados);
    
    console.log('\nEventos generados:');
    trace.events.forEach((e: any) => {
      console.log(`t=${e.t}: ${e.type} pid=${e.pid}`);
    });
    
    const tieneDispatchP2 = trace.events.some((e: any) => e.type === 'L→C' && e.pid === 2);
    console.log(`\nP2 recibe dispatch: ${tieneDispatchP2 ? '✅' : '❌'}`);
    
    if (tieneDispatchP2) {
      console.log('✅ Con arrivals diferentes, P2 SÍ ejecuta');
      console.log('🎯 Confirmación: El problema ES el timing simultáneo en t=0');
    }
  });
});
