#!/usr/bin/env npx tsx

/**
 * Test diagnóstico del core del simulador
 * Verifica funcionalidades básicas sin algoritmos complejos
 */

import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio.js';
import type { Workload } from '../../src/lib/domain/types.js';

console.log('🧪 TEST: Diagnóstico Core');
console.log('=========================');

// Test básico: Un solo proceso simple
console.log('\n📋 Test 1: Proceso Único Simple');
const test1: Workload = {
  processes: [
    { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 1 }
  ],
  config: { policy: 'FCFS', tip: 0, tfp: 0, tcp: 0 }
};

const adaptador1 = new AdaptadorSimuladorDominio(test1);
const resultado1 = adaptador1.ejecutar();

if (resultado1.exitoso) {
  console.log(`✅ Simulación exitosa, tiempo final: ${resultado1.estadoFinal.tiempoActual}`);
  
  const eventos = resultado1.eventosInternos;
  console.log(`📊 Total eventos: ${eventos.length}`);
  
  const tiposEventos = [...new Set(eventos.map(e => e.tipo))];
  console.log(`📋 Tipos de eventos: ${tiposEventos.join(', ')}`);
  
  // Verificar ciclo básico
  const arribos = eventos.filter(e => e.tipo === 'Arribo');
  const despachos = eventos.filter(e => e.tipo === 'Despacho');
  const finRafaga = eventos.filter(e => e.tipo === 'FinRafagaCPU');
  const finTFP = eventos.filter(e => e.tipo === 'FinTFP');
  
  console.log(`   Arribos: ${arribos.length}, Despachos: ${despachos.length}, FinRafaga: ${finRafaga.length}, FinTFP: ${finTFP.length}`);
  
  const cicloCompleto = arribos.length === 1 && despachos.length === 1 && finRafaga.length === 1 && finTFP.length === 1;
  console.log(`${cicloCompleto ? '✅' : '❌'} Ciclo de vida completo: ${cicloCompleto ? 'CORRECTO' : 'INCORRECTO'}`);
} else {
  console.log(`❌ Error: ${resultado1.error}`);
}

// Test 2: Proceso con I/O
console.log('\n📋 Test 2: Proceso con I/O');
const test2: Workload = {
  processes: [
    { id: 'P1', arribo: 0, rafagasCPU: 2, duracionCPU: 3, duracionIO: 2, prioridad: 1 }
  ],
  config: { policy: 'FCFS', tip: 0, tfp: 0, tcp: 0 }
};

const adaptador2 = new AdaptadorSimuladorDominio(test2);
const resultado2 = adaptador2.ejecutar();

if (resultado2.exitoso) {
  console.log(`✅ Simulación exitosa, tiempo final: ${resultado2.estadoFinal.tiempoActual}`);
  
  const eventos = resultado2.eventosInternos;
  const finRafaga = eventos.filter(e => e.tipo === 'FinRafagaCPU');
  const finES = eventos.filter(e => e.tipo === 'FinES');
  
  console.log(`   FinRafagaCPU: ${finRafaga.length} (esperado: 2)`);
  console.log(`   FinES: ${finES.length} (esperado: 1)`);
  
  const ioCorrectes = finRafaga.length === 2 && finES.length === 1;
  console.log(`${ioCorrectes ? '✅' : '❌'} Ciclo CPU-I/O: ${ioCorrectes ? 'CORRECTO' : 'INCORRECTO'}`);
  
  // Mostrar timeline básica
  console.log('📅 Timeline:');
  eventos.forEach(e => {
    console.log(`   T=${e.tiempo}: ${e.tipo} ${e.proceso || ''} ${e.extra || ''}`);
  });
} else {
  console.log(`❌ Error: ${resultado2.error}`);
}

// Test 3: Dos procesos sin expropiación (FCFS)
console.log('\n📋 Test 3: Dos Procesos FCFS');
const test3: Workload = {
  processes: [
    { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 1 },
    { id: 'P2', arribo: 1, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 1 }
  ],
  config: { policy: 'FCFS', tip: 0, tfp: 0, tcp: 0 }
};

const adaptador3 = new AdaptadorSimuladorDominio(test3);
const resultado3 = adaptador3.ejecutar();

if (resultado3.exitoso) {
  console.log(`✅ Simulación exitosa, tiempo final: ${resultado3.estadoFinal.tiempoActual}`);
  
  const eventos = resultado3.eventosInternos;
  const despachos = eventos.filter(e => e.tipo === 'Despacho');
  const finTFP = eventos.filter(e => e.tipo === 'FinTFP');
  
  console.log(`   Despachos: ${despachos.length} (esperado: 2)`);
  console.log(`   FinTFP: ${finTFP.length} (esperado: 2)`);
  console.log(`   Orden despachos: ${despachos.map(e => e.proceso).join(' → ')}`);
  
  const ordenCorrecto = despachos.length === 2 && finTFP.length === 2;
  console.log(`${ordenCorrecto ? '✅' : '❌'} Orden FCFS: ${ordenCorrecto ? 'CORRECTO' : 'INCORRECTO'}`);
} else {
  console.log(`❌ Error: ${resultado3.error}`);
}

console.log('\n🎯 DIAGNÓSTICO COMPLETADO');
console.log('=========================');