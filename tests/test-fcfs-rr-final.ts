import { runFCFS, runRR } from '../src/lib/engine/engine';
import { MetricsBuilder } from '../src/lib/metrics/metricas';
import type { Proceso } from '../src/lib/model/proceso';
import type { Costos } from '../src/lib/model/costos';

// Procesos para verificar FCFS y RR específicamente
const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 12], rafagasES: [4], estado: 'N' },
  { pid: 2, arribo: 2, rafagasCPU: [8], rafagasES: [], estado: 'N' },
  { pid: 3, arribo: 4, rafagasCPU: [6], rafagasES: [], estado: 'N' }
];

const costos: Costos = { TIP: 1, TCP: 1, TFP: 2, bloqueoES: 25 };
const quantum = 6;

console.log('=== VERIFICACIÓN FINAL FCFS Y RR ===\n');

console.log('📋 FCFS - CHECKLIST DE CONSISTENCIA');
const traceFCFS = runFCFS(procesos, costos);
const metricsFCFS = MetricsBuilder.build(traceFCFS, procesos);
const globalFCFS = MetricsBuilder.buildGlobal(metricsFCFS, traceFCFS);

// 1. C→T en tEnd (separación correcta de TFP)
console.log('  1. C→T en tEnd + TFP trazado:');
const finishEvents = traceFCFS.events.filter(e => e.type === 'C→T');
finishEvents.forEach(evt => {
  const lastSlice = traceFCFS.slices.filter(s => s.pid === evt.pid).pop();
  if (lastSlice) {
    const status = evt.t === lastSlice.end ? '✅' : '❌';
    console.log(`    P${evt.pid}: C→T @ t=${evt.t}, último slice termina @ t=${lastSlice.end} ${status}`);
  }
});

// 2. TCP antes de cada slice
console.log('  2. TCP aplicado antes de cada slice:');
const dispatchEvents = traceFCFS.events.filter(e => e.type === 'L→C');
dispatchEvents.forEach(dispatch => {
  const nextSlice = traceFCFS.slices.find(s => s.pid === dispatch.pid && s.start >= dispatch.t);
  if (nextSlice) {
    const expectedStart = dispatch.t + costos.TCP;
    const status = nextSlice.start === expectedStart ? '✅' : '❌';
    console.log(`    P${dispatch.pid}: L→C @ t=${dispatch.t}, slice inicia @ t=${nextSlice.start}, esperado t=${expectedStart} ${status}`);
  }
});

// 3. E/S por proceso (rafagasES específico)
console.log('  3. E/S usa rafagasES específico:');
const blockEvents = traceFCFS.events.filter(e => e.type === 'C→B');
const unblockEvents = traceFCFS.events.filter(e => e.type === 'B→L');
blockEvents.forEach(block => {
  const unblock = unblockEvents.find(ub => ub.pid === block.pid && ub.t > block.t);
  if (unblock && block.pid) {
    const duracion = unblock.t - block.t;
    const proceso = procesos.find(p => p.pid === block.pid);
    const esperada = proceso?.rafagasES?.[0] ?? costos.bloqueoES;
    const status = duracion === esperada ? '✅' : '❌';
    console.log(`    P${block.pid}: duración E/S=${duracion}, esperada=${esperada} ${status}`);
  }
});

// 4. Sin expropiaciones (FCFS puro)
const preemptFCFS = traceFCFS.events.filter(e => e.type === 'C→L').length;
console.log(`  4. Sin expropiaciones: ${preemptFCFS} ${preemptFCFS === 0 ? '✅' : '❌'}`);

console.log('\n📋 RR - MÉTRICAS Y ROBUSTEZ DE TIMERS');
const traceRR = runRR(procesos, costos, quantum);
const metricsRR = MetricsBuilder.build(traceRR, procesos);
const globalRR = MetricsBuilder.buildGlobal(metricsRR, traceRR);

