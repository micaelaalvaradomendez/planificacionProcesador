// tests/debug-three-processes.ts
import { runSRTN } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

console.log('=== TEST TRES PROCESOS P1, P2 y P3 ===');

// P1, P2 y P3 para ver si P3 (ráfaga corta) causa el problema
const tresProcesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 12], rafagasES: [20], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [12, 8], rafagasES: [25], estado: 'N' },
  { pid: 3, arribo: 3, rafagasCPU: [3, 5], rafagasES: [15], estado: 'N' }
];

const trace = runSRTN(tresProcesos, { TIP: 1, TCP: 1, TFP: 1 });

console.log('\nEventos relevantes:');
trace.events.forEach(e => {
  const dataStr = e.data ? ` (${JSON.stringify(e.data)})` : '';
  console.log(`  t=${e.t}: ${e.type} P${e.pid}${dataStr}`);
});

console.log('\nSlices por proceso:');
for (const pid of [1, 2, 3]) {
  const slices = trace.slices.filter(s => s.pid === pid);
  const totalCPU = slices.reduce((sum, s) => sum + (s.end - s.start), 0);
  const proceso = tresProcesos.find(p => p.pid === pid);
  const expectedCPU = proceso?.rafagasCPU.reduce((sum, r) => sum + r, 0) ?? 0;
  
  console.log(`\nP${pid}:`);
  slices.forEach((s, i) => console.log(`  Slice ${i+1}: [${s.start}, ${s.end}) = ${s.end - s.start} ticks`));
  console.log(`  Total: ${totalCPU} (esperado: ${expectedCPU}) diff: ${totalCPU - expectedCPU}`);
  
  if (totalCPU !== expectedCPU) {
    console.log(`  ❌ P${pid} tiene contabilidad incorrecta`);
  } else {
    console.log(`  ✅ P${pid} correcto`);
  }
}

// Contar preempciones
const preemptions = trace.events.filter(e => e.type === 'C→L');
console.log(`\nPreempciones totales: ${preemptions.length}`);
preemptions.forEach(e => console.log(`  P${e.pid} @ t=${e.t} (${e.data?.reason})`));