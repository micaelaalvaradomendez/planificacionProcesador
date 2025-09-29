// tests/test-srtn-preemption.ts
import { runSRTN } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 12], rafagasES: [20], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [12, 8], rafagasES: [25], estado: 'N' },
  { pid: 3, arribo: 3, rafagasCPU: [3, 5], rafagasES: [15], estado: 'N' },
  { pid: 4, arribo: 4, rafagasCPU: [6, 2], rafagasES: [30], estado: 'N' },
  { pid: 5, arribo: 6, rafagasCPU: [1, 4], rafagasES: [10], estado: 'N' }
];

console.log('=== TESTING SRTN PREEMPTION ===');
const trace = runSRTN(procesos, { TIP: 1, TCP: 1, TFP: 1 });

const preemptions = trace.events.filter(e => e.type === 'C→L');
const dispatches = trace.events.filter(e => e.type === 'L→C');

console.log('Preemptions (C→L):', preemptions.length);
console.log('Dispatches (L→C):', dispatches.length);

console.log('\nEventos de preemption:');
preemptions.forEach(e => console.log(`  P${e.pid} @ t=${e.t} reason=${e.data?.reason}`));

console.log('\nEventos de dispatch:');
dispatches.forEach(e => console.log(`  P${e.pid} @ t=${e.t}`));

// Verificar contabilidad de CPU
console.log('\nContabilidad de CPU:');
for (const proceso of procesos) {
  const slicesProceso = trace.slices.filter(s => s.pid === proceso.pid);
  const tiempoSlices = slicesProceso.reduce((sum, s) => sum + (s.end - s.start), 0);
  const tiempoRafagas = proceso.rafagasCPU.reduce((sum, r) => sum + r, 0);
  
  console.log(`P${proceso.pid}: slices=${tiempoSlices}, rafagas=${tiempoRafagas}, diff=${tiempoSlices - tiempoRafagas}`);
}