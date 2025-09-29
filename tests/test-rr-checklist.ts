import { runRR } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';
import type { Costos } from '../src/lib/model/costos';

// Procesos para verificar RR con quantum=6
const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [10], rafagasES: [], estado: 'N' },
  { pid: 2, arribo: 2, rafagasCPU: [8], rafagasES: [], estado: 'N' },
  { pid: 3, arribo: 4, rafagasCPU: [4], rafagasES: [], estado: 'N' }
];

const costos: Costos = { TIP: 1, TCP: 1, TFP: 0, bloqueoES: 25 };
const quantum = 6;

console.log('=== RR ANÁLISIS DE EXPROPIACIONES Y TIMERS ===\n');

const trace = runRR(procesos, costos, quantum);

console.log('📋 CHECKPOINT 1: Contador de expropiaciones incluye quantum');
const preemptEvents = trace.events.filter(e => e.type === 'C→L');
const quantumPreempts = preemptEvents.filter(e => e.data?.reason === 'quantum');
const otherPreempts = preemptEvents.filter(e => e.data?.reason === 'preempt');

console.log(`  Total C→L: ${preemptEvents.length}`);
console.log(`  Por quantum: ${quantumPreempts.length}`);
console.log(`  Por preempt: ${otherPreempts.length}`);

quantumPreempts.forEach(evt => {
  console.log(`    Quantum preempt: P${evt.pid} @ t=${evt.t}`);
});

console.log('\n📋 CHECKPOINT 2: Solo programar PREEMPT si rBurst > quantum');
console.log('Análisis de slices vs quantum:');
trace.slices.forEach(slice => {
  const duration = slice.end - slice.start;
  const shouldPreempt = duration === quantum;
  const wasPreempted = quantumPreempts.some(evt => evt.pid === slice.pid && evt.t === slice.end);
  
  // Para validar correctamente:
  // - Si el slice dura exactamente quantum Y fue preemptado → el proceso tenía más trabajo (rBurst > quantum)
  // - Si el slice dura menos que quantum Y NO fue preemptado → el proceso terminó (rBurst <= quantum) 
  if (duration < quantum) {
    const status = !wasPreempted ? '✅' : '❌';
    console.log(`  P${slice.pid}: [${slice.start}, ${slice.end}) = ${duration} ticks (<quantum) - preempt: ${wasPreempted} ${status}`);
  } else if (duration === quantum) {
    // Si duró exactamente quantum, verificamos si era el último slice del proceso
    const isLastSlice = !trace.slices.some(s => s.pid === slice.pid && s.start > slice.end);
    if (isLastSlice) {
      // Último slice exactamente quantum - no debería preemptar
      const status = !wasPreempted ? '✅' : '❌';
      console.log(`  P${slice.pid}: [${slice.start}, ${slice.end}) = ${duration} ticks (=quantum, último) - preempt: ${wasPreempted} ${status}`);
    } else {
      // No es último slice, tenía más trabajo - debería preemptar
      const status = wasPreempted ? '✅' : '❌'; 
      console.log(`  P${slice.pid}: [${slice.start}, ${slice.end}) = ${duration} ticks (=quantum, continúa) - preempt: ${wasPreempted} ${status}`);
    }
  } else {
    const status = wasPreempted ? '✅' : '❌';
    console.log(`  P${slice.pid}: [${slice.start}, ${slice.end}) = ${duration} ticks (>quantum) - preempt: ${wasPreempted} ${status}`);
  }
});

console.log('\n📋 CHECKPOINT 3: Generation invalidation (sin eventos fantasma)');
console.log('Verificando que no hay CPU_DONE fantasma después de preempt:');

// Simular búsqueda de CPU_DONE events que podrían ser problemáticos
const cpuEvents = trace.events.filter(e => e.type === 'C→T' || e.type === 'C→B');
let phantomEvents = 0;

for (const preempt of quantumPreempts) {
  // Buscar si hay eventos de CPU después del preempt que podrían ser fantasma
  const nextCpuEvent = cpuEvents.find(e => 
    e.pid === preempt.pid && 
    e.t > preempt.t && 
    e.t < preempt.t + 10 // Ventana de búsqueda
  );
  
  if (nextCpuEvent && nextCpuEvent.t !== preempt.t) {
    console.log(`    ⚠️  Posible evento fantasma: P${preempt.pid} preempt @ t=${preempt.t}, siguiente evento @ t=${nextCpuEvent.t}`);
    phantomEvents++;
  }
}

const phantomStatus = phantomEvents === 0 ? '✅' : '❌';
console.log(`  Eventos fantasma detectados: ${phantomEvents} ${phantomStatus}`);

console.log('\n📋 CHECKPOINT 4: Quantum timing exacto');
console.log('Verificando que quantum se respeta exactamente:');
const dispatchEvents = trace.events.filter(e => e.type === 'L→C');

dispatchEvents.forEach(dispatch => {
  const slice = trace.slices.find(s => 
    s.pid === dispatch.pid && 
    s.start >= dispatch.t + costos.TCP
  );
  
  if (slice) {
    const duration = slice.end - slice.start;
    const preempt = quantumPreempts.find(p => p.pid === dispatch.pid && p.t === slice.end);
    
    if (preempt && duration === quantum) {
      console.log(`    P${dispatch.pid}: L→C @ t=${dispatch.t} → slice [${slice.start}, ${slice.end}) = ${duration} ticks → quantum preempt ✅`);
    } else if (!preempt && duration < quantum) {
      console.log(`    P${dispatch.pid}: L→C @ t=${dispatch.t} → slice [${slice.start}, ${slice.end}) = ${duration} ticks → proceso termina ✅`);
    } else if (!preempt && duration === quantum) {
      console.log(`    P${dispatch.pid}: L→C @ t=${dispatch.t} → slice [${slice.start}, ${slice.end}) = ${duration} ticks → NO preempt ❌`);
    }
  }
});

console.log('\n📋 CHECKPOINT 5: Round Robin fairness');
console.log('Verificando rotación equitativa:');
const timeline = [];
for (const slice of trace.slices.sort((a, b) => a.start - b.start)) {
  timeline.push(`P${slice.pid}(${slice.end - slice.start})`);
}
console.log(`  Timeline: ${timeline.join(' → ')}`);

console.log('\n=== EVENTOS COMPLETOS ===');
trace.events.forEach(evt => {
  const dataStr = evt.data ? ` ${JSON.stringify(evt.data)}` : '';
  console.log(`  t=${evt.t}: ${evt.type} P${evt.pid}${dataStr}`);
});

console.log('\n=== SLICES COMPLETOS ===');
trace.slices.forEach(slice => {
  console.log(`  P${slice.pid}: [${slice.start}, ${slice.end}) = ${slice.end - slice.start} ticks`);
});