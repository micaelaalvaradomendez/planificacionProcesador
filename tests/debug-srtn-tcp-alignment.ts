import { runSRTN } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';
import type { Costos } from '../src/lib/model/costos';

// Usar el mismo conjunto que el verificador usa
const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 12], rafagasES: [20], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [12, 8], rafagasES: [25], estado: 'N' },
  { pid: 3, arribo: 3, rafagasCPU: [3, 5], rafagasES: [15], estado: 'N' },
  { pid: 4, arribo: 4, rafagasCPU: [6, 2], rafagasES: [30], estado: 'N' },
  { pid: 5, arribo: 6, rafagasCPU: [1, 4], rafagasES: [10], estado: 'N' }
];

const costos: Costos = { TIP: 1, TCP: 1, TFP: 1, bloqueoES: 25 };

console.log('=== DEBUG SRTN TCP ALIGNMENT P1 ===\n');

const trace = runSRTN(procesos, costos);

// Filtrar solo eventos de P1 alrededor del problema
const p1Events = trace.events.filter(e => e.pid === 1 && e.t <= 50);
const p1Slices = trace.slices.filter(s => s.pid === 1);

console.log('Eventos de P1 (hasta t=50):');
p1Events.forEach(evt => {
  console.log(`  t=${evt.t}: ${evt.type} P${evt.pid}`, evt.data ? JSON.stringify(evt.data) : '');
});

console.log('\nSlices completos de P1:');
p1Slices.forEach(slice => {
  console.log(`  P${slice.pid}: [${slice.start}, ${slice.end}) = ${slice.end - slice.start} ticks`);
});

console.log('\nAnálisis del problema:');
const lToC = p1Events.find(e => e.type === 'L→C');
const firstSlice = p1Slices[0];

if (lToC && firstSlice) {
  console.log(`P1 hace L→C @ t=${lToC.t}`);
  console.log(`Primer slice de P1: [${firstSlice.start}, ${firstSlice.end})`);
  console.log(`Esperado inicio slice: t=${lToC.t + costos.TCP} (L→C + TCP)`);
  console.log(`Inicio real slice: t=${firstSlice.start}`);
  console.log(`Gap: ${firstSlice.start - (lToC.t + (costos.TCP || 0))} ticks`);
}

// Mostrar todos los eventos alrededor de t=1 a t=50 para entender el contexto
console.log('\nEventos completos t=0 a t=50:');
const contextEvents = trace.events.filter(e => e.t >= 0 && e.t <= 50);
contextEvents.forEach(evt => {
  console.log(`  t=${evt.t}: ${evt.type} P${evt.pid}`, evt.data ? JSON.stringify(evt.data) : '');
});