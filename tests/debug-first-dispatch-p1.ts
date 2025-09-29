// tests/debug-first-dispatch-p1.ts
import { runSRTN } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 12], rafagasES: [20], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [12, 8], rafagasES: [25], estado: 'N' },
  { pid: 3, arribo: 3, rafagasCPU: [3, 5], rafagasES: [15], estado: 'N' }
];

console.log('=== DEBUG PRIMER DESPACHO P1 ===');
const trace = runSRTN(procesos, { TIP: 1, TCP: 1, TFP: 1 });

console.log('Eventos P1 al inicio (t <= 10):');
trace.events.filter(e => e.pid === 1 && e.t <= 10)
  .forEach(e => console.log(`  ${e.type} @ t=${e.t} ${JSON.stringify(e.data || {})}`));

console.log('\nTODOS los eventos P1:');
trace.events.filter(e => e.pid === 1)
  .forEach(e => console.log(`  ${e.type} @ t=${e.t} ${JSON.stringify(e.data || {})}`));

console.log('\nSlices P1:');
const p1Slices = trace.slices.filter(s => s.pid === 1);
p1Slices.forEach((slice, i) => {
  console.log(`  ${i+1}. [${slice.start}, ${slice.end}) = ${slice.end - slice.start} ticks`);
});

console.log(`\nP1 total CPU: ${p1Slices.reduce((sum, s) => sum + (s.end - s.start), 0)}`);
console.log('P1 esperado: 27 ticks');

// Buscar el problema del TCP alignment
const p1Dispatches = trace.events.filter(e => e.pid === 1 && e.type === 'L→C');
console.log('\nAnalisis TCP alignment P1:');
p1Dispatches.forEach((dispatch, i) => {
  const nextSlice = p1Slices[i];
  if (nextSlice) {
    const expectedStart = dispatch.t + 1; // TCP = 1
    const actualStart = nextSlice.start;
    const match = expectedStart === actualStart ? '✅' : '❌';
    console.log(`  L→C @ t=${dispatch.t} → slice [${actualStart}, ${nextSlice.end}), esperado start=${expectedStart} ${match}`);
  } else {
    console.log(`  L→C @ t=${dispatch.t} → NO HAY SLICE CORRESPONDIENTE ❌`);
  }
});