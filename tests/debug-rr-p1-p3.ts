// tests/debug-rr-p1-p3.ts
import { runRR } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

// Caso mínimo: P1 vs P3 en RR
const procesosMinimal: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 12], rafagasES: [20], estado: 'N' },
  { pid: 3, arribo: 3, rafagasCPU: [3, 5], rafagasES: [15], estado: 'N' }
];

console.log('=== DEBUG RR MÍNIMO P1 vs P3 ===');
const trace = runRR(procesosMinimal, { TIP: 1, TCP: 1, TFP: 1 }, 6);

console.log('\nTodos los eventos:');
trace.events.forEach(e => {
  const dataStr = e.data ? ` ${JSON.stringify(e.data)}` : '';
  console.log(`  t=${e.t}: ${e.type} P${e.pid}${dataStr}`);
});

console.log('\nTodos los slices:');
trace.slices.forEach(s => {
  console.log(`  P${s.pid}: [${s.start}, ${s.end}) = ${s.end - s.start} ticks`);
});

console.log('\nAnálisis por proceso:');
for (const pid of [1, 3]) {
  const slices = trace.slices.filter(s => s.pid === pid);
  const totalCPU = slices.reduce((sum, s) => sum + (s.end - s.start), 0);
  const proceso = procesosMinimal.find(p => p.pid === pid);
  const expectedCPU = proceso?.rafagasCPU.reduce((sum, r) => sum + r, 0) ?? 0;
  
  console.log(`\nP${pid}:`);
  console.log(`  CPU ejecutado: ${totalCPU}`);
  console.log(`  CPU esperado: ${expectedCPU}`);
  console.log(`  Status: ${totalCPU === expectedCPU ? '✅' : '❌'}`);
}

// Buscar eventos PREEMPT por quantum
const preemptions = trace.events.filter(e => e.type === 'C→L' && e.data?.reason === 'quantum');
console.log(`\nPreempciones por quantum: ${preemptions.length}`);
preemptions.forEach(e => console.log(`  P${e.pid} @ t=${e.t}`));