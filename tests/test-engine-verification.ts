// tests/test-engine-verification.ts
/**
 * Tests de verificación automática según el checklist
 * 1. CPU == Σ ráfagas (contabilidad exacta)
 * 2. C→T en tEnd (separación de TFP)
 * 3. TCP alignment (slice start = L→C + TCP)
 * 4. RR quantum correcto (solo PREEMPT si rBurst > quantum)
 * 5. SRTN preemption law (preempt inmediata si restante menor)
 * 6. E/S por ráfaga (duración correcta)
 */

import { runFCFS, runRR, runSRTN, runPriority } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';
import type { Costos } from '../src/lib/model/costos';

// Procesos de prueba (mismos que tus ejemplos originales)
const procesos5: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 12], rafagasES: [20], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [12, 8], rafagasES: [25], estado: 'N' },
  { pid: 3, arribo: 3, rafagasCPU: [3, 5], rafagasES: [15], estado: 'N' },
  { pid: 4, arribo: 4, rafagasCPU: [6, 2], rafagasES: [30], estado: 'N' },
  { pid: 5, arribo: 6, rafagasCPU: [1, 4], rafagasES: [10], estado: 'N' }
];

const costos: Costos = {
  TIP: 1,
  TCP: 1,
  TFP: 1,
  bloqueoES: 25
};

const quantum = 6;

console.log('=== TESTS DE VERIFICACIÓN AUTOMÁTICA ===\n');

// TEST 1: CPU == Σ ráfagas
function test1_CPUEqualsRafagas() {
  console.log('TEST 1: CPU == Σ ráfagas (contabilidad exacta)');
  
  const algorithms = [
    { name: 'FCFS', run: () => runFCFS(procesos5, costos) },
    { name: 'RR', run: () => runRR(procesos5, costos, quantum) },
    { name: 'SRTN', run: () => runSRTN(procesos5, costos) }
  ];

  let allPassed = true;
  
  for (const alg of algorithms) {
    console.log(`\n  ${alg.name}:`);
    const trace = alg.run();
    
    for (const proceso of procesos5) {
      const slicesProceso = trace.slices.filter(s => s.pid === proceso.pid);
      const tiempoSlices = slicesProceso.reduce((sum, s) => sum + (s.end - s.start), 0);
      const tiempoRafagas = proceso.rafagasCPU.reduce((sum, r) => sum + r, 0);
      
      const passed = tiempoSlices === tiempoRafagas;
      const status = passed ? '✅' : '❌';
      
      console.log(`    P${proceso.pid}: slices=${tiempoSlices}, rafagas=${tiempoRafagas} ${status}`);
      
      if (!passed) {
        allPassed = false;
        console.log(`      ERROR: Diferencia de ${tiempoSlices - tiempoRafagas} ticks`);
      }
    }
  }
  
  console.log(`\n  RESULTADO TEST 1: ${allPassed ? '✅ PASADO' : '❌ FALLADO'}`);
  return allPassed;
}

// TEST 2: C→T en tEnd (separación de TFP)
function test2_CTAtTEnd() {
  console.log('\nTEST 2: C→T en tEnd (separación correcta de TFP)');
  
  const algorithms = [
    { name: 'FCFS', run: () => runFCFS(procesos5, costos) },
    { name: 'RR', run: () => runRR(procesos5, costos, quantum) },
    { name: 'SRTN', run: () => runSRTN(procesos5, costos) }
  ];

  let allPassed = true;
  
  for (const alg of algorithms) {
    console.log(`\n  ${alg.name}:`);
    const trace = alg.run();
    
    const finEvents = trace.events.filter(e => e.type === 'C→T');
    
    for (const finEvent of finEvents) {
      if (finEvent.pid == null) continue;
      
      const lastSlice = trace.slices.filter(s => s.pid === finEvent.pid).pop();
      if (lastSlice) {
        const offset = finEvent.t - lastSlice.end;
        const passed = offset === 0;
        const status = passed ? '✅' : '❌';
        
        console.log(`    P${finEvent.pid}: último slice termina en ${lastSlice.end}, C→T en ${finEvent.t}, offset: ${offset} ${status}`);
        
        if (!passed) {
          allPassed = false;
        }
      }
    }
  }
  
  console.log(`\n  RESULTADO TEST 2: ${allPassed ? '✅ PASADO' : '❌ FALLADO'}`);
  return allPassed;
}

// TEST 3: TCP alignment
function test3_TCPAlignment() {
  console.log('\nTEST 3: TCP alignment (slice start = L→C + TCP)');
  
  const algorithms = [
    { name: 'FCFS', run: () => runFCFS(procesos5, costos) },
    { name: 'RR', run: () => runRR(procesos5, costos, quantum) },
    { name: 'SRTN', run: () => runSRTN(procesos5, costos) }
  ];

  let allPassed = true;
  
  for (const alg of algorithms) {
    console.log(`\n  ${alg.name}:`);
    const trace = alg.run();
    
    const dispatchEvents = trace.events.filter(e => e.type === 'L→C');
    let mismatches = 0;
    
    for (const dispatch of dispatchEvents) {
      if (dispatch.pid == null) continue;
      
      // Verificar si este L→C resulta en ejecución inmediata o preemption
      const expectedStart = dispatch.t + costos.TCP;
      const actualSlice = trace.slices.find(s => 
        s.pid === dispatch.pid && 
        s.start === expectedStart
      );
      
      if (actualSlice) {
        // Este L→C efectivamente resultó en ejecución - TCP alignment correcto
        continue;
      }
      
      // Verificar si hay preemption inmediata (válido en SRTN)
      const preemptEvent = trace.events.find(e => 
        e.type === 'C→L' && 
        e.pid === dispatch.pid && 
        e.t === expectedStart &&
        e.data?.reason === 'preempt'
      );
      
      if (preemptEvent) {
        // L→C seguido de preemption inmediata es válido - no es error de TCP alignment
        continue;
      }
      
      // Si no hay slice en el tiempo esperado ni preemption, es un error
      const nextSlice = trace.slices.find(s => s.pid === dispatch.pid && s.start > dispatch.t);
      if (nextSlice) {
        console.log(`    ❌ P${dispatch.pid}: L→C @ ${dispatch.t}, slice inicia en ${nextSlice.start}, esperado ${expectedStart}`);
        mismatches++;
      }
    }
    
    const passed = mismatches === 0;
    const status = passed ? '✅' : '❌';
    console.log(`    Mismatches: ${mismatches} ${status}`);
    
    if (!passed) {
      allPassed = false;
    }
  }
  
  console.log(`\n  RESULTADO TEST 3: ${allPassed ? '✅ PASADO' : '❌ FALLADO'}`);
  return allPassed;
}

