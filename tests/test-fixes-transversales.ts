import { runFCFS, runRR, runSRTN, runPriority } from '../src/lib/engine/engine';
import { MetricsBuilder } from '../src/lib/metrics/metricas';
import type { Proceso } from '../src/lib/model/proceso';
import type { Costos } from '../src/lib/model/costos';

// Procesos diseñados para provocar múltiples preemptions y context switches
const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 8], rafagasES: [3], estado: 'N', prioridadBase: 2 },
  { pid: 2, arribo: 2, rafagasCPU: [4, 6], rafagasES: [2], estado: 'N', prioridadBase: 1 },
  { pid: 3, arribo: 4, rafagasCPU: [10], rafagasES: [], estado: 'N', prioridadBase: 3 }
];

const costos: Costos = { TIP: 1, TCP: 1, TFP: 2, bloqueoES: 25 };
const quantum = 5;

console.log('🔧 FIXES TRANSVERSALES - VERIFICACIÓN INTEGRAL\n');

// Test SRTN (más susceptible a eventos stale por preemptions frecuentes)
console.log('=== SRTN - EVENTOS STALE Y CONTADORES ===');
const traceSRTN = runSRTN(procesos, costos);
const metricsSRTN = MetricsBuilder.build(traceSRTN, procesos);
const globalSRTN = MetricsBuilder.buildGlobal(metricsSRTN, traceSRTN);

console.log('📊 VERIFICACIÓN DE CONTADORES:');

// 1. Assert CPU accounting correcto
console.log('  1. CPU Accounting (Σ slices == Σ rafagas):');
let cpuAccountingOK = true;
for (const proceso of procesos) {
  const totalSlices = traceSRTN.slices
    .filter(s => s.pid === proceso.pid)
    .reduce((sum, s) => sum + (s.end - s.start), 0);
  const totalRafagas = proceso.rafagasCPU.reduce((sum, r) => sum + r, 0);
  const status = totalSlices === totalRafagas ? '✅' : '❌';
  if (totalSlices !== totalRafagas) cpuAccountingOK = false;
  console.log(`    P${proceso.pid}: slices=${totalSlices}, rafagas=${totalRafagas} ${status}`);
}

// 2. Context switches = L→C events
const contextSwitches = traceSRTN.events.filter(e => e.type === 'L→C').length;
console.log(`  2. Cambios de contexto: contados=${globalSRTN.cambiosDeContexto}, L→C events=${contextSwitches}`);
const contextSwitchOK = globalSRTN.cambiosDeContexto === contextSwitches;
console.log(`     Status: ${contextSwitchOK ? '✅' : '❌'}`);

// 3. Preemptions = C→L events con reason preempt/quantum
const preemptEvents = traceSRTN.events.filter(e => 
  e.type === 'C→L' && (e.data?.reason === 'preempt' || e.data?.reason === 'quantum')
).length;
console.log(`  3. Expropiaciones: contadas=${globalSRTN.expropiaciones}, C→L preempt/quantum=${preemptEvents}`);
const preemptOK = globalSRTN.expropiaciones === preemptEvents;
console.log(`     Status: ${preemptOK ? '✅' : '❌'}`);

// 4. Verificar que cada slice después de L→C empieza en t + TCP
console.log('  4. TCP aplicado correctamente (start = dispatch_t + TCP):');
let tcpOK = true;
const dispatchEvents = traceSRTN.events.filter(e => e.type === 'L→C');
for (const dispatch of dispatchEvents) {
  const nextSlice = traceSRTN.slices.find(s => 
    s.pid === dispatch.pid && s.start >= dispatch.t
  );
  if (nextSlice) {
    const expectedStart = dispatch.t + costos.TCP;
    const isCorrect = nextSlice.start === expectedStart;
    if (!isCorrect) {
      tcpOK = false;
      console.log(`    ❌ P${dispatch.pid}: L→C@${dispatch.t} → slice@${nextSlice.start}, esperado@${expectedStart}`);
    }
  }
}
if (tcpOK) console.log('    ✅ Todos los slices respetan TCP');

