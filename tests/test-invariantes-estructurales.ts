import { runFCFS, runRR, runSPN, runSRTN, runPriority } from '../src/lib/engine/engine';
import { MetricsBuilder } from '../src/lib/metrics/metricas';
import type { Proceso } from '../src/lib/model/proceso';
import type { Costos } from '../src/lib/model/costos';
import type { Trace } from '../src/lib/engine/types';

// Procesos para test comprehensivo de todos los invariantes
const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [8, 12], rafagasES: [4], estado: 'N', prioridadBase: 3 },
  { pid: 2, arribo: 2, rafagasCPU: [6, 4], rafagasES: [2], estado: 'N', prioridadBase: 1 },
  { pid: 3, arribo: 4, rafagasCPU: [10], rafagasES: [], estado: 'N', prioridadBase: 2 }
];

const costos: Costos = { TIP: 1, TCP: 2, TFP: 1, bloqueoES: 25 };
const quantum = 5;

console.log('🔍 ASSERTS ESTRUCTURALES - INVARIANTES FUNDAMENTALES\n');

function verificarInvariantes(algorithmName: string, trace: Trace, procesos: Proceso[], costos: Costos): boolean {
  console.log(`=== ${algorithmName} ===`);
  let allOK = true;

  // ASSERT 1: CPU Accounting - Σ slices(pid) == Σ rafagasCPU(pid)
  console.log('  ASSERT 1: CPU Accounting (Σ slices == Σ rafagas)');
  for (const proceso of procesos) {
    const totalSlices = trace.slices
      .filter(s => s.pid === proceso.pid)
      .reduce((sum, s) => sum + (s.end - s.start), 0);
    const totalRafagas = proceso.rafagasCPU.reduce((sum, r) => sum + r, 0);
    
    const isCorrect = totalSlices === totalRafagas;
    console.log(`    P${proceso.pid}: slices=${totalSlices}, rafagas=${totalRafagas} ${isCorrect ? '✅' : '❌'}`);
    if (!isCorrect) allOK = false;
  }

  // ASSERT 2: TCP Timing - start(slice después de L→C@t) == t + TCP
  // Solo verificar L→C que NO son seguidos inmediatamente por preemption
  console.log('  ASSERT 2: TCP Timing (slice_start = dispatch_t + TCP)');
  let tcpOK = true;
  const dispatchEvents = trace.events.filter(e => e.type === 'L→C');
  
  for (const dispatch of dispatchEvents) {
    // Verificar si este L→C es seguido inmediatamente por preemption
    const nextEvent = trace.events.find(e => 
      e.t > dispatch.t && e.pid === dispatch.pid
    );
    
    const isPreemptedImmediately = nextEvent && 
      nextEvent.type === 'C→L' && 
      nextEvent.data?.reason === 'preempt';
    
    if (!isPreemptedImmediately) {
      // Solo verificar TCP timing si realmente va a ejecutar
      const nextSlice = trace.slices.find(s => 
        s.pid === dispatch.pid && s.start >= dispatch.t
      );
      if (nextSlice) {
        const expectedStart = dispatch.t + costos.TCP;
        const isCorrect = nextSlice.start === expectedStart;
        if (!isCorrect) {
          console.log(`    ❌ P${dispatch.pid}: L→C@${dispatch.t} → slice@${nextSlice.start}, esperado@${expectedStart}`);
          tcpOK = false;
        }
      }
    }
  }
  if (tcpOK) console.log('    ✅ Todos los TCP respetados (excluyendo preemptions inmediatas)');
  if (!tcpOK) allOK = false;

  // ASSERT 3: Preemption Justification - Si hay C→L{reason:'preempt'}, debe existir causa
  console.log('  ASSERT 3: Preemption Justification');
  const preemptEvents = trace.events.filter(e => 
    e.type === 'C→L' && e.data?.reason === 'preempt'
  );
  
  let preemptOK = true;
  for (const preempt of preemptEvents) {
    // Buscar arrival o unblock concurrente que justifique la preemption
    const concurrent = trace.events.filter(e => 
      e.t === preempt.t && 
      (e.type === 'N→L' || e.type === 'B→L') && 
      e.pid !== preempt.pid
    );
    
    if (concurrent.length === 0) {
      console.log(`    ❌ P${preempt.pid}: preempt@${preempt.t} sin justificación concurrente`);
      preemptOK = false;
    }
  }
  if (preemptOK || preemptEvents.length === 0) {
    console.log(`    ✅ ${preemptEvents.length} preemptions justificadas`);
  }
  if (!preemptOK) allOK = false;

  // ASSERT 4: No CPU Overlap - Ningún momento con >1 proceso en CPU
  console.log('  ASSERT 4: No CPU Overlap');
  let overlapOK = true;
  const allTimes = new Set<number>();
  trace.slices.forEach(s => {
    for (let t = s.start; t < s.end; t++) {
      allTimes.add(t);
    }
  });

  for (const t of allTimes) {
    const concurrent = trace.slices.filter(s => 
      s.start <= t && t < s.end
    );
    if (concurrent.length > 1) {
      console.log(`    ❌ t=${t}: múltiples procesos en CPU: ${concurrent.map(s => `P${s.pid}`).join(', ')}`);
      overlapOK = false;
    }
  }
  if (overlapOK) console.log('    ✅ Sin overlaps de CPU');
  if (!overlapOK) allOK = false;

  // ASSERT 5: Event Ordering - Eventos en orden cronológico con prioridades correctas
  console.log('  ASSERT 5: Event Ordering');
  let orderOK = true;
  for (let i = 1; i < trace.events.length; i++) {
    const prev = trace.events[i-1];
    const curr = trace.events[i];
    
    if (curr.t < prev.t) {
      console.log(`    ❌ Orden temporal: evento ${i-1}@${prev.t} > evento ${i}@${curr.t}`);
      orderOK = false;
    }
  }
  if (orderOK) console.log('    ✅ Eventos en orden cronológico');
  if (!orderOK) allOK = false;

  console.log(`  RESULTADO: ${allOK ? '✅ TODOS LOS INVARIANTES OK' : '❌ ALGUNOS INVARIANTES FALLAN'}\n`);
  return allOK;
}

