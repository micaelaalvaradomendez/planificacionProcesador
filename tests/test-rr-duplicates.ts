// test-rr-duplicates.ts
import { runRR } from '$lib/engine/engine';
import type { Proceso } from '$lib/model/proceso';

console.log('🧪 Test RR - Verificar eventos C→T duplicados');

const procesosSimple: Proceso[] = [
  {
    pid: 1,
    arribo: 0,
    rafagasCPU: [6], // Una sola ráfaga - debería terminar sin duplicados
    estado: 'N'
  }
];

const trace = runRR(procesosSimple, { TIP: 0, TCP: 0, TFP: 0 }, 3);

console.log('Todos los eventos:');
trace.events.forEach(e => {
  console.log(`  t=${e.t}: ${e.type} (P${e.pid})`);
});

const finishEvents = trace.events.filter(e => e.type === 'C→T');
console.log(`\nEventos C→T encontrados: ${finishEvents.length}`);
finishEvents.forEach((e, i) => {
  console.log(`  ${i+1}. t=${e.t} P${e.pid} data=${JSON.stringify(e.data)}`);
});

if (finishEvents.length > 1) {
  console.log('❌ PROBLEMA: Eventos C→T duplicados detectados');
} else {
  console.log('✅ Sin eventos C→T duplicados');
}

console.log('\nSlices:');
trace.slices.forEach(s => {
  console.log(`  P${s.pid}: [${s.start}, ${s.end})`);
});

export {};