import { runRR } from '../engine/engine';
import type { Proceso } from '../model/proceso';

// Patch runRR with debug
const originalRunRR = runRR;

console.log('🔄 Starting RR Debug Test');

const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [5], estado: 'N' },
  { pid: 2, arribo: 0, rafagasCPU: [5], estado: 'N' }
];

// Let's manually check the function to see if there's infinite loop
let iterations = 0;
const maxIterations = 50;

// We need to examine the source more carefully - let's check if it's a compilation issue
console.log('Checking types...');
const trace = {
  slices: [],
  events: []
};

console.log('Trace object created successfully');

// Try a very simple call
try {
  console.log('Attempting runRR call...');
  
  // Let's create a minimal test case first
  const result = originalRunRR(procesos, { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 0 }, 2);
  
  console.log('✅ Function completed');
  console.log('Result type:', typeof result);
  console.log('Slices count:', result?.slices?.length || 0);
  
} catch (error) {
  console.error('❌ Error calling runRR:', error);
  console.error('Stack trace:', error.stack);
}
