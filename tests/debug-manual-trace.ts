// tests/debug-manual-trace.ts
import { runSRTN } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';

const tresProcesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 12], rafagasES: [20], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [12, 8], rafagasES: [25], estado: 'N' },
  { pid: 3, arribo: 3, rafagasCPU: [3, 5], rafagasES: [15], estado: 'N' }
];

console.log('=== TRACE MANUAL DETALLADO ===');
console.log('Simulación manual del tiempo restante:');

let p1_restante = 15;
console.log(`\nP1 inicial: ${p1_restante} ticks`);

console.log('\n1. P1 ejecuta [2,4) = 2 ticks');
p1_restante -= 2;
console.log(`   P1 restante: ${p1_restante} ticks`);

console.log('\n2. P1 ejecuta [22,23) = 1 tick');
p1_restante -= 1;
console.log(`   P1 restante: ${p1_restante} ticks`);

console.log('\n3. P1 ejecuta [30,35) = 5 ticks');
p1_restante -= 5;
console.log(`   P1 restante: ${p1_restante} ticks`);
console.log(`   → P1 debería ir a I/O después de ejecutar ${p1_restante} ticks más`);

console.log('\n=== COMPARACIÓN CON SIMULACIÓN REAL ===');
const trace = runSRTN(tresProcesos, { TIP: 1, TCP: 1, TFP: 1 });

const p1Events = trace.events.filter(e => e.pid === 1);
const p1Slices = trace.slices.filter(s => s.pid === 1);

console.log('\nEventos P1:');
p1Events.forEach(e => {
  const dataStr = e.data ? ` (${JSON.stringify(e.data)})` : '';
  console.log(`  ${e.type} @ t=${e.t}${dataStr}`);
});

console.log('\nSlices P1:');
p1Slices.forEach((s, i) => {
  const dur = s.end - s.start;
  console.log(`  ${i+1}. [${s.start}, ${s.end}) = ${dur} ticks`);
});

const p1TotalCPU = p1Slices.reduce((sum, s) => sum + (s.end - s.start), 0);
console.log(`\nP1 CPU total ejecutado: ${p1TotalCPU}`);
console.log(`P1 debería ejecutar primera ráfaga: 15 ticks`);
console.log(`P1 debería ejecutar segunda ráfaga: 12 ticks`);
console.log(`P1 total esperado: 27 ticks`);
console.log(`Diferencia: ${p1TotalCPU - 27} ticks`);

// Buscar cuándo P1 va a I/O
const p1Block = trace.events.find(e => e.pid === 1 && e.type === 'C→B');
const p1LastFirstBurstSlice = p1Slices.find(s => s.end === p1Block?.t);

if (p1Block && p1LastFirstBurstSlice) {
  console.log(`\nP1 va a I/O en t=${p1Block.t}`);
  console.log(`Slice que termina en I/O: [${p1LastFirstBurstSlice.start}, ${p1LastFirstBurstSlice.end})`);
  console.log('Según mi cálculo manual, P1 debería tener 7 ticks restantes cuando va a I/O');
  console.log('Pero el slice sugiere que r.restante era 5 (duration del slice)');
  console.log('ESTO CONFIRMA que hay un problema en la actualización de r.restante');
}