// 5. Verificar preemptions solo cuando llega alguien mejor
console.log('  5. Preemptions justificadas (existe arrival/unblock del preemptor):');
const preemptEventsWithReason = traceSRTN.events.filter(e => 
  e.type === 'C→L' && e.data?.reason === 'preempt'
);

let preemptJustifiedOK = true;
for (const preempt of preemptEventsWithReason) {
  // Buscar si hay un arrival o IO_OUT en el mismo tiempo
  const concurrent = traceSRTN.events.filter(e => 
    e.t === preempt.t && (e.type === 'N→L' || e.type === 'B→L') && e.pid !== preempt.pid
  );
  
  if (concurrent.length === 0) {
    console.log(`    ❌ P${preempt.pid}: preempt@${preempt.t} sin concurrent arrival/unblock`);
    preemptJustifiedOK = false;
  }
}
if (preemptJustifiedOK) console.log('    ✅ Todas las preemptions tienen justificación');

console.log('\n=== RR - GENERATION TRACKING ===');
const traceRR = runRR(procesos, costos, quantum);
const metricsRR = MetricsBuilder.build(traceRR, procesos);

// Verificar que no hay eventos "fantasma" en RR
console.log('  CPU Accounting RR (detecta eventos stale):');
let rrAccountingOK = true;
for (const proceso of procesos) {
  const totalSlices = traceRR.slices
    .filter(s => s.pid === proceso.pid)
    .reduce((sum, s) => sum + (s.end - s.start), 0);
  const totalRafagas = proceso.rafagasCPU.reduce((sum, r) => sum + r, 0);
  const status = totalSlices === totalRafagas ? '✅' : '❌';
  if (totalSlices !== totalRafagas) rrAccountingOK = false;
  console.log(`    P${proceso.pid}: slices=${totalSlices}, rafagas=${totalRafagas} ${status}`);
}

console.log('\n=== PRIORITY - PREEMPTION VALIDATION ===');
const tracePriority = runPriority(procesos, costos);
const metricsPriority = MetricsBuilder.build(tracePriority, procesos);

// En Priority, cada vez que llega un proceso de mayor prioridad debe haber preemption
console.log('  Preemptions por prioridad:');
const priorityPreempts = tracePriority.events.filter(e => 
  e.type === 'C→L' && e.data?.reason === 'preempt'
);
console.log(`    Total preemptions: ${priorityPreempts.length}`);

// Verificar CPU accounting en Priority también
let priorityAccountingOK = true;
for (const proceso of procesos) {
  const totalSlices = tracePriority.slices
    .filter(s => s.pid === proceso.pid)
    .reduce((sum, s) => sum + (s.end - s.start), 0);
  const totalRafagas = proceso.rafagasCPU.reduce((sum, r) => sum + r, 0);
  const status = totalSlices === totalRafagas ? '✅' : '❌';
  if (totalSlices !== totalRafagas) priorityAccountingOK = false;
  console.log(`    P${proceso.pid}: slices=${totalSlices}, rafagas=${totalRafagas} ${status}`);
}

console.log('\n🎯 VEREDICTO FINAL:');
const allAccountingOK = cpuAccountingOK && rrAccountingOK && priorityAccountingOK;
const allCountersOK = contextSwitchOK && preemptOK;
const allStructuralOK = tcpOK && preemptJustifiedOK;

console.log(`  ✅ CPU Accounting: ${allAccountingOK ? 'CORRECTO' : 'FALLA'}`);
console.log(`  ✅ Contadores: ${allCountersOK ? 'CORRECTO' : 'FALLA'}`);
console.log(`  ✅ Validaciones estructurales: ${allStructuralOK ? 'CORRECTO' : 'FALLA'}`);

if (allAccountingOK && allCountersOK && allStructuralOK) {
  console.log('\n🏆 TODOS LOS FIXES TRANSVERSALES FUNCIONANDO CORRECTAMENTE');
} else {
  console.log('\n⚠️  ALGUNOS FIXES NECESITAN AJUSTES');
}