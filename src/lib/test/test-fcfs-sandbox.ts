// Test de validación para el motor FCFS sandbox
import { runFCFSSandbox } from '../engine/engine';
import type { Proceso } from '../model/proceso';

console.log('=== Testing FCFS Sandbox Engine ===\n');

// Golden A (sin E/S)
console.log('--- Golden A (sin E/S) ---');
const procsA: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [5], estado: 'N' },
  { pid: 2, arribo: 2, rafagasCPU: [4], estado: 'N' },
];

const traceA = runFCFSSandbox(procsA, { bloqueoES: 0 });
console.log('Slices A:', traceA.slices);
console.log('Expected: P1: 0–5, P2: 5–9');
console.log('Events A:', traceA.events.map(e => `${e.t}:${e.type}(${e.pid})`).join(', '));
console.log('');

// Golden B (E/S = 0)
console.log('--- Golden B (E/S = 0) ---');
const procsB: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [3, 2], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [4], estado: 'N' },
];

const traceB = runFCFSSandbox(procsB, { bloqueoES: 0 });
console.log('Slices B:', traceB.slices);
console.log('Expected: P1: 0–3, P2: 3–7, P1: 7–9');
console.log('Events B:', traceB.events.map(e => `${e.t}:${e.type}(${e.pid})`).join(', '));
console.log('');

// Validación de los resultados
function validateGoldenA(trace: typeof traceA): boolean {
  const slices = trace.slices;
  return (
    slices.length === 2 &&
    slices[0].pid === 1 && slices[0].start === 0 && slices[0].end === 5 &&
    slices[1].pid === 2 && slices[1].start === 5 && slices[1].end === 9
  );
}

function validateGoldenB(trace: typeof traceB): boolean {
  const slices = trace.slices;
  return (
    slices.length === 3 &&
    slices[0].pid === 1 && slices[0].start === 0 && slices[0].end === 3 &&
    slices[1].pid === 2 && slices[1].start === 3 && slices[1].end === 7 &&
    slices[2].pid === 1 && slices[2].start === 7 && slices[2].end === 9
  );
}

console.log('--- Validation Results ---');
console.log('Golden A valid:', validateGoldenA(traceA) ? '✅' : '❌');
console.log('Golden B valid:', validateGoldenB(traceB) ? '✅' : '❌');