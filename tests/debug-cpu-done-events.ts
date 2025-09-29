// tests/debug-cpu-done-events.ts
import { runSRTN } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 12], rafagasES: [20], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [12, 8], rafagasES: [25], estado: 'N' },
  { pid: 3, arribo: 3, rafagasCPU: [3, 5], rafagasES: [15], estado: 'N' },
  { pid: 4, arribo: 4, rafagasCPU: [6, 2], rafagasES: [30], estado: 'N' },
  { pid: 5, arribo: 6, rafagasCPU: [1, 4], rafagasES: [10], estado: 'N' }
];

console.log('=== DEBUG CPU_DONE EVENTS ===');
const trace = runSRTN(procesos, { TIP: 1, TCP: 1, TFP: 1 });

// Buscar eventos internos CPU_DONE
const cpuDoneEvents = trace.events.filter(e => e.type === 'CPU_DONE');
console.log(`\nEventos CPU_DONE encontrados: ${cpuDoneEvents.length}`);
cpuDoneEvents.forEach(e => console.log(`  P${e.pid} @ t=${e.t}`));

// Eventos C→B (que deberían venir de CPU_DONE)
const blockEvents = trace.events.filter(e => e.type === 'C→B');
console.log(`\nEventos C→B: ${blockEvents.length}`);
blockEvents.forEach(e => console.log(`  P${e.pid} @ t=${e.t}`));

// Foco en P1
console.log('\n=== FOCO EN P1 ===');
const p1Dispatches = trace.events.filter(e => e.pid === 1 && e.type === 'L→C');
const p1Slices = trace.slices.filter(s => s.pid === 1);

console.log('\nDespachos vs Slices de P1:');
p1Dispatches.forEach((dispatch, i) => {
  const slice = p1Slices[i];
  if (slice) {
    const expectedStart = dispatch.t + 1; // TCP = 1
    const actualStart = slice.start;
    const duration = slice.end - slice.start;
    console.log(`  Dispatch @ t=${dispatch.t} → slice [${actualStart}, ${slice.end}) = ${duration} ticks`);
    console.log(`    Expected start: ${expectedStart}, actual: ${actualStart} ${expectedStart === actualStart ? '✅' : '❌'}`);
  }
});

// Último dispatch de P1 antes de C→B
const lastDispatch = p1Dispatches[p1Dispatches.length - 2]; // penúltimo (último es post-I/O)
const p1Block = trace.events.find(e => e.pid === 1 && e.type === 'C→B');

if (lastDispatch && p1Block) {
  const tStart = lastDispatch.t + 1; // TCP
  const expectedEnd = tStart + 4; // restante debería ser 4
  console.log(`\nÚltimo dispatch P1 @ t=${lastDispatch.t}:`);
  console.log(`  Slice debería iniciar: t=${tStart}`);
  console.log(`  Con 4 ticks restantes, debería terminar: t=${expectedEnd}`);
  console.log(`  C→B real: t=${p1Block.t}`);
  console.log(`  Diferencia: ${p1Block.t - expectedEnd} ticks`);
}