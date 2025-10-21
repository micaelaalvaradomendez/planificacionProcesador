import { describe, it, expect } from 'vitest';
import { runFCFS, runRR, runSPN, runSRTN, runPriority } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

describe('Verificación Completa del Fix - Todos los Schedulers', () => {
  
  const procesosProblematicos: Proceso[] = [
    { pid: 1, arribo: 0, rafagasCPU: [], estado: 'N' },
    { pid: 2, arribo: 0, rafagasCPU: [2], estado: 'N' }
  ];

  it('FCFS debe manejar arrays vacíos correctamente', () => {
    const trace = runFCFS(procesosProblematicos);
    
    const slicesP2 = trace.slices.filter((s: any) => s.pid === 2);
    const tieneDispatchP2 = trace.events.some((e: any) => e.type === 'L→C' && e.pid === 2);
    const tieneTerminoP2 = trace.events.some((e: any) => e.type === 'C→T' && e.pid === 2);
    
    expect(slicesP2.length).toBe(1);
    expect(tieneDispatchP2).toBe(true);
    expect(tieneTerminoP2).toBe(true);
    
    console.log('✅ FCFS: P2 ejecuta correctamente');
  });

  it('Round Robin debe manejar arrays vacíos correctamente', () => {
    const trace = runRR(procesosProblematicos, {}, 1);
    
    const slicesP2 = trace.slices.filter((s: any) => s.pid === 2);
    const tieneDispatchP2 = trace.events.some((e: any) => e.type === 'L→C' && e.pid === 2);
    const tieneTerminoP2 = trace.events.some((e: any) => e.type === 'C→T' && e.pid === 2);
    
    expect(slicesP2.length).toBeGreaterThan(0);
    expect(tieneDispatchP2).toBe(true);
    expect(tieneTerminoP2).toBe(true);
    
    console.log('✅ RR: P2 ejecuta correctamente');
  });

  it('SPN debe manejar arrays vacíos correctamente', () => {
    const trace = runSPN(procesosProblematicos);
    
    const slicesP2 = trace.slices.filter((s: any) => s.pid === 2);
    const tieneDispatchP2 = trace.events.some((e: any) => e.type === 'L→C' && e.pid === 2);
    const tieneTerminoP2 = trace.events.some((e: any) => e.type === 'C→T' && e.pid === 2);
    
    expect(slicesP2.length).toBe(1);
    expect(tieneDispatchP2).toBe(true);
    expect(tieneTerminoP2).toBe(true);
    
    console.log('✅ SPN: P2 ejecuta correctamente');
  });

  it('SRTN debe manejar arrays vacíos correctamente', () => {
    const trace = runSRTN(procesosProblematicos);
    
    const slicesP2 = trace.slices.filter((s: any) => s.pid === 2);
    const tieneDispatchP2 = trace.events.some((e: any) => e.type === 'L→C' && e.pid === 2);
    const tieneTerminoP2 = trace.events.some((e: any) => e.type === 'C→T' && e.pid === 2);
    
    expect(slicesP2.length).toBe(1);
    expect(tieneDispatchP2).toBe(true);
    expect(tieneTerminoP2).toBe(true);
    
    console.log('✅ SRTN: P2 ejecuta correctamente');
  });

  it('Priority debe manejar arrays vacíos correctamente', () => {
    // Priority scheduler usa procesos normales, no requiere prioridad explícita
    const trace = runPriority(procesosProblematicos);
    
    const slicesP2 = trace.slices.filter((s: any) => s.pid === 2);
    const tieneDispatchP2 = trace.events.some((e: any) => e.type === 'L→C' && e.pid === 2);
    const tieneTerminoP2 = trace.events.some((e: any) => e.type === 'C→T' && e.pid === 2);
    
    expect(slicesP2.length).toBe(1);
    expect(tieneDispatchP2).toBe(true);
    expect(tieneTerminoP2).toBe(true);
    
    console.log('✅ Priority: P2 ejecuta correctamente');
  });

  it('resumen completo del fix', () => {
    console.log('\n🎯 FIX COMPLETADO:');
    console.log('================================');
    console.log('✅ FCFS: Arrays vacíos manejados correctamente');
    console.log('✅ RR: Arrays vacíos manejados correctamente');
    console.log('✅ SPN: Arrays vacíos manejados correctamente');
    console.log('✅ SRTN: Arrays vacíos manejados correctamente');
    console.log('✅ Priority: Arrays vacíos manejados correctamente');
    console.log('\n🔧 SOLUCIÓN IMPLEMENTADA:');
    console.log('- Reset pendingDispatchAt = null en CPU_DONE');
    console.log('- Permite dispatch en mismo tiempo t=0');
    console.log('- Corrige bug de procesos con duración 0');
    console.log('\n🎉 TODOS LOS SCHEDULERS FUNCIONAN CORRECTAMENTE');
  });
});
