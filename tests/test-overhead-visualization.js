#!/usr/bin/env node

// Test rápido para verificar que los overheads se emiten correctamente
import { runRR } from '../src/lib/engine/engine.js';

const procesosTest = [
  {
    pid: 1,
    arribo: 0,
    rafagasCPU: [5, 3],
    rafagasES: [2] // E/S por proceso
  },
  {
    pid: 2,
    arribo: 1,
    rafagasCPU: [4],
    rafagasES: [] // sin E/S
  }
];

const costosTest = {
  TIP: 2,  // > 1, debería aparecer
  TCP: 1,  // = 1, no debería aparecer
  TFP: 3,  // > 1, debería aparecer
  quantum: 4,
  bloqueoES: 10 // fallback global
};

console.log('  Testing overhead emission in runRR...');
console.log('Procesos:', JSON.stringify(procesosTest, null, 2));
console.log('Costos:', costosTest);

try {
  const trace = runRR(procesosTest, costosTest);
  
  console.log('\n Trace results:');
  console.log('CPU slices:', trace.slices.length);
  console.log('Events:', trace.events.length);
  console.log('Overheads:', trace.overheads?.length || 0);
  
  if (trace.overheads && trace.overheads.length > 0) {
    console.log('\n⚡ Overhead slices found:');
    trace.overheads.forEach((oh, i) => {
      console.log(`  ${i+1}. P${oh.pid} ${oh.kind}: ${oh.t0}→${oh.t1} (dur=${oh.t1-oh.t0})`);
    });
  } else {
    console.log('\n⚠️  No overhead slices found (unexpected!)');
  }
  
  console.log('\n Test completed successfully');
  
} catch (error) {
  console.error('❌ Test failed:', error);
  console.error('Stack trace:', error.stack);
}