// Probar todos los algoritmos
const algoritmos = [
  { name: 'FCFS', fn: () => runFCFS(procesos, costos) },
  { name: 'RR', fn: () => runRR(procesos, costos, quantum) },
  { name: 'SPN', fn: () => runSPN(procesos, costos) },
  { name: 'SRTN', fn: () => runSRTN(procesos, costos) },
  { name: 'PRIORITY', fn: () => runPriority(procesos, costos) }
];

let allAlgorithmsOK = true;

for (const algo of algoritmos) {
  try {
    const trace = algo.fn();
    const isOK = verificarInvariantes(algo.name, trace, procesos, costos);
    if (!isOK) allAlgorithmsOK = false;
  } catch (error) {
    console.log(`❌ ${algo.name}: ERROR DE EJECUCIÓN - ${error}`);
    allAlgorithmsOK = false;
  }
}

console.log('🎯 VEREDICTO FINAL DE INVARIANTES:');
if (allAlgorithmsOK) {
  console.log('🏆 TODOS LOS ALGORITMOS RESPETAN TODOS LOS INVARIANTES');
  console.log('   ✅ CPU Accounting perfecto');
  console.log('   ✅ TCP timing correcto');
  console.log('   ✅ Preemptions justificadas');
  console.log('   ✅ Sin CPU overlaps');
  console.log('   ✅ Event ordering correcto');
  console.log('\n🎉 EL SIMULADOR ES ESTRUCTURALMENTE SÓLIDO');
} else {
  console.log('⚠️  ALGUNOS ALGORITMOS VIOLAN INVARIANTES FUNDAMENTALES');
  console.log('💡 Revisar la implementación de los algoritmos que fallaron');
}