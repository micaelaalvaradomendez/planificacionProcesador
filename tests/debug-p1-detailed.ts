// tests/debug-p1-detailed.ts
import { runSRTN } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 12], rafagasES: [20], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [12, 8], rafagasES: [25], estado: 'N' },
  { pid: 3, arribo: 3, rafagasCPU: [3, 5], rafagasES: [15], estado: 'N' },
  { pid: 4, arribo: 4, rafagasCPU: [6, 2], rafagasES: [30], estado: 'N' },
  { pid: 5, arribo: 6, rafagasCPU: [1, 4], rafagasES: [10], estado: 'N' }
];

console.log('=== ANÁLISIS DETALLADO P1 ===');
const trace = runSRTN(procesos, { TIP: 1, TCP: 1, TFP: 1 });

// Mostrar todos los eventos relevantes ordenados por tiempo
const relevantEvents = trace.events.filter(e => 
  e.pid === 1 || 
  (e.type === 'C→L' && e.data?.reason === 'preempt') ||
  (e.type === 'L→C') ||
  (e.type === 'N→L')
).sort((a, b) => a.t - b.t);

console.log('\nEventos relevantes (cronológicos):');
relevantEvents.forEach(e => {
  const pidStr = e.pid ? `P${e.pid}` : '???';
  const dataStr = e.data ? ` (${JSON.stringify(e.data)})` : '';
  console.log(`  t=${e.t}: ${e.type} ${pidStr}${dataStr}`);
});

// Analizar qué pasa con el tiempo restante de P1
console.log('\nAnálisis de tiempo restante P1:');
console.log('Inicial: 15 ticks');

const p1Slices = trace.slices.filter(s => s.pid === 1);
let restante = 15;

p1Slices.forEach((slice, i) => {
  const executed = slice.end - slice.start;
  const isFirstBurst = i < p1Slices.length - 1; // último slice es 2ª ráfaga
  
  if (isFirstBurst) {
    restante -= executed;
    console.log(`Slice ${i+1}: [${slice.start}, ${slice.end}) = ${executed} ticks, restante = ${restante}`);
  } else {
    console.log(`Slice ${i+1} (2ª ráfaga): [${slice.start}, ${slice.end}) = ${executed} ticks`);
  }
});

console.log(`\nTiempo restante al final de 1ª ráfaga: ${restante} ticks`);
if (restante !== 0) {
  console.log(`❌ ERROR: P1 debería haber consumido toda su 1ª ráfaga (15 ticks)`);
  console.log(`   Tiempo perdido: ${restante} ticks`);
}