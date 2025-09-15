/**
 * Test para verificar Priority Scheduler con expropiación
 */

import { MotorSimulacion } from '../../src/lib/core/engine';
import type { Workload } from '../../src/lib/domain/types';

console.log('🧪 Test Priority Scheduler - Expropiativo con Tie-breaks');
console.log('======================================================');

// Test 1: Expropiación básica - proceso de alta prioridad expropía a uno de baja
console.log('\n📋 Test 1: Expropiación Básica');
const test1: Workload = {
  processes: [
    { name: 'Baja_P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 10, duracionRafagaES: 0, prioridad: 1 }, // Baja prioridad, largo
    { name: 'Alta_P5', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 0, prioridad: 5 }   // Alta prioridad, corto
  ],
  config: { policy: 'PRIORITY', tip: 0, tfp: 1, tcp: 1 }
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

// Verificar que Alta_P5 expropie a Baja_P1
const despachos1 = resultado1.eventosInternos.filter(e => e.tipo === 'Despacho');
console.log(`  Despachos: ${despachos1.length}`);
const ordenEjecucion1 = despachos1.map(e => e.proceso);
const hayExpropiacion = ordenEjecucion1.includes('Alta_P5') && ordenEjecucion1.includes('Baja_P1') && despachos1.length >= 3;

console.log(`✅ Expropiación por prioridad: ${hayExpropiacion ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Orden de despachos: ${ordenEjecucion1.join(' → ')}`);

// Test 2: Tie-break alfabético - procesos con misma prioridad se ordenan alfabéticamente
console.log('\n📋 Test 2: Tie-break Alfabético en Misma Prioridad');
const test2: Workload = {
  processes: [
    { name: 'Z_Last', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 3 },
    { name: 'A_First', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 3 },
    { name: 'M_Middle', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 3 }
  ],
  config: { policy: 'PRIORITY', tip: 0, tfp: 1, tcp: 1 }
};

const motor2 = new MotorSimulacion(test2);
const resultado2 = motor2.ejecutar();

console.log('🔍 Eventos de despacho:');
const despachos2 = resultado2.eventosInternos.filter(e => e.tipo === 'Despacho');
despachos2.forEach((d, i) => {
  console.log(`  ${i + 1}. ${d.tiempo}: Despacho - ${d.proceso}`);
});

const ordenEjecucion2 = despachos2.map(e => e.proceso);
const ordenEsperado2 = ['A_First', 'M_Middle', 'Z_Last'];
const tieBreakCorrecto = JSON.stringify(ordenEjecucion2) === JSON.stringify(ordenEsperado2);

console.log(`✅ Tie-break alfabético: ${tieBreakCorrecto ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Real: [${ordenEjecucion2.join(', ')}]`);
console.log(`   Esperado: [${ordenEsperado2.join(', ')}]`);

// Test 3: Múltiples niveles de prioridad con expropiación
console.log('\n📋 Test 3: Múltiples Niveles de Prioridad');
const test3: Workload = {
  processes: [
    { name: 'P1_Low', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 8, duracionRafagaES: 0, prioridad: 1 },  // Prioridad baja
    { name: 'P2_Med', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 4, duracionRafagaES: 0, prioridad: 3 },  // Prioridad media
    { name: 'P3_High', tiempoArribo: 4, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 5 }  // Prioridad alta
  ],
  config: { policy: 'PRIORITY', tip: 0, tfp: 1, tcp: 1 }
};

const motor3 = new MotorSimulacion(test3);
const resultado3 = motor3.ejecutar();

console.log('🔍 Eventos de despacho:');
const despachos3 = resultado3.eventosInternos.filter(e => e.tipo === 'Despacho');
despachos3.forEach((d, i) => {
  console.log(`  ${i + 1}. ${d.tiempo}: Despacho - ${d.proceso}`);
});

const ordenEjecucion3 = despachos3.map(e => e.proceso);
// Debería ser: P1_Low → P2_Med (expropía a P1) → P3_High (expropía a P2) → P2_Med (continúa) → P1_Low (continúa)
const tieneExpropiacionesMultiples = despachos3.length >= 5; // Múltiples despachos por expropiaciones

console.log(`✅ Expropiación multinivel: ${tieneExpropiacionesMultiples ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Orden completo: ${ordenEjecucion3.join(' → ')}`);

// Test 4: Proceso de máxima prioridad (100) no es expropiado
console.log('\n📋 Test 4: Prioridad Máxima (100) No Expropiativa');
const test4: Workload = {
  processes: [
    { name: 'MaxPri_100', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 6, duracionRafagaES: 0, prioridad: 100 }, // Prioridad máxima
    { name: 'High_99', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 99 }     // Prioridad alta
  ],
  config: { policy: 'PRIORITY', tip: 0, tfp: 1, tcp: 1 }
};

const motor4 = new MotorSimulacion(test4);
const resultado4 = motor4.ejecutar();

const despachos4 = resultado4.eventosInternos.filter(e => e.tipo === 'Despacho');
const finTFP4 = resultado4.eventosInternos.filter(e => e.tipo === 'FinTFP');
console.log(`  Despachos totales: ${despachos4.length}, FinTFP: ${finTFP4.length}`);

const maxPriEjecutaCompleto = despachos4.length === 2 && finTFP4.length === 2; // Solo 2 despachos, MaxPri_100 no es expropiado

console.log(`✅ Prioridad máxima no expropiativa: ${maxPriEjecutaCompleto ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Despachos: ${despachos4.map(e => e.proceso).join(' → ')}`);

console.log('\n🎯 RESUMEN PRIORITY SCHEDULER');
console.log('==============================');
console.log(`Expropiación básica: ${hayExpropiacion ? '✅ PASA' : '❌ FALLA'}`);
console.log(`Tie-break alfabético: ${tieBreakCorrecto ? '✅ PASA' : '❌ FALLA'}`);
console.log(`Expropiación multinivel: ${tieneExpropiacionesMultiples ? '✅ PASA' : '❌ FALLA'}`);
console.log(`Prioridad máxima protegida: ${maxPriEjecutaCompleto ? '✅ PASA' : '❌ FALLA'}`);

const todosPasan = hayExpropiacion && tieBreakCorrecto && tieneExpropiacionesMultiples && maxPriEjecutaCompleto;
console.log(`\n🏁 PRIORITY SCHEDULER: ${todosPasan ? '🎉 TODOS LOS TESTS PASAN' : '⚠️ ALGUNOS TESTS FALLAN'}`);

if (!todosPasan) {
  console.log('\n⚠️  PROBLEMA DETECTADO: Revisar implementación de expropiación por prioridad');
}
