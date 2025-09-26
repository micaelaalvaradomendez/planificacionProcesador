// Debug test para entender el flujo exacto
import { runFCFSSandbox } from '../engine/engine';
import type { Proceso } from '../model/proceso';

console.log('=== Debug Golden B ===\n');

const procsB: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [3, 2], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [4], estado: 'N' },
];

console.log('P1: arribo=0, rafagas=[3,2]');
console.log('P2: arribo=1, rafagas=[4]');
console.log('bloqueoES=0');
console.log('');

const traceB = runFCFSSandbox(procsB, { bloqueoES: 0 });

console.log('Eventos detallados:');
traceB.events.forEach((e, i) => {
  console.log(`${i+1}. t=${e.t}: ${e.type}(pid=${e.pid})`);
});

console.log('\nSlices:');
traceB.slices.forEach((s, i) => {
  console.log(`${i+1}. pid=${s.pid}: ${s.start}→${s.end}`);
});

console.log('\nAnálisis esperado:');
console.log('1. t=0: P1 entra (N→L), se despacha inmediatamente (L→C)');
console.log('2. t=1: P2 entra (N→L), pero P1 está ejecutando');
console.log('3. t=3: P1 termina primera ráfaga (C→B), se programa B→L en t=3');
console.log('4. t=3: P1 vuelve a ready (B→L), pero P2 ya está en ready');
console.log('5. t=3: Se debe despachar P2 (llegó antes), P1 espera');
console.log('6. t=7: P2 termina (C→T), P1 se despacha');
console.log('7. t=9: P1 termina segunda ráfaga y proceso (C→T)');

console.log('\nEsperado: P1: 0-3, P2: 3-7, P1: 7-9');