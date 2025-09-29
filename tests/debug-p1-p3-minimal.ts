// tests/debug-p1-p3-minimal.ts
import { runSRTN } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

// Caso mínimo: P1 vs P3 (P3 tiene ráfaga más corta)
const procesosMinimal: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 12], rafagasES: [20], estado: 'N' },
  { pid: 3, arribo: 3, rafagasCPU: [3, 5], rafagasES: [15], estado: 'N' }
];

console.log('=== DEBUG MÍNIMO P1 vs P3 ===');
const trace = runSRTN(procesosMinimal, { TIP: 1, TCP: 1, TFP: 1 });

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

console.log('\n=== TEORÍA ESPERADA ===');
console.log('t=0: P1 arriba');
console.log('t=1: P1 N→L, L→C (slice debería iniciar en t=2)');
console.log('t=4: P3 N→L (3+1), restante P3=3 < P1=15 → PREEMPT P1');
console.log('t=4: P3 L→C (slice debería iniciar en t=5)');
console.log('t=8: P3 debería completar su primera ráfaga (3 ticks)');
console.log('Esperado: P1 slice [2,4) = 2 ticks, P3 slice [5,8) = 3 ticks');