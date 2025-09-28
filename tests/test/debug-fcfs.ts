// Simple test to check if FCFS works
import { runFCFSSandbox } from '../../src/lib/engine/engine';
import type { Proceso } from '../../src/lib/model/proceso';

console.log('    Testing FCFS first...');

const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [5], estado: 'N' },
  { pid: 2, arribo: 0, rafagasCPU: [5], estado: 'N' }
];

try {
  console.log('Calling runFCFSSandbox...');
  const trace = runFCFSSandbox(procesos, {
    TIP: 0,
    TCP: 0, 
    TFP: 0,
    bloqueoES: 0
  });
  
  console.log(' FCFS completed');
  console.log('Slices:');
  trace.slices.forEach(slice => 
    console.log(`P${slice.pid}:${slice.start}–${slice.end}`));
    
} catch (error) {
  console.error('❌ FCFS Error:', error);
}