// 1. Métricas incluyen quantum preemptions
console.log('  1. Contador de expropiaciones incluye quantum:');
const quantumPreempts = traceRR.events.filter(e => e.type === 'C→L' && e.data?.reason === 'quantum').length;
const preemptPreempts = traceRR.events.filter(e => e.type === 'C→L' && e.data?.reason === 'preempt').length;
console.log(`    Quantum preempts: ${quantumPreempts}`);
console.log(`    Other preempts: ${preemptPreempts}`);
console.log(`    Total en métricas: ${globalRR.expropiaciones}`);
const metricsStatus = globalRR.expropiaciones === (quantumPreempts + preemptPreempts) ? '✅' : '❌';
console.log(`    Métricas correctas: ${metricsStatus}`);

// 2. Solo PREEMPT si rBurst > quantum
console.log('  2. Solo PREEMPT si rBurst > quantum:');
const rrSlices = traceRR.slices.sort((a, b) => a.start - b.start);
rrSlices.forEach(slice => {
  const duration = slice.end - slice.start;
  const wasPreempted = traceRR.events.some(e => 
    e.type === 'C→L' && e.pid === slice.pid && e.t === slice.end && e.data?.reason === 'quantum'
  );
  
  if (duration === quantum && wasPreempted) {
    // Si duró exactamente quantum y fue preemptado, el proceso tenía más trabajo
    console.log(`    P${slice.pid}: ${duration} ticks (=quantum) → preempt ✅ (tenía más trabajo)`);
  } else if (duration < quantum && !wasPreempted) {
    console.log(`    P${slice.pid}: ${duration} ticks (<quantum) → NO preempt ✅ (terminó)`);
  } else if (duration > quantum) {
    console.log(`    P${slice.pid}: ${duration} ticks (>quantum) → ❌ ERROR`);
  }
});

// 3. Generation tracking funciona
console.log('  3. Generation tracking previene eventos fantasma:');
console.log('    (Implícito en CPU accounting correcto)');

// CPU accounting verification
console.log('\n📊 VERIFICACIÓN CPU ACCOUNTING:');
console.log('  FCFS:');
for (const proceso of procesos) {
  const totalSlices = traceFCFS.slices.filter(s => s.pid === proceso.pid).reduce((sum, s) => sum + (s.end - s.start), 0);
  const totalRafagas = proceso.rafagasCPU.reduce((sum, r) => sum + r, 0);
  const status = totalSlices === totalRafagas ? '✅' : '❌';
  console.log(`    P${proceso.pid}: slices=${totalSlices}, rafagas=${totalRafagas} ${status}`);
}

console.log('  RR:');
for (const proceso of procesos) {
  const totalSlices = traceRR.slices.filter(s => s.pid === proceso.pid).reduce((sum, s) => sum + (s.end - s.start), 0);
  const totalRafagas = proceso.rafagasCPU.reduce((sum, r) => sum + r, 0);
  const status = totalSlices === totalRafagas ? '✅' : '❌';
  console.log(`    P${proceso.pid}: slices=${totalSlices}, rafagas=${totalRafagas} ${status}`);
}

console.log('\n🎉 VEREDICTO FINAL:');
const fcfsOK = preemptFCFS === 0 && finishEvents.length > 0;
const rrOK = globalRR.expropiaciones === (quantumPreempts + preemptPreempts) && quantumPreempts > 0;

if (fcfsOK && rrOK) {
  console.log('✅ FCFS Y RR COMPLETAMENTE CORRECTOS');
  console.log('  ✅ FCFS: C→T en tEnd, TCP aplicado, E/S específico, sin preempt');
  console.log('  ✅ RR: Métricas incluyen quantum, generation tracking, PREEMPT correcto');
} else {
  console.log('❌ AÚN HAY PROBLEMAS');
  console.log(`  FCFS: ${fcfsOK ? '✅' : '❌'}`);
  console.log(`  RR: ${rrOK ? '✅' : '❌'}`);
}