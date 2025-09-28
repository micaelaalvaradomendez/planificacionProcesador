// src/lib/test/test-spn-basic.ts

import { runSPN } from '../../src/lib/engine/engine';
import type { Proceso } from '../../src/lib/model/proceso';

/**
 * Test básico SPN (no expropiativo)
 * P1 arr=0[5], P2 arr=1[2], P3 arr=2[7]
 * 
 * Esperado: sin costos, orden por ráfaga más corta
 * - t=0: P1 comienza (ráfaga=5)
 * - t=1: P2 arriba (ráfaga=2) pero NO expropia (SPN no es expropiativo)
 * - t=2: P3 arriba (ráfaga=7) tampoco expropia
 * - t=5: P1 termina, ahora ready: [P2(ráfaga=2), P3(ráfaga=7)] → elige P2
 * - t=7: P2 termina, elige P3
 * - t=14: P3 termina
 * 
 * Slices esperados: [P1:0-5, P2:5-7, P3:7-14]
 */

const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [5], estado: 'N' },   // P1: ráfaga mediana, llega primero
  { pid: 2, arribo: 1, rafagasCPU: [2], estado: 'N' },   // P2: ráfaga más corta
  { pid: 3, arribo: 2, rafagasCPU: [7], estado: 'N' }    // P3: ráfaga más larga
];

const costos = { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 0 };

export function testSPNBasic(): void {
  console.log('  Test SPN Básico - P1[5]@0, P2[2]@1, P3[7]@2');
  
  const trace = runSPN(procesos, costos);
  
  // Verificar slices esperados
  console.log('📋 Slices generados:');
  trace.slices.forEach(s => {
    console.log(`  P${s.pid}: ${s.start}→${s.end} (duración: ${s.end - s.start})`);
  });
  
  // Validaciones
  const expectedSlices = [
    { pid: 1, start: 0, end: 5 },     // P1 ejecuta completo (no expropiación)
    { pid: 2, start: 5, end: 7 },     // P2 ejecuta después (ráfaga más corta entre P2 y P3)
    { pid: 3, start: 7, end: 14 }     // P3 ejecuta al final
  ];
  
  let allCorrect = true;
  
  if (trace.slices.length !== expectedSlices.length) {
    console.error(`❌ Número de slices incorrecto. Esperado: ${expectedSlices.length}, obtenido: ${trace.slices.length}`);
    allCorrect = false;
  }
  
  for (let i = 0; i < expectedSlices.length; i++) {
    const expected = expectedSlices[i];
    const actual = trace.slices[i];
    
    if (!actual) {
      console.error(`❌ Slice ${i} faltante`);
      allCorrect = false;
      continue;
    }
    
    if (actual.pid !== expected.pid || actual.start !== expected.start || actual.end !== expected.end) {
      console.error(`❌ Slice ${i} incorrecto:`);
      console.error(`   Esperado: P${expected.pid}: ${expected.start}→${expected.end}`);
      console.error(`   Obtenido: P${actual.pid}: ${actual.start}→${actual.end}`);
      allCorrect = false;
    } else {
      console.log(` Slice ${i}: P${actual.pid}: ${actual.start}→${actual.end}`);
    }
  }
  
  // Verificar que NO hay eventos de expropiación (SPN no expropia)
  const preemptEvents = trace.events.filter(e => e.type === 'C→L');
  console.log(`\n📋 Eventos C→L (expropiaciones): ${preemptEvents.length}`);
  
  if (preemptEvents.length === 0) {
    console.log(' Correcto: SPN no expropia (0 eventos C→L)');
  } else {
    console.error(`❌ SPN no debería expropiar, pero encontró ${preemptEvents.length} eventos C→L:`);
    preemptEvents.forEach(e => {
      console.error(`   P${e.pid} en t=${e.t}`);
    });
    allCorrect = false;
  }
  
  // Verificar orden de dispatch por ráfaga más corta
  const dispatchEvents = trace.events.filter(e => e.type === 'L→C');
  console.log('\n📋 Eventos de dispatch (L→C):');
  dispatchEvents.forEach((e, i) => {
    console.log(`  ${i}: P${e.pid} en t=${e.t}`);
  });
  
  // Deberían ser: P1@0, P2@5, P3@7
  const expectedDispatches = [
    { pid: 1, t: 0 },   // P1 despacha primero (único disponible)
    { pid: 2, t: 5 },   // P2 despacha (ráfaga 2 < ráfaga P3=7)
    { pid: 3, t: 7 }    // P3 despacha último
  ];
  
  if (dispatchEvents.length === expectedDispatches.length) {
    let dispatchesCorrect = true;
    for (let i = 0; i < expectedDispatches.length; i++) {
      const expected = expectedDispatches[i];
      const actual = dispatchEvents[i];
      if (actual.pid !== expected.pid || actual.t !== expected.t) {
        console.error(`❌ Dispatch ${i} incorrecto: esperado P${expected.pid}@${expected.t}, obtenido P${actual.pid}@${actual.t}`);
        dispatchesCorrect = false;
        allCorrect = false;
      }
    }
    if (dispatchesCorrect) {
      console.log(' Orden de dispatches correcto (por ráfaga más corta)');
    }
  } else {
    console.error(`❌ Número de dispatches incorrecto: ${dispatchEvents.length} (esperado: ${expectedDispatches.length})`);
    allCorrect = false;
  }
  
  if (allCorrect) {
    console.log('\n🎉 Test SPN Básico: ¡PASÓ!');
  } else {
    console.log('\n💥 Test SPN Básico: FALLÓ');
  }
}

// Para ejecutar standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  testSPNBasic();
}
