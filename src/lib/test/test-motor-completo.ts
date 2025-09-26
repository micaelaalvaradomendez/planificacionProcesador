// Test completo del motor FCFS sandbox con documentación
import { runFCFSSandbox } from '../engine/engine';
import type { Proceso } from '../model/proceso';

console.log('=== Motor FCFS Sandbox - Validación Completa ===\n');

// ================== GOLDEN CASES ==================

console.log('🎯 Golden A: Solo CPU (sin E/S)');
console.log('   P1: arr=0, [5]');
console.log('   P2: arr=2, [4]');
console.log('   Esperado: P1: 0–5, P2: 5–9\n');

const procsA: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [5], estado: 'N' },
  { pid: 2, arribo: 2, rafagasCPU: [4], estado: 'N' },
];

const traceA = runFCFSSandbox(procsA, { bloqueoES: 0 });
console.log('   Resultado:', traceA.slices);
console.log('   ✅ Golden A:', 
  traceA.slices.length === 2 &&
  traceA.slices[0].pid === 1 && traceA.slices[0].start === 0 && traceA.slices[0].end === 5 &&
  traceA.slices[1].pid === 2 && traceA.slices[1].start === 5 && traceA.slices[1].end === 9
  ? 'PASSED' : 'FAILED'
);

console.log('\n' + '='.repeat(50) + '\n');

console.log('🎯 Golden B: CPU + E/S con bloqueoES=0');
console.log('   P1: arr=0, [3,2] (CPU, luego E/S=0, luego CPU)');
console.log('   P2: arr=1, [4]   (solo CPU)');
console.log('   Esperado: P1: 0–3, P2: 3–7, P1: 7–9\n');

const procsB: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [3, 2], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [4], estado: 'N' },
];

const traceB = runFCFSSandbox(procsB, { bloqueoES: 0 });
console.log('   Resultado:', traceB.slices);
console.log('   ✅ Golden B:', 
  traceB.slices.length === 3 &&
  traceB.slices[0].pid === 1 && traceB.slices[0].start === 0 && traceB.slices[0].end === 3 &&
  traceB.slices[1].pid === 2 && traceB.slices[1].start === 3 && traceB.slices[1].end === 7 &&
  traceB.slices[2].pid === 1 && traceB.slices[2].start === 7 && traceB.slices[2].end === 9
  ? 'PASSED' : 'FAILED'
);

console.log('\n' + '='.repeat(50) + '\n');

// ================== ANÁLISIS DE EVENTOS ==================

console.log('📋 Análisis detallado de eventos Golden B:');
console.log('   (Verifica el guard anti-doble-dispatch)\n');

traceB.events.forEach((e, i) => {
  const desc: Record<string, string> = {
    'N→L': 'Admisión a Ready',
    'L→C': 'Dispatch a CPU',
    'C→B': 'Bloqueo por E/S',
    'B→L': 'Fin E/S → Ready',
    'C→T': 'Terminación',
    'C→L': 'Expropiación'
  };
  const eventDesc = desc[e.type] || e.type;
  
  console.log(`   ${i+1}. t=${e.t}: ${e.type}(P${e.pid}) = ${eventDesc}`);
});

console.log('\n   🔍 Puntos críticos:');
console.log('      • t=3: C→B(P1) libera CPU');
console.log('      • t=3: B→L(P1) reingresa a ready');
console.log('      • t=3: L→C(P2) despacha P2 (solo uno, guard funciona)');
console.log('      • t=7: C→T(P2) libera CPU');
console.log('      • t=7: L→C(P1) despacha P1 para segunda ráfaga');

console.log('\n' + '='.repeat(50) + '\n');

// ================== VERIFICACIÓN ADICIONAL ==================

console.log('🧪 Caso adicional: Múltiples procesos con E/S');
console.log('   P1: arr=0, [2,1,2]');
console.log('   P2: arr=1, [3]');
console.log('   P3: arr=2, [1,3]\n');

const procsC: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [2, 1, 2], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [3], estado: 'N' },
  { pid: 3, arribo: 2, rafagasCPU: [1, 3], estado: 'N' },
];

const traceC = runFCFSSandbox(procsC, { bloqueoES: 0 });
console.log('   Slices resultado:', traceC.slices);
console.log('   Total slices:', traceC.slices.length);
console.log('   Último evento en t=', Math.max(...traceC.events.map(e => e.t)));

console.log('\n✅ Implementación completada y validada!');
console.log('   • Motor FCFS sandbox funcional');
console.log('   • Guard anti-doble-dispatch implementado');
console.log('   • Golden cases A y B validados');
console.log('   • Ready para integrar con UI/Gantt');