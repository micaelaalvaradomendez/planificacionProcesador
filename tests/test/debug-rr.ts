import { runRR } from '../../src/lib/engine/engine';
import type { Proceso } from '../../src/lib/model/proceso';

console.log('    RR Debug Test');

const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [5], estado: 'N' },
  { pid: 2, arribo: 0, rafagasCPU: [5], estado: 'N' }
];

try {
  const trace = runRR(procesos, {
    TIP: 0,
    TCP: 0,
    TFP: 0,
    bloqueoES: 0
  }, 2);

  console.log(' Execution completed');
  console.log('Slices:');
  trace.slices.forEach(slice => 
    console.log(`P${slice.pid}:${slice.start}–${slice.end}`));
  
  console.log('\nEvents:');
  trace.events.slice(0, 20).forEach(e => 
    console.log(`${e.t}: ${e.type}(${e.pid})`));

} catch (error) {
  console.error('❌ Error:', error);
}
