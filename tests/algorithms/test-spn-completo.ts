/**
 * Test para verificar SPN (Shortest Process Next) - No Expropiativo
 */

import { MotorSimulacion } from '../../src/lib/core/engine';
import type { Workload } from '../../src/lib/domain/types';

console.log('🧪 Test SPN (Shortest Process Next) - No Expropiativo');
console.log('====================================================');

// Test 1: Selección por duración de ráfaga más corta
console.log('\n📋 Test 1: Selección por Ráfaga Más Corta');
const test1: Workload = {
  processes: [
    { name: 'Largo_10', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 10, duracionRafagaES: 0, prioridad: 1 },
    { name: 'Corto_3', tiempoArribo: 1, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 0, prioridad: 1 },
    { name: 'Medio_6', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 6, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'SPN', tip: 0, tfp: 1, tcp: 1 }
};

const motor1 = new MotorSimulacion(test1);
const resultado1 = motor1.ejecutar();

console.log('🔍 Eventos de despacho:');
const despachos1 = resultado1.eventosInternos.filter(e => e.tipo === 'Despacho');
despachos1.forEach((d, i) => {
  console.log(`  ${i + 1}. ${d.tiempo}: Despacho - ${d.proceso}`);
});

const ordenEjecucion1 = despachos1.map(e => e.proceso);
// Debería ejecutar Largo_10 primero (llegó antes), luego cuando Corto_3 llegue, espera, 
// y cuando Largo_10 termine, ejecuta Corto_3 (más corto que Medio_6)
const ordenEsperado1 = ['Largo_10', 'Corto_3', 'Medio_6'];
const ordenCorrecto1 = JSON.stringify(ordenEjecucion1) === JSON.stringify(ordenEsperado1);

console.log(`✅ Selección por ráfaga más corta: ${ordenCorrecto1 ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Real: [${ordenEjecucion1.join(', ')}]`);
console.log(`   Esperado: [${ordenEsperado1.join(', ')}]`);

// Test 2: SPN es no expropiativo
console.log('\n📋 Test 2: SPN No Expropiativo');
const test2: Workload = {
  processes: [
    { name: 'Primero_8', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 8, duracionRafagaES: 0, prioridad: 1 },
    { name: 'MasCorto_2', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'SPN', tip: 0, tfp: 1, tcp: 1 }
};

const motor2 = new MotorSimulacion(test2);
const resultado2 = motor2.ejecutar();

console.log('🔍 Eventos relevantes:');
const eventosRelevantes2 = resultado2.eventosInternos.filter(e => 
  e.tipo === 'Despacho' || e.tipo === 'FinRafagaCPU' || e.tipo === 'Arribo'
);
eventosRelevantes2.forEach(e => {
  console.log(`  ${e.tiempo}: ${e.tipo} - ${e.proceso || 'N/A'}`);
});

const despachos2 = resultado2.eventosInternos.filter(e => e.tipo === 'Despacho');
const noExpropiativo = despachos2.length === 2; // Solo 2 despachos, no hay expropiación

console.log(`✅ No expropiativo: ${noExpropiativo ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Despachos totales: ${despachos2.length} (debería ser 2)`);

// Test 3: Tie-break alfabético para ráfagas de igual duración
console.log('\n📋 Test 3: Tie-break Alfabético');
const test3: Workload = {
  processes: [
    { name: 'Z_Last', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 1 },
    { name: 'A_First', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 1 },
    { name: 'M_Middle', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'SPN', tip: 0, tfp: 1, tcp: 1 }
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

// Test 4: SPN con diferentes duraciones y llegadas escalonadas
console.log('\n📋 Test 4: Llegadas Escalonadas con Diferentes Duraciones');
const test4: Workload = {
  processes: [
    { name: 'P1_12', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 12, duracionRafagaES: 0, prioridad: 1 },
    { name: 'P2_4', tiempoArribo: 3, rafagasCPU: 1, duracionRafagaCPU: 4, duracionRafagaES: 0, prioridad: 1 },
    { name: 'P3_8', tiempoArribo: 6, rafagasCPU: 1, duracionRafagaCPU: 8, duracionRafagaES: 0, prioridad: 1 },
    { name: 'P4_2', tiempoArribo: 9, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'SPN', tip: 0, tfp: 1, tcp: 1 }
};

const motor4 = new MotorSimulacion(test4);
const resultado4 = motor4.ejecutar();

console.log('🔍 Eventos de despacho:');
const despachos4 = resultado4.eventosInternos.filter(e => e.tipo === 'Despacho');
despachos4.forEach((d, i) => {
  console.log(`  ${i + 1}. ${d.tiempo}: Despacho - ${d.proceso}`);
});

const ordenEjecucion4 = despachos4.map(e => e.proceso);
// P1_12 ejecuta primero hasta completarse, luego selecciona por SPN: P4_2 (2) < P2_4 (4) < P3_8 (8)
const ordenEsperado4 = ['P1_12', 'P4_2', 'P2_4', 'P3_8'];
const ordenEscalonadoCorrecto = JSON.stringify(ordenEjecucion4) === JSON.stringify(ordenEsperado4);

console.log(`✅ Llegadas escalonadas: ${ordenEscalonadoCorrecto ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Real: [${ordenEjecucion4.join(', ')}]`);
console.log(`   Esperado: [${ordenEsperado4.join(', ')}]`);

console.log('\n🎯 RESUMEN SPN (Shortest Process Next)');
console.log('======================================');
console.log(`Selección por ráfaga más corta: ${ordenCorrecto1 ? '✅ PASA' : '❌ FALLA'}`);
console.log(`No expropiativo: ${noExpropiativo ? '✅ PASA' : '❌ FALLA'}`);
console.log(`Tie-break alfabético: ${tieBreakCorrecto ? '✅ PASA' : '❌ FALLA'}`);
console.log(`Llegadas escalonadas: ${ordenEscalonadoCorrecto ? '✅ PASA' : '❌ FALLA'}`);

const todosPasan = ordenCorrecto1 && noExpropiativo && tieBreakCorrecto && ordenEscalonadoCorrecto;
console.log(`\n🏁 SPN SCHEDULER: ${todosPasan ? '🎉 TODOS LOS TESTS PASAN' : '⚠️ ALGUNOS TESTS FALLAN'}`);

if (!todosPasan) {
  console.log('\n⚠️  PROBLEMA DETECTADO: Revisar implementación de SPN');
  console.log('   - Verificar selección por duración de ráfaga más corta');
  console.log('   - Confirmar que es no expropiativo');
  console.log('   - Validar tie-break alfabético');
}
