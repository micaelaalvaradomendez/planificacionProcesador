// tests/debug-p1-timing.ts
import { runSRTN } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 12], rafagasES: [20], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [12, 8], rafagasES: [25], estado: 'N' },
  { pid: 3, arribo: 3, rafagasCPU: [3, 5], rafagasES: [15], estado: 'N' },
  { pid: 4, arribo: 4, rafagasCPU: [6, 2], rafagasES: [30], estado: 'N' },
  { pid: 5, arribo: 6, rafagasCPU: [1, 4], rafagasES: [10], estado: 'N' }
];

console.log('=== DEBUG P1 TIMING ===');
const trace = runSRTN(procesos, { TIP: 1, TCP: 1, TFP: 1 });

// Eventos de P1
const p1Events = trace.events.filter(e => e.pid === 1);
const p1Slices = trace.slices.filter(s => s.pid === 1);

console.log('\nEventos de P1:');
p1Events.forEach(e => console.log(`  ${e.type} @ t=${e.t} data=${JSON.stringify(e.data || {})}`));

console.log('\nSlices de P1:');
let totalP1CPU = 0;
p1Slices.forEach(s => {
  const duration = s.end - s.start;
  totalP1CPU += duration;
  console.log(`  [${s.start}, ${s.end}) = ${duration} ticks`);
});

console.log(`\nTotal CPU P1: ${totalP1CPU} (esperado: 27)`);
console.log(`Diferencia: ${totalP1CPU - 27}`);

// Analizar las ráfagas esperadas
console.log('\nRáfagas esperadas P1:');
console.log('  1ª ráfaga: 15 ticks');
console.log('  2ª ráfaga: 12 ticks');
console.log('  Total: 27 ticks');

// Verificar si hay eventos C→B para P1 (debería haber uno)
const p1Blocks = trace.events.filter(e => e.pid === 1 && e.type === 'C→B');
const p1IOReturns = trace.events.filter(e => e.pid === 1 && e.type === 'B→L');

console.log(`\nP1 bloqueos (C→B): ${p1Blocks.length}`);
p1Blocks.forEach(e => console.log(`  C→B @ t=${e.t}`));

console.log(`\nP1 retornos de I/O (B→L): ${p1IOReturns.length}`);
p1IOReturns.forEach(e => console.log(`  B→L @ t=${e.t}`));

if (p1Blocks.length === 1 && p1IOReturns.length === 1) {
  console.log('\n✅ P1 tiene el patrón correcto de I/O (1 bloqueo, 1 retorno)');
} else {
  console.log('\n❌ P1 tiene patrón incorrecto de I/O');
}