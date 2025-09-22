#!/usr/bin/env npx tsx

/**
 * Test específico para investigar problemas con expropiaciones en SRTN
 */

import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio.js';
import type { Workload } from '../../src/lib/domain/types.js';

console.log('🧪 TEST: Investigación Expropiaciones SRTN');
console.log('==========================================');

// Test minimal: proceso largo + proceso corto que debe expropiar
console.log('\n📋 Test: Expropiación Básica');
const test: Workload = {
  processes: [
    { id: 'LARGO', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 1 },
    { id: 'CORTO', arribo: 2, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 1 }
  ],
  config: { policy: 'SRTN', tip: 0, tfp: 0, tcp: 0 }
};

console.log('📊 Setup:');
console.log('  - LARGO: arribo=0, CPU=10 (tiempo restante total=10)');
console.log('  - CORTO: arribo=2, CPU=3 (tiempo restante total=3)');
console.log('  - En t=2, LARGO tiene 8 restante, CORTO tiene 3 → debe expropiar');

const adaptador = new AdaptadorSimuladorDominio(test);
const resultado = adaptador.ejecutar();

if (!resultado.exitoso) {
  console.log(`❌ Error: ${resultado.error}`);
} else {
  console.log(`✅ Simulación exitosa, tiempo final: ${resultado.estadoFinal.tiempoActual}`);
  
  console.log('\n📅 Timeline completa:');
  resultado.eventosInternos.forEach(e => {
    console.log(`   T=${e.tiempo}: ${e.tipo.padEnd(15)} ${(e.proceso || '').padEnd(6)} ${e.extra || ''}`);
  });
  
  console.log('\n🔍 Análisis de eventos clave:');
  
  const arribos = resultado.eventosInternos.filter(e => e.tipo === 'Arribo');
  const despachos = resultado.eventosInternos.filter(e => e.tipo === 'Despacho'); 
  const expropiaciones = resultado.eventosInternos.filter(e => e.tipo === 'AgotamientoQuantum');
  const finRafagas = resultado.eventosInternos.filter(e => e.tipo === 'FinRafagaCPU');
  const finTFPs = resultado.eventosInternos.filter(e => e.tipo === 'FinTFP');
  
  console.log(`📊 Arribos: ${arribos.length} (esperado: 2)`);
  console.log(`📊 Despachos: ${despachos.length} (esperado: 3 - inicial LARGO, CORTO tras expropiación, LARGO reanuda)`);
  console.log(`📊 Expropiaciones: ${expropiaciones.length} (esperado: 1)`);
  console.log(`📊 FinRafagaCPU: ${finRafagas.length} (esperado: 2)`);
  console.log(`📊 FinTFP: ${finTFPs.length} (esperado: 2)`);
  
  if (despachos.length > 0) {
    console.log(`📋 Orden de despachos: ${despachos.map(e => `${e.proceso}@T${e.tiempo}`).join(' → ')}`);
  }
  
  if (expropiaciones.length > 0) {
    console.log(`⏰ Expropiaciones: ${expropiaciones.map(e => `${e.proceso}@T${e.tiempo}`).join(', ')}`);
  }
  
  // Verificaciones específicas
  console.log('\n✅ Verificaciones:');
  
  const largoEmpezoPrimero = despachos.length > 0 && despachos[0].proceso === 'LARGO' && despachos[0].tiempo === 0;
  console.log(`${largoEmpezoPrimero ? '✅' : '❌'} LARGO empezó primero en T=0`);
  
  const huboExpropiacion = expropiaciones.length > 0 && expropiaciones[0].tiempo === 2;
  console.log(`${huboExpropiacion ? '✅' : '❌'} Expropiación en T=2 cuando llega CORTO`);
  
  const cortoEjecutoTrasExpropiar = despachos.some(d => d.proceso === 'CORTO' && d.tiempo >= 2);
  console.log(`${cortoEjecutoTrasExpropiar ? '✅' : '❌'} CORTO ejecutó después de expropiar`);
  
  const ambosTerminaron = finTFPs.length === 2;
  console.log(`${ambosTerminaron ? '✅' : '❌'} Ambos procesos terminaron`);
  
  // Tiempo esperado: CORTO ejecuta 3, LARGO ejecuta 10 = 13 total
  const tiempoEsperado = 13;
  const tiempoCorrecto = resultado.estadoFinal.tiempoActual === tiempoEsperado;
  console.log(`${tiempoCorrecto ? '✅' : '❌'} Tiempo final correcto: ${resultado.estadoFinal.tiempoActual} (esperado: ${tiempoEsperado})`);
}

console.log('\n🎯 INVESTIGACIÓN COMPLETADA');
console.log('============================');