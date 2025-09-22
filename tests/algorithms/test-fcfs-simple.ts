#!/usr/bin/env npx tsx

/**
 * Test de validación para el algoritmo FCFS
 * Verifica comportamiento no expropiativo y manejo de empates
 */

import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio.js';
import type { Workload } from '../../src/lib/domain/types.js';

console.log('🧪 TEST: Algoritmo FCFS');
console.log('======================');

// Función helper para ejecutar test
function ejecutarTest(nombre: string, workload: Workload) {
  console.log(`\n📋 ${nombre}`);
  const adaptador = new AdaptadorSimuladorDominio(workload);
  const resultado = adaptador.ejecutar();
  
  if (!resultado.exitoso) {
    console.log(`❌ Error en simulación: ${resultado.error}`);
    return null;
  }
  
  return resultado;
}

// Test 1: FCFS no debe expropiar (proceso corto llega después de proceso largo iniciado)
const test1: Workload = {
  processes: [
    { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 1 },
    { id: 'P2', arribo: 2, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 5 }
  ],
  config: { policy: 'FCFS', tip: 0, tfp: 0, tcp: 0 } // Sin overhead para simplificar
};

const resultado1 = ejecutarTest('FCFS No Expropiativo', test1);
if (resultado1) {
  const despachos = resultado1.eventosInternos.filter(e => e.tipo === 'Despacho');
  const ordenEjecucion = despachos.map(e => e.proceso);
  
  console.log(`  Orden de ejecución: ${ordenEjecucion.join(' → ')}`);
  const correcto = ordenEjecucion.length === 2 && ordenEjecucion[0] === 'P1' && ordenEjecucion[1] === 'P2';
  console.log(`  ${correcto ? '✅' : '❌'} FCFS no expropiativo: ${correcto ? 'CORRECTO' : 'INCORRECTO'}`);
}

// Test 2: Empates por tiempo de arribo - debe usar orden alfabético (FCFS tiebreak)
const test2: Workload = {
  processes: [
    { id: 'C', arribo: 0, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 1 },
    { id: 'A', arribo: 0, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 1 },
    { id: 'B', arribo: 0, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 1 }
  ],
  config: { policy: 'FCFS', tip: 0, tfp: 0, tcp: 0 }
};

const resultado2 = ejecutarTest('FCFS Empates por Arribo', test2);
if (resultado2) {
  const despachos = resultado2.eventosInternos.filter(e => e.tipo === 'Despacho');
  const ordenEjecucion = despachos.map(e => e.proceso);
  
  console.log(`  Orden de ejecución: ${ordenEjecucion.join(' → ')}`);
  const ordenEsperado = ['A', 'B', 'C'];
  const correcto = JSON.stringify(ordenEjecucion) === JSON.stringify(ordenEsperado);
  console.log(`  ${correcto ? '✅' : '❌'} Tiebreak alfabético: ${correcto ? 'CORRECTO' : 'INCORRECTO'}`);
  if (!correcto) {
    console.log(`     Esperado: ${ordenEsperado.join(' → ')}`);
  }
}

// Test 3: Proceso con múltiples ráfagas debe completar todas
const test3: Workload = {
  processes: [
    { id: 'P1', arribo: 0, rafagasCPU: 3, duracionCPU: 2, duracionIO: 1, prioridad: 1 }
  ],
  config: { policy: 'FCFS', tip: 0, tfp: 0, tcp: 0 }
};

const resultado3 = ejecutarTest('FCFS Multi-ráfaga', test3);
if (resultado3) {
  const finRafagaCPU = resultado3.eventosInternos.filter(e => e.tipo === 'FinRafagaCPU');
  const finES = resultado3.eventosInternos.filter(e => e.tipo === 'FinES');
  
  console.log(`  Ráfagas CPU ejecutadas: ${finRafagaCPU.length} (esperado: 3)`);
  console.log(`  Operaciones I/O: ${finES.length} (esperado: 2)`);
  
  const correcto = finRafagaCPU.length === 3 && finES.length === 2;
  console.log(`  ${correcto ? '✅' : '❌'} Multi-ráfaga completo: ${correcto ? 'CORRECTO' : 'INCORRECTO'}`);
}

console.log('\n🎯 TEST FCFS COMPLETADO');
console.log('======================');