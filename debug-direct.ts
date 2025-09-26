import { runRR } from './src/lib/engine/engine';
import type { Proceso } from './src/lib/model/proceso';

const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [5], estado: 'N' },
  { pid: 2, arribo: 0, rafagasCPU: [5], estado: 'N' }
];

console.log('🔄 RR Debug - Looking for C→T@5 bug');

const trace = runRR(procesos, { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 0 }, 2);

console.log('\n📋 Slices:');
trace.slices.forEach(slice => console.log(`P${slice.pid}:${slice.start}–${slice.end}`));

console.log('\n📋 Events (first 15):');
trace.events.slice(0, 15).forEach(e => console.log(`${e.t}: ${e.type}(${e.pid})`));
