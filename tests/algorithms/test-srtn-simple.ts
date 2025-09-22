#!/usr/bin/env npx tsx

/**
 * Test de validación para el algoritmo SRTN (Shortest Remaining Time Next)
 * Verifica comportamiento expropiativo basado en tiempo restante
 */

import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio.js';
import type { Workload } from '../../src/lib/domain/types.js';

console.log('🧪 TEST: Algoritmo SRTN');
console.log('=======================');

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

// Test 1: SRTN debe expropiar cuando llega proceso con menos tiempo restante
const test1: Workload = {
  processes: [
    { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 1 }, // Largo
    { id: 'P2', arribo: 2, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 1 }   // Corto
  ],
  config: { policy: 'SRTN', tip: 0, tfp: 0, tcp: 0 } // Sin overhead para simplificar
};

const resultado1 = ejecutarTest('SRTN Expropiación por Tiempo Restante', test1);
if (resultado1) {
  const despachos = resultado1.eventosInternos.filter(e => e.tipo === 'Despacho');
  const expropiaciones = resultado1.eventosInternos.filter(e => e.tipo === 'AgotamientoQuantum');
  
  console.log(`  Despachos: ${despachos.length}, Expropiaciones: ${expropiaciones.length}`);
  console.log(`  Orden de despachos: ${despachos.map(e => e.proceso).join(' → ')}`);
  
  // SRTN debe expropiar P1 cuando llega P2 (tiempo restante menor)
  const huboExpropiacion = expropiaciones.length > 0;
  const P2EjecutoPrimero = despachos.length >= 2 && despachos[1].proceso === 'P2';
  
  console.log(`  ${huboExpropiacion ? '✅' : '❌'} Expropiación detectada: ${huboExpropiacion ? 'SÍ' : 'NO'}`);
  console.log(`  ${P2EjecutoPrimero ? '✅' : '❌'} P2 ejecutó después de expropiar: ${P2EjecutoPrimero ? 'SÍ' : 'NO'}`);
}

// Test 2: SRTN con múltiples ráfagas - debe reevaluar tiempo restante total
const test2: Workload = {
  processes: [
    { id: 'P1', arribo: 0, rafagasCPU: 3, duracionCPU: 4, duracionIO: 2, prioridad: 1 }, // Total: 12 CPU
    { id: 'P2', arribo: 1, rafagasCPU: 2, duracionCPU: 5, duracionIO: 1, prioridad: 1 }  // Total: 10 CPU
  ],
  config: { policy: 'SRTN', tip: 0, tfp: 0, tcp: 0 }
};

const resultado2 = ejecutarTest('SRTN Multi-ráfaga', test2);
if (resultado2) {
  const finRafagaCPU = resultado2.eventosInternos.filter(e => e.tipo === 'FinRafagaCPU');
  const finES = resultado2.eventosInternos.filter(e => e.tipo === 'FinES');
  const expropiaciones = resultado2.eventosInternos.filter(e => e.tipo === 'AgotamientoQuantum');
  
  console.log(`  P1 ráfagas CPU: ${finRafagaCPU.filter(e => e.proceso === 'P1').length} (esperado: 3)`);
  console.log(`  P2 ráfagas CPU: ${finRafagaCPU.filter(e => e.proceso === 'P2').length} (esperado: 2)`);
  console.log(`  Total expropiaciones: ${expropiaciones.length}`);
  
  const P1Completo = finRafagaCPU.filter(e => e.proceso === 'P1').length === 3;
  const P2Completo = finRafagaCPU.filter(e => e.proceso === 'P2').length === 2;
  
  console.log(`  ${P1Completo ? '✅' : '❌'} P1 completó todas sus ráfagas: ${P1Completo ? 'SÍ' : 'NO'}`);
  console.log(`  ${P2Completo ? '✅' : '❌'} P2 completó todas sus ráfagas: ${P2Completo ? 'SÍ' : 'NO'}`);
}

// Test 3: SRTN debe reevaluar tras I/O
const test3: Workload = {
  processes: [
    { id: 'P1', arribo: 0, rafagasCPU: 2, duracionCPU: 6, duracionIO: 3, prioridad: 1 }, // 6 + 6 = 12 total
    { id: 'P2', arribo: 2, rafagasCPU: 1, duracionCPU: 8, duracionIO: 0, prioridad: 1 }  // 8 total (menor)
  ],
  config: { policy: 'SRTN', tip: 0, tfp: 0, tcp: 0 }
};

const resultado3 = ejecutarTest('SRTN Reevaluación tras I/O', test3);
if (resultado3) {
  const eventos = resultado3.eventosInternos;
  const expropiaciones = eventos.filter(e => e.tipo === 'AgotamientoQuantum');
  const finES = eventos.filter(e => e.tipo === 'FinES');
  
  console.log(`  Expropiaciones: ${expropiaciones.length}`);
  console.log(`  Fines de I/O: ${finES.length}`);
  
  // Debe haber al menos una expropiación cuando P2 llega y otra posible cuando P1 regresa de I/O
  const huboExpropiaciones = expropiaciones.length > 0;
  console.log(`  ${huboExpropiaciones ? '✅' : '❌'} SRTN reevaluó correctamente: ${huboExpropiaciones ? 'SÍ' : 'NO'}`);
}

console.log('\n🎯 TEST SRTN COMPLETADO');
console.log('=======================');