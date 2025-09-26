// src/lib/test/test-srtn-gate.ts

import { runSRTN } from '../engine/engine';
import type { Proceso } from '../model/proceso';

/**
 * Test Gate SRTN clásico: P1 arr=0[8], P2 arr=2[3]
 * Esperado: [P1:0-2, P2:2-5, P1:5-11] con costos=0
 * 
 * Lógica:
 * - t=0: P1 arriba, comienza ejecución
 * - t=2: P2 arriba con ráfaga=3, P1 llevaba 2 ejecutados → restante(P1)=6
 *        Como restante(P2)=3 < restante(P1)=6 → EXPROPIACIÓN
 * - P1 se desaloja, P2 toma CPU
 * - t=5: P2 termina, P1 retoma con restante=6
 * - t=11: P1 termina (5+6=11)
 */

const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [8], estado: 'N' },    // P1: llega en 0, ráfaga única de 8
  { pid: 2, arribo: 2, rafagasCPU: [3], estado: 'N' }     // P2: llega en 2, ráfaga única de 3
];

const costos = { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 0 };

export function testSRTNGate(): void {
  console.log('🧪 Test SRTN Gate - P1[8]@0, P2[3]@2');
  
  const trace = runSRTN(procesos, costos);
  
  // Verificar slices esperados
  console.log('📋 Slices generados:');
  trace.slices.forEach(s => {
    console.log(`  P${s.pid}: ${s.start}→${s.end} (duración: ${s.end - s.start})`);
  });
  
  // Validaciones
  const expectedSlices = [
    { pid: 1, start: 0, end: 2 },    // P1 ejecuta 2ms antes de ser expropriado
    { pid: 2, start: 2, end: 5 },    // P2 ejecuta su ráfaga completa (3ms)
    { pid: 1, start: 5, end: 11 }    // P1 retoma y ejecuta los 6ms restantes
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
      console.log(`✅ Slice ${i}: P${actual.pid}: ${actual.start}→${actual.end}`);
    }
  }
  
  // Verificar eventos clave
  console.log('\n📋 Eventos de expropiación:');
  const preemptEvents = trace.events.filter(e => e.type === 'C→L');
  console.log(`  Eventos C→L encontrados: ${preemptEvents.length}`);
  
  if (preemptEvents.length === 1) {
    const preempt = preemptEvents[0];
    if (preempt.t === 2 && preempt.pid === 1) {
      console.log(`✅ Expropiación correcta: P1 en t=2`);
    } else {
      console.error(`❌ Expropiación incorrecta: P${preempt.pid} en t=${preempt.t} (esperado: P1 en t=2)`);
      allCorrect = false;
    }
  } else {
    console.error(`❌ Número de expropiaciones incorrecto: ${preemptEvents.length} (esperado: 1)`);
    allCorrect = false;
  }
  
  if (allCorrect) {
    console.log('\n🎉 Test SRTN Gate: ¡PASÓ!');
  } else {
    console.log('\n💥 Test SRTN Gate: FALLÓ');
  }
}

// Para ejecutar standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  testSRTNGate();
}
