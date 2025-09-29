// tests/debug-single-process.ts
import { runSRTN } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

console.log('=== TEST PROCESO ÚNICO P1 ===');

// Solo P1 para aislar el problema
const procesoSolo: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 12], rafagasES: [20], estado: 'N' }
];

const trace = runSRTN(procesoSolo, { TIP: 1, TCP: 1, TFP: 1 });

console.log('\nEventos:');
trace.events.forEach(e => console.log(`  ${e.type} P${e.pid} @ t=${e.t}`));

console.log('\nSlices:');
trace.slices.forEach(s => console.log(`  P${s.pid}: [${s.start}, ${s.end}) = ${s.end - s.start} ticks`));

const totalCPU = trace.slices.reduce((sum, s) => sum + (s.end - s.start), 0);
const expectedCPU = 15 + 12; // suma de rafagasCPU

console.log(`\nTotal CPU ejecutado: ${totalCPU}`);
console.log(`Total CPU esperado: ${expectedCPU}`);
console.log(`Diferencia: ${totalCPU - expectedCPU}`);

if (totalCPU === expectedCPU) {
  console.log('✅ Proceso único funciona correctamente');
} else {
  console.log('❌ Proceso único tiene problemas');
}