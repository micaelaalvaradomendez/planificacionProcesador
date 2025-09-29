import { runSRTN } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';
import type { Costos } from '../src/lib/model/costos';

// Los mismos procesos que causaron el problema
const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [8, 12], rafagasES: [4], estado: 'N', prioridadBase: 3 },
  { pid: 2, arribo: 2, rafagasCPU: [6, 4], rafagasES: [2], estado: 'N', prioridadBase: 1 },
  { pid: 3, arribo: 4, rafagasCPU: [10], rafagasES: [], estado: 'N', prioridadBase: 2 }
];

const costos: Costos = { TIP: 1, TCP: 2, TFP: 1, bloqueoES: 25 };

console.log('🔍 DEBUG: SRTN TCP TIMING ISSUE\n');

const trace = runSRTN(procesos, costos);

console.log('EVENTOS L→C Y SUS SLICES CORRESPONDIENTES:');
const dispatchEvents = trace.events.filter(e => e.type === 'L→C');

for (const dispatch of dispatchEvents) {
  console.log(`\nL→C: P${dispatch.pid} @ t=${dispatch.t}`);
  
  // Buscar slice que empiece después de este dispatch
  const nextSlices = trace.slices
    .filter(s => s.pid === dispatch.pid && s.start >= dispatch.t)
    .sort((a, b) => a.start - b.start);
  
  if (nextSlices.length > 0) {
    const nextSlice = nextSlices[0];
    console.log(`  → Slice: P${nextSlice.pid} [${nextSlice.start}, ${nextSlice.end})`);
    console.log(`  → Esperado start: ${dispatch.t + costos.TCP}`);
    console.log(`  → Diferencia: ${nextSlice.start - (dispatch.t + costos.TCP)}`);
    
    if (nextSlice.start !== dispatch.t + costos.TCP) {
      console.log(`  ❌ TCP NO RESPETADO`);
    } else {
      console.log(`  ✅ TCP respetado`);
    }
  } else {
    console.log(`  ❌ No hay slice después de este L→C`);
  }
}

console.log('\nTODOS LOS EVENTOS EN ORDEN CRONOLÓGICO:');
trace.events
  .sort((a, b) => a.t - b.t)
  .slice(0, 20) // Primeros 20 eventos
  .forEach(e => {
    const data = e.data ? ` (${JSON.stringify(e.data)})` : '';
    console.log(`  t=${e.t}: ${e.type} P${e.pid}${data}`);
  });

console.log('\nTODOS LOS SLICES:');
trace.slices
  .sort((a, b) => a.start - b.start)
  .forEach(s => {
    console.log(`  P${s.pid}: [${s.start}, ${s.end}) = ${s.end - s.start} ticks`);
  });