/**
 * Test para verificar FCFS no expropiativo y manejo correcto de empates
 */

import { MotorSimulacion } from '../../src/lib/core/engine';
import type { Workload } from '../../src/lib/domain/types';

console.log('🧪 Test FCFS - No Expropiativo y Empates');
console.log('=====================================');

// Test 1: FCFS no debe expropiar cuando llega un proceso de mayor prioridad
console.log('\n📋 Test 1: FCFS No Expropiativo');
const test1: Workload = {
  processes: [
    { name: 'P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 10, duracionRafagaES: 0, prioridad: 1 }, // Baja prioridad, largo
    { name: 'P2', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 0, prioridad: 5 }   // Alta prioridad, corto
  ],
  config: { policy: 'FCFS', tip: 1, tfp: 1, tcp: 1 }
};

const motor1 = new MotorSimulacion(test1);
const resultado1 = motor1.ejecutar();

console.log('🔍 Eventos relevantes:');
const eventosRelevantes1 = resultado1.eventosInternos.filter(e => 
  e.tipo === 'Despacho' || e.tipo === 'FinRafagaCPU' || e.tipo === 'Arribo' || e.tipo === 'FinTFP'
);
eventosRelevantes1.forEach(e => {
  console.log(`  ${e.tiempo}: ${e.tipo} - ${e.proceso || 'N/A'}`);
});

// Verificar que P1 se ejecute completamente antes que P2 (no expropiativo)
const despachos1 = resultado1.eventosInternos.filter(e => e.tipo === 'Despacho');
const finTFP1 = resultado1.eventosInternos.filter(e => e.tipo === 'FinTFP');
console.log(`  Despachos: ${despachos1.length}, FinTFP: ${finTFP1.length}`);
const ordenEjecucion1 = despachos1.map(e => e.proceso);
const noExpropiativo = ordenEjecucion1.length === 2 && ordenEjecucion1[0] === 'P1' && ordenEjecucion1[1] === 'P2';

console.log(`✅ FCFS no expropiativo: ${noExpropiativo ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Orden de ejecución: ${ordenEjecucion1.join(' → ')}`);

// Test 2: Empates en tiempo de arribo - debe respetar orden alfabético
console.log('\n📋 Test 2: FCFS Empates por Tiempo de Arribo');
const test2: Workload = {
  processes: [
    { name: 'Z_Last', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 },
    { name: 'A_First', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 },
    { name: 'M_Middle', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'FCFS', tip: 1, tfp: 1, tcp: 1 }
};

const motor2 = new MotorSimulacion(test2);
const resultado2 = motor2.ejecutar();

console.log('🔍 Eventos de despacho:');
const despachos2 = resultado2.eventosInternos.filter(e => e.tipo === 'Despacho');
despachos2.forEach((e, i) => {
  console.log(`  ${i+1}. ${e.tiempo}: Despacho - ${e.proceso}`);
});

const ordenEjecucion2 = despachos2.map(e => e.proceso);
const ordenEsperado2 = ['A_First', 'M_Middle', 'Z_Last'];
const empatesCorrectos = JSON.stringify(ordenEjecucion2) === JSON.stringify(ordenEsperado2);

console.log(`✅ Empates por nombre: ${empatesCorrectos ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Real: [${ordenEjecucion2.join(', ')}]`);
console.log(`   Esperado: [${ordenEsperado2.join(', ')}]`);

// Test 3: Verificar que FCFS respeta orden temporal estricto
console.log('\n📋 Test 3: FCFS Orden Temporal Estricto');
const test3: Workload = {
  processes: [
    { name: 'Segundo', tiempoArribo: 5, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 },
    { name: 'Primero', tiempoArribo: 3, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 },
    { name: 'Tercero', tiempoArribo: 7, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'FCFS', tip: 1, tfp: 1, tcp: 1 }
};

const motor3 = new MotorSimulacion(test3);
const resultado3 = motor3.ejecutar();

const despachos3 = resultado3.eventosInternos.filter(e => e.tipo === 'Despacho');
const ordenEjecucion3 = despachos3.map(e => e.proceso);
const ordenEsperado3 = ['Primero', 'Segundo', 'Tercero'];
const ordenTemporal = JSON.stringify(ordenEjecucion3) === JSON.stringify(ordenEsperado3);

console.log(`✅ Orden temporal: ${ordenTemporal ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Real: [${ordenEjecucion3.join(', ')}]`);
console.log(`   Esperado: [${ordenEsperado3.join(', ')}]`);

// Resumen
console.log('\n🎯 RESUMEN FCFS');
console.log('================');
console.log(`No expropiativo: ${noExpropiativo ? '✅ PASA' : '❌ FALLA'}`);
console.log(`Empates alfabéticos: ${empatesCorrectos ? '✅ PASA' : '❌ FALLA'}`);
console.log(`Orden temporal: ${ordenTemporal ? '✅ PASA' : '❌ FALLA'}`);

const fcfsCompleto = noExpropiativo && empatesCorrectos && ordenTemporal;
console.log(`\n🏁 FCFS COMPLETO: ${fcfsCompleto ? '🎉 TODOS LOS TESTS PASAN' : '⚠️ ALGUNOS TESTS FALLAN'}`);

if (!empatesCorrectos) {
  console.log('\n⚠️  PROBLEMA DETECTADO: Los empates en FCFS no se resuelven alfabéticamente');
  console.log('   Necesita implementar tie-break por nombre en seleccionarProceso()');
}
