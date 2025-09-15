/**
 * Test para verificar SRTN (Shortest Remaining Time Next) - Expropiativo
 */

import { MotorSimulacion } from '../../src/lib/core/engine';
import type { Workload } from '../../src/lib/domain/types';

console.log('🧪 Test SRTN (Shortest Remaining Time Next) - Expropiativo');
console.log('==========================================================');

// Test 1: Expropiación básica - proceso corto expropía a uno largo
console.log('\n📋 Test 1: Expropiación Básica');
const test1: Workload = {
  processes: [
    { name: 'Largo_10', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 10, duracionRafagaES: 0, prioridad: 1 },
    { name: 'Corto_3', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'SRTN', tip: 0, tfp: 1, tcp: 1 }
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

const despachos1 = resultado1.eventosInternos.filter(e => e.tipo === 'Despacho');
const hayExpropiacion = despachos1.length >= 3; // Al menos: Largo → Corto → Largo (reanuda)

console.log(`✅ Expropiación por tiempo restante: ${hayExpropiacion ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Despachos: ${despachos1.map(e => e.proceso).join(' → ')}`);
console.log(`   Total despachos: ${despachos1.length} (debería ser >= 3)`);

// Test 2: Múltiples expropiaciones por tiempo restante
console.log('\n📋 Test 2: Múltiples Expropiaciones');
const test2: Workload = {
  processes: [
    { name: 'P1_8', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 8, duracionRafagaES: 0, prioridad: 1 },
    { name: 'P2_4', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 4, duracionRafagaES: 0, prioridad: 1 },
    { name: 'P3_2', tiempoArribo: 4, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'SRTN', tip: 0, tfp: 1, tcp: 1 }
};

const motor2 = new MotorSimulacion(test2);
const resultado2 = motor2.ejecutar();

console.log('🔍 Eventos de despacho:');
const despachos2 = resultado2.eventosInternos.filter(e => e.tipo === 'Despacho');
despachos2.forEach((d, i) => {
  console.log(`  ${i + 1}. ${d.tiempo}: Despacho - ${d.proceso}`);
});

const ordenEjecucion2 = despachos2.map(e => e.proceso);
// Debería ser: P1_8 → P2_4 (expropía, 4 < 6) → P3_2 (expropía, 2 < 4) → P2_4 (continúa) → P1_8 (continúa)
const tieneMultiplesExpropiaciones = despachos2.length >= 5;

console.log(`✅ Múltiples expropiaciones: ${tieneMultiplesExpropiaciones ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Orden: ${ordenEjecucion2.join(' → ')}`);

// Test 3: Tie-break alfabético para mismo tiempo restante
console.log('\n📋 Test 3: Tie-break Alfabético');
const test3: Workload = {
  processes: [
    { name: 'Z_Last', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 1 },
    { name: 'A_First', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 1 },
    { name: 'M_Middle', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'SRTN', tip: 0, tfp: 1, tcp: 1 }
};

const motor3 = new MotorSimulacion(test3);
const resultado3 = motor3.ejecutar();

console.log('🔍 Eventos de despacho:');
const despachos3 = resultado3.eventosInternos.filter(e => e.tipo === 'Despacho');
despachos3.forEach((d, i) => {
  console.log(`  ${i + 1}. ${d.tiempo}: Despacho - ${d.proceso}`);
});

const ordenEjecucion3 = despachos3.map(e => e.proceso);
const ordenEsperado3 = ['A_First', 'M_Middle', 'Z_Last'];
const tieBreakCorrecto = JSON.stringify(ordenEjecucion3) === JSON.stringify(ordenEsperado3);

console.log(`✅ Tie-break alfabético: ${tieBreakCorrecto ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Real: [${ordenEjecucion3.join(', ')}]`);
console.log(`   Esperado: [${ordenEsperado3.join(', ')}]`);

// Test 4: SRTN no expropía si tiempo restante es mayor o igual
console.log('\n📋 Test 4: No Expropiación Innecesaria');
const test4: Workload = {
  processes: [
    { name: 'Corto_3', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 0, prioridad: 1 },
    { name: 'Igual_3', tiempoArribo: 1, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 0, prioridad: 1 },
    { name: 'Largo_5', tiempoArribo: 1, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'SRTN', tip: 0, tfp: 1, tcp: 1 }
};

const motor4 = new MotorSimulacion(test4);
const resultado4 = motor4.ejecutar();

const despachos4 = resultado4.eventosInternos.filter(e => e.tipo === 'Despacho');
console.log(`  Despachos totales: ${despachos4.length}`);
console.log(`  Orden: ${despachos4.map(e => e.proceso).join(' → ')}`);

// Corto_3 debe ejecutar completamente (no hay proceso con menor tiempo restante)
// Luego debe ejecutar Igual_3 antes que Largo_5
const noExpropiacionInnecesaria = despachos4.length === 3; // Solo los 3 despachos iniciales

console.log(`✅ No expropiación innecesaria: ${noExpropiacionInnecesaria ? 'CORRECTO' : 'INCORRECTO'}`);

// Test 5: Proceso interrumpido conserva tiempo restante correcto
console.log('\n📋 Test 5: Conservación de Tiempo Restante');
const test5: Workload = {
  processes: [
    { name: 'Base_6', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 6, duracionRafagaES: 0, prioridad: 1 },
    { name: 'Intrup_2', tiempoArribo: 3, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'SRTN', tip: 0, tfp: 1, tcp: 1 }
};

const motor5 = new MotorSimulacion(test5);
const resultado5 = motor5.ejecutar();

console.log('🔍 Análisis detallado:');
const eventos5 = resultado5.eventosInternos.filter(e => 
  e.tipo === 'Despacho' || e.tipo === 'FinRafagaCPU'
);
eventos5.forEach(e => {
  console.log(`  ${e.tiempo}: ${e.tipo} - ${e.proceso}`);
});

const despachos5 = resultado5.eventosInternos.filter(e => e.tipo === 'Despacho');
const finRafaga5 = resultado5.eventosInternos.filter(e => e.tipo === 'FinRafagaCPU');

// Base_6 ejecuta 3 unidades (t=0 a t=3), luego Intrup_2 expropía y ejecuta 2 unidades,
// luego Base_6 continúa con 3 unidades restantes
const conservaTiempo = despachos5.length === 3 && finRafaga5.length === 2;

console.log(`✅ Conservación tiempo restante: ${conservaTiempo ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Despachos: ${despachos5.length}, FinRafaga: ${finRafaga5.length}`);

console.log('\n🎯 RESUMEN SRTN (Shortest Remaining Time Next)');
console.log('===============================================');
console.log(`Expropiación básica: ${hayExpropiacion ? '✅ PASA' : '❌ FALLA'}`);
console.log(`Múltiples expropiaciones: ${tieneMultiplesExpropiaciones ? '✅ PASA' : '❌ FALLA'}`);
console.log(`Tie-break alfabético: ${tieBreakCorrecto ? '✅ PASA' : '❌ FALLA'}`);
console.log(`No expropiación innecesaria: ${noExpropiacionInnecesaria ? '✅ PASA' : '❌ FALLA'}`);
console.log(`Conservación tiempo restante: ${conservaTiempo ? '✅ PASA' : '❌ FALLA'}`);

const todosPasan = hayExpropiacion && tieneMultiplesExpropiaciones && tieBreakCorrecto && 
                   noExpropiacionInnecesaria && conservaTiempo;
console.log(`\n🏁 SRTN SCHEDULER: ${todosPasan ? '🎉 TODOS LOS TESTS PASAN' : '⚠️ ALGUNOS TESTS FALLAN'}`);

if (!todosPasan) {
  console.log('\n⚠️  PROBLEMA DETECTADO: Revisar implementación de SRTN');
  console.log('   - Verificar expropiación por tiempo restante');
  console.log('   - Confirmar cálculo correcto de tiempo restante');
  console.log('   - Validar tie-break alfabético');
  console.log('   - Comprobar conservación de estado en expropiaciones');
}
