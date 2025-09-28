import { runRRClean } from '../engine/rr-clean';
import type { Proceso } from '../../src/lib/model/proceso';

console.log('    Testing Clean RR Implementation');

const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [5], estado: 'N' },
  { pid: 2, arribo: 0, rafagasCPU: [5], estado: 'N' }
];

try {
  const trace = runRRClean(procesos, {
    TIP: 0,
    TCP: 0,
    TFP: 0,
    bloqueoES: 0
  }, 2);

  console.log(' Execution completed');
  console.log('Expected: P1:0–2, P2:2–4, P1:4–6, P2:6–8, P1:8–9, P2:9–10');
  console.log('Got:');
  trace.slices.forEach(slice => 
    console.log(`P${slice.pid}:${slice.start}–${slice.end}`));
  
  console.log('\nFirst 15 events:');
  trace.events.slice(0, 15).forEach(e => 
    console.log(`${e.t}: ${e.type}(${e.pid})`));

} catch (error) {
  console.error('❌ Error:', error);
}
