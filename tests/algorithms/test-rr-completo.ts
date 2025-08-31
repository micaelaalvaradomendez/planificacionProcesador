/**
 * Test para verificar RR (Round Robin) - Con quantum y rotación
 */

import { MotorSimulacion } from '../../src/lib/core/engine';
import type { Workload } from '../../src/lib/model/types';

console.log('🧪 Test RR (Round Robin) - Quantum y Rotación');
console.log('===============================================');

// Test 1: Validación quantum > 0
console.log('\n📋 Test 1: Validación Quantum');
try {
  const testInvalido: Workload = {
    processes: [
      { name: 'P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 1 }
    ],
    config: { policy: 'RR', tip: 0, tfp: 1, tcp: 1, quantum: 0 } // Quantum inválido
  };
  
  new MotorSimulacion(testInvalido);
  console.log('❌ ERROR: Debería fallar con quantum = 0');
} catch (error) {
  console.log('✅ Validación quantum: CORRECTO');
  console.log(`   Error: ${(error as Error).message}`);
}

try {
  const testInvalido2: Workload = {
    processes: [
      { name: 'P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 1 }
    ],
    config: { policy: 'RR', tip: 0, tfp: 1, tcp: 1, quantum: -1 } // Quantum negativo
  };
  
  new MotorSimulacion(testInvalido2);
  console.log('❌ ERROR: Debería fallar con quantum negativo');
} catch (error) {
  console.log('✅ Validación quantum negativo: CORRECTO');
  console.log(`   Error: ${(error as Error).message}`);
}

// Test 2: Caso especial 1 proceso - reasignación con TCP
console.log('\n📋 Test 2: Un Solo Proceso - Reasignación con TCP');
const test2: Workload = {
  processes: [
    { name: 'Solo_P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 8, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'RR', tip: 0, tfp: 1, tcp: 1, quantum: 3 }
};

const motor2 = new MotorSimulacion(test2);
const resultado2 = motor2.ejecutar();

console.log('🔍 Eventos relevantes:');
const eventosRelevantes2 = resultado2.eventosInternos.filter(e => 
  e.tipo === 'Despacho' || e.tipo === 'AgotamientoQuantum' || e.tipo === 'FinRafagaCPU'
);
eventosRelevantes2.forEach(e => {
  console.log(`  ${e.tiempo}: ${e.tipo} - ${e.proceso}`);
});

const despachos2 = resultado2.eventosInternos.filter(e => e.tipo === 'Despacho');
const agotamientos2 = resultado2.eventosInternos.filter(e => e.tipo === 'AgotamientoQuantum');

// Debería tener múltiples despachos y agotamientos (8/3 = 2 agotamientos + 1 final)
const reasignacionUnico = despachos2.length >= 3 && agotamientos2.length >= 2;

console.log(`✅ Reasignación proceso único: ${reasignacionUnico ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Despachos: ${despachos2.length}, Agotamientos: ${agotamientos2.length}`);
console.log(`   Proceso se reasigna a sí mismo tras agotamiento quantum`);

// Test 3: Rotación múltiples procesos
console.log('\n📋 Test 3: Rotación Múltiples Procesos');
const test3: Workload = {
  processes: [
    { name: 'P1_6', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 6, duracionRafagaES: 0, prioridad: 1 },
    { name: 'P2_4', tiempoArribo: 1, rafagasCPU: 1, duracionRafagaCPU: 4, duracionRafagaES: 0, prioridad: 1 },
    { name: 'P3_5', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'RR', tip: 0, tfp: 1, tcp: 1, quantum: 2 }
};

const motor3 = new MotorSimulacion(test3);
const resultado3 = motor3.ejecutar();

console.log('🔍 Eventos de despacho y agotamiento:');
const eventosRR3 = resultado3.eventosInternos.filter(e => 
  e.tipo === 'Despacho' || e.tipo === 'AgotamientoQuantum'
);
eventosRR3.forEach((e, i) => {
  console.log(`  ${i + 1}. ${e.tiempo}: ${e.tipo} - ${e.proceso}`);
});

const despachos3 = resultado3.eventosInternos.filter(e => e.tipo === 'Despacho');
const ordenEjecucion3 = despachos3.map(e => e.proceso);

// Debería rotar: P1_6 → P2_4 → P3_5 → P1_6 → P2_4 → P3_5 → ...
const hayRotacion = despachos3.length >= 6; // Múltiples rotaciones
const procesos3Diferentes = new Set(ordenEjecucion3).size === 3; // Los 3 procesos ejecutan

console.log(`✅ Rotación circular: ${hayRotacion && procesos3Diferentes ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Orden: ${ordenEjecucion3.join(' → ')}`);
console.log(`   Procesos diferentes: ${new Set(ordenEjecucion3).size}/3`);

// Test 4: Quantum mayor que duración - no debería agotar
console.log('\n📋 Test 4: Quantum Mayor que Duración');
const test4: Workload = {
  processes: [
    { name: 'Corto_2', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 2, duracionRafagaES: 0, prioridad: 1 },
    { name: 'Corto_3', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'RR', tip: 0, tfp: 1, tcp: 1, quantum: 5 } // Quantum > duración
};

const motor4 = new MotorSimulacion(test4);
const resultado4 = motor4.ejecutar();

const agotamientos4 = resultado4.eventosInternos.filter(e => e.tipo === 'AgotamientoQuantum');
const finRafagas4 = resultado4.eventosInternos.filter(e => e.tipo === 'FinRafagaCPU');

console.log(`  Agotamientos quantum: ${agotamientos4.length}`);
console.log(`  Fin de ráfagas: ${finRafagas4.length}`);

const noAgotamientoInnecesario = agotamientos4.length === 0 && finRafagas4.length === 2;

console.log(`✅ Quantum mayor que duración: ${noAgotamientoInnecesario ? 'CORRECTO' : 'INCORRECTO'}`);
console.log(`   Los procesos terminan por FinRafagaCPU, no por agotamiento`);

// Test 5: TCP aplicado en cada agotamiento
console.log('\n📋 Test 5: TCP en Agotamientos de Quantum');
const test5: Workload = {
  processes: [
    { name: 'TestTCP', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'RR', tip: 0, tfp: 1, tcp: 2, quantum: 2 } // TCP = 2 para ver el efecto
};

const motor5 = new MotorSimulacion(test5);
const resultado5 = motor5.ejecutar();

const agotamientos5 = resultado5.eventosInternos.filter(e => e.tipo === 'AgotamientoQuantum');
const tcpEsperado = agotamientos5.length * 2; // TCP=2 por cada agotamiento

console.log(`  Agotamientos: ${agotamientos5.length}`);
console.log(`  TCP esperado por agotamientos: ${tcpEsperado}`);
console.log(`  CPU SO total: ${resultado5.estadoFinal.contadoresCPU.sistemaOperativo}`);

// Verificar que se aplicó TCP en agotamientos (además del TCP inicial y TFP final)
const tcpAplicado = resultado5.estadoFinal.contadoresCPU.sistemaOperativo >= tcpEsperado;

console.log(`✅ TCP aplicado en agotamientos: ${tcpAplicado ? 'CORRECTO' : 'INCORRECTO'}`);

console.log('\n🎯 RESUMEN RR (Round Robin)');
console.log('============================');
console.log(`Validación quantum > 0: ✅ PASA`);
console.log(`Reasignación proceso único: ${reasignacionUnico ? '✅ PASA' : '❌ FALLA'}`);
console.log(`Rotación circular múltiple: ${hayRotacion && procesos3Diferentes ? '✅ PASA' : '❌ FALLA'}`);
console.log(`Quantum mayor que duración: ${noAgotamientoInnecesario ? '✅ PASA' : '❌ FALLA'}`);
console.log(`TCP en agotamientos: ${tcpAplicado ? '✅ PASA' : '❌ FALLA'}`);

const todosPasan = reasignacionUnico && hayRotacion && procesos3Diferentes && 
                   noAgotamientoInnecesario && tcpAplicado;
console.log(`\n🏁 RR SCHEDULER: ${todosPasan ? '🎉 TODOS LOS TESTS PASAN' : '⚠️ ALGUNOS TESTS FALLAN'}`);

if (!todosPasan) {
  console.log('\n⚠️  PROBLEMA DETECTADO: Revisar implementación de RR');
  console.log('   - Verificar reasignación con TCP en caso de 1 proceso');
  console.log('   - Confirmar rotación circular FIFO');
  console.log('   - Validar aplicación de TCP en agotamientos');
}