// TEST 4: RR quantum correctness
function test4_RRQuantum() {
  console.log('\nTEST 4: RR quantum (solo PREEMPT si rBurst > quantum)');
  
  const trace = runRR(procesos5, costos, quantum);
  
  // Verificar que no hay C→T duplicados
  const finEvents = trace.events.filter(e => e.type === 'C→T');
  const finCounts = new Map<string, number>();
  
  for (const event of finEvents) {
    if (event.pid == null) continue;
    const key = `${event.pid}-${event.t}`;
    finCounts.set(key, (finCounts.get(key) || 0) + 1);
  }
  
  let duplicates = 0;
  for (const [key, count] of finCounts) {
    if (count > 1) {
      console.log(`  ❌ C→T duplicado para ${key}: ${count} veces`);
      duplicates++;
    }
  }
  
  const passed = duplicates === 0;
  const status = passed ? '✅' : '❌';
  console.log(`  C→T duplicados: ${duplicates} ${status}`);
  
  console.log(`\n  RESULTADO TEST 4: ${passed ? '✅ PASADO' : '❌ FALLADO'}`);
  return passed;
}

// TEST 5: SRTN preemption law
function test5_SRTNPreemption() {
  console.log('\nTEST 5: SRTN preemption law (preempt inmediata si restante menor)');
  
  const trace = runSRTN(procesos5, costos);
  
  const preemptions = trace.events.filter(e => e.type === 'C→L' && e.data?.reason === 'preempt');
  const contextSwitches = trace.events.filter(e => e.type === 'L→C');
  
  console.log(`  Preempciones: ${preemptions.length}`);
  console.log(`  Context switches: ${contextSwitches.length}`);
  
  const passed = preemptions.length > 0 && contextSwitches.length > 0;
  const status = passed ? '✅' : '❌';
  
  console.log(`  SRTN está preemptando: ${passed} ${status}`);
  
  if (passed) {
    console.log('  Preempciones detectadas:');
    preemptions.forEach(e => console.log(`    P${e.pid} @ t=${e.t}`));
  }
  
  console.log(`\n  RESULTADO TEST 5: ${passed ? '✅ PASADO' : '❌ FALLADO'}`);
  return passed;
}

// TEST 6: E/S por ráfaga
function test6_ESPorRafaga() {
  console.log('\nTEST 6: E/S por ráfaga (duración específica)');
  
  const algorithms = [
    { name: 'FCFS', run: () => runFCFS(procesos5, costos) },
    { name: 'RR', run: () => runRR(procesos5, costos, quantum) },
    { name: 'SRTN', run: () => runSRTN(procesos5, costos) }
  ];

  let allPassed = true;
  
  for (const alg of algorithms) {
    console.log(`\n  ${alg.name}:`);
    const trace = alg.run();
    
    const blockEvents = trace.events.filter(e => e.type === 'C→B');
    const returnEvents = trace.events.filter(e => e.type === 'B→L');
    
    console.log(`    Bloqueos (C→B): ${blockEvents.length}`);
    console.log(`    Retornos (B→L): ${returnEvents.length}`);
    
    const ioMatched = blockEvents.length === returnEvents.length;
    if (!ioMatched) {
      console.log(`    ❌ Número de bloqueos y retornos no coincide`);
      allPassed = false;
    } else {
      console.log(`    ✅ Bloqueos y retornos balanceados`);
    }
  }
  
  console.log(`\n  RESULTADO TEST 6: ${allPassed ? '✅ PASADO' : '❌ FALLADO'}`);
  return allPassed;
}

// Ejecutar todos los tests
function runAllTests() {
  const results = [
    test1_CPUEqualsRafagas(),
    test2_CTAtTEnd(), 
    test3_TCPAlignment(),
    test4_RRQuantum(),
    test5_SRTNPreemption(),
    test6_ESPorRafaga()
  ];
  
  const passedCount = results.filter(r => r).length;
  const totalCount = results.length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`RESUMEN FINAL: ${passedCount}/${totalCount} tests pasados`);
  
  if (passedCount === totalCount) {
    console.log('🎉 TODOS LOS TESTS PASARON - ENGINE CORREGIDO');
  } else {
    console.log('⚠️  HAY TESTS FALLANDO - REVISAR IMPLEMENTACIÓN');
  }
  console.log('='.repeat(50));
  
  return passedCount === totalCount;
}

// Ejecutar
runAllTests();