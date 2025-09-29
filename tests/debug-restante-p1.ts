// tests/debug-restante-p1.ts  
import { runSRTN } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 12], rafagasES: [20], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [12, 8], rafagasES: [25], estado: 'N' },
  { pid: 3, arribo: 3, rafagasCPU: [3, 5], rafagasES: [15], estado: 'N' },
  { pid: 4, arribo: 4, rafagasCPU: [6, 2], rafagasES: [30], estado: 'N' },
  { pid: 5, arribo: 6, rafagasCPU: [1, 4], rafagasES: [10], estado: 'N' }
];

console.log('=== TRACKING P1 RESTANTE VALUES ===');

// Simular manualmente los cálculos
console.log('\nSimulación manual del tiempo restante de P1:');
console.log('Inicial: 15 ticks');

let restante = 15;

console.log('\n1. P1 L→C @ t=1, slice [2,4):');
const tick1 = 4 - 2; // ejecutó 2 ticks
restante -= tick1;
console.log(`   Ejecutó ${tick1} ticks, restante = ${restante}`);

console.log('\n2. P1 L→C @ t=42, slice [43,47):');
const tick2 = 47 - 43; // ejecutó 4 ticks  
restante -= tick2;
console.log(`   Ejecutó ${tick2} ticks, restante = ${restante}`);

console.log('\n3. P1 L→C @ t=50, slice [51,56):');
const tick3 = 56 - 51; // ejecutó 5 ticks
console.log(`   PROBLEMA: Ejecutó ${tick3} ticks, pero debería ejecutar solo ${restante} ticks`);
console.log(`   El slice debería ser [51, ${51 + restante}) = [51, 55)`);

console.log('\n=== CONCLUSIÓN ===');
console.log('El problema está en que el slice [51,56) ejecuta 5 ticks');
console.log('cuando r.restante debería ser 9 ticks al programar CPU_DONE');
console.log('Esto sugiere que la actualización de r.restante no se está haciendo correctamente');
console.log('durante las preempciones, O que hay un bug en tryPreemptIfNeeded');

// Ejecutar la simulación real para comparar
console.log('\n=== SIMULACIÓN REAL ===');
const trace = runSRTN(procesos, { TIP: 1, TCP: 1, TFP: 1 });

const p1Preemptions = trace.events.filter(e => e.pid === 1 && e.type === 'C→L');
console.log('\nPreempciones de P1:');
p1Preemptions.forEach((e, i) => {
  console.log(`  ${i+1}. C→L @ t=${e.t} (${e.data?.reason})`);
});

const p1Slices = trace.slices.filter(s => s.pid === 1);
console.log('\nSlices de P1:');
p1Slices.forEach((slice, i) => {
  const duration = slice.end - slice.start;
  console.log(`  ${i+1}. [${slice.start}, ${slice.end}) = ${duration} ticks`);
});