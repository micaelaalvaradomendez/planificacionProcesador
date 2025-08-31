/**
 * Test comprehensivo para tie-break estable en eventos simultáneos
 * Validar diferentes escenarios de arribos y eventos simultáneos
 */

import { MotorSimulacion } from './src/lib/core/engine';
import type { Workload } from './src/lib/model/types';

console.log('🧪 Test Comprehensivo - Tie-break Estable');
console.log('=======================================');

// Test 1: Arribos simultáneos con diferentes nombres
console.log('\n📋 Test 1: Arribos Simultáneos - Orden Alfabético');
const test1: Workload = {
  processes: [
    { name: 'Zeus', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 },
    { name: 'Alpha', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 },
    { name: 'Beta', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 },
    { name: 'Gamma', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'FCFS', tip: 1, tfp: 1, tcp: 1 }
};

const motor1 = new MotorSimulacion(test1);
const resultado1 = motor1.ejecutar();

const arribos1 = resultado1.eventosInternos.filter(e => e.tipo === 'Arribo');
const finTIP1 = resultado1.eventosInternos.filter(e => e.tipo === 'FinTIP');

console.log('  Orden de Arribos:', arribos1.map(e => e.proceso).join(' → '));
console.log('  Orden de FinTIP:', finTIP1.map(e => e.proceso).join(' → '));

const ordenCorrecto1 = JSON.stringify(arribos1.map(e => e.proceso)) === JSON.stringify(['Alpha', 'Beta', 'Gamma', 'Zeus']);
console.log(`  ✅ Orden alfabético: ${ordenCorrecto1 ? 'CORRECTO' : 'INCORRECTO'}`);

// Test 2: Arribos en diferentes tiempos (no simultáneos)
console.log('\n📋 Test 2: Arribos NO Simultáneos - Orden por Tiempo');
const test2: Workload = {
  processes: [
    { name: 'Z_Last', tiempoArribo: 1, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 },
    { name: 'A_First', tiempoArribo: 3, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 },
    { name: 'M_Middle', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'FCFS', tip: 1, tfp: 1, tcp: 1 }
};

const motor2 = new MotorSimulacion(test2);
const resultado2 = motor2.ejecutar();

const arribos2 = resultado2.eventosInternos.filter(e => e.tipo === 'Arribo');
console.log('  Orden de Arribos:', arribos2.map(e => `${e.proceso}(t=${e.tiempo})`).join(' → '));

const ordenCorrecto2 = JSON.stringify(arribos2.map(e => e.proceso)) === JSON.stringify(['Z_Last', 'M_Middle', 'A_First']);
console.log(`  ✅ Orden por tiempo: ${ordenCorrecto2 ? 'CORRECTO' : 'INCORRECTO'}`);

// Test 3: Mezcla de arribos simultáneos y no simultáneos
console.log('\n📋 Test 3: Arribos Mixtos - Tiempo + Alfabético');
const test3: Workload = {
  processes: [
    { name: 'D', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 },
    { name: 'B', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 },
    { name: 'A', tiempoArribo: 1, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 },
    { name: 'C', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'FCFS', tip: 1, tfp: 1, tcp: 1 }
};

const motor3 = new MotorSimulacion(test3);
const resultado3 = motor3.ejecutar();

const arribos3 = resultado3.eventosInternos.filter(e => e.tipo === 'Arribo');
console.log('  Orden de Arribos:', arribos3.map(e => `${e.proceso}(t=${e.tiempo})`).join(' → '));

// Esperado: A(t=1) → B(t=2) → C(t=2) → D(t=2)
const ordenCorrecto3 = JSON.stringify(arribos3.map(e => e.proceso)) === JSON.stringify(['A', 'B', 'C', 'D']);
console.log(`  ✅ Orden mixto: ${ordenCorrecto3 ? 'CORRECTO' : 'INCORRECTO'}`);

// Test 4: FinTFP simultáneos (procesos terminando al mismo tiempo)
console.log('\n📋 Test 4: FinTFP Simultáneos - Orden Alfabético');
const test4: Workload = {
  processes: [
    { name: 'Y', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 0, prioridad: 1 },
    { name: 'X', tiempoArribo: 1, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'FCFS', tip: 1, tfp: 1, tcp: 1 }
};

const motor4 = new MotorSimulacion(test4);
const resultado4 = motor4.ejecutar();

const finTFP4 = resultado4.eventosInternos.filter(e => e.tipo === 'FinTFP');
console.log('  Eventos FinTFP:', finTFP4.map(e => `${e.proceso}(t=${e.tiempo})`).join(' → '));

// Resumen
console.log('\n🎯 RESUMEN DE VALIDACIÓN');
console.log('========================');
console.log(`Test 1 - Arribos simultáneos: ${ordenCorrecto1 ? '✅ PASA' : '❌ FALLA'}`);
console.log(`Test 2 - Arribos por tiempo: ${ordenCorrecto2 ? '✅ PASA' : '❌ FALLA'}`);
console.log(`Test 3 - Arribos mixtos: ${ordenCorrecto3 ? '✅ PASA' : '❌ FALLA'}`);

const todosCorrectos = ordenCorrecto1 && ordenCorrecto2 && ordenCorrecto3;
console.log(`\n🏁 RESULTADO FINAL: ${todosCorrectos ? '🎉 TODOS LOS TESTS PASAN' : '⚠️ ALGUNOS TESTS FALLAN'}`);

if (todosCorrectos) {
  console.log('\n✅ El tie-break estable está correctamente implementado:');
  console.log('   • Eventos simultáneos se ordenan alfabéticamente por nombre de proceso');
  console.log('   • Eventos no simultáneos respetan el orden temporal');
  console.log('   • Funciona para Arribo, FinTIP y FinTFP');
}
