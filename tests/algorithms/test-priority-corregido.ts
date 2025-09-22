#!/usr/bin/env npx tsx

/**
 * Test del algoritmo Priority corregido
 * Valida el comportamiento teórico correcto del algoritmo de prioridades
 */

import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio';
import type { Workload } from '../../src/lib/domain/types';

console.log('🚀 === TESTS DEL ALGORITMO PRIORITY CORREGIDO ===');
console.log('=================================================');

async function testPriorityBasico() {
  console.log('\n🔍 Test Priority: Comportamiento básico por prioridades');
  console.log('========================================================');

  // Procesos con diferentes prioridades que llegan en momentos diferentes
  const workload: Workload = {
    processes: [
      { id: 'BAJA', arribo: 0, rafagasCPU: 1, duracionCPU: 4, duracionIO: 0, prioridad: 10 },
      { id: 'ALTA', arribo: 1, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 90 },
      { id: 'CRITICA', arribo: 2, rafagasCPU: 1, duracionCPU: 1, duracionIO: 0, prioridad: 99 }
    ],
    config: {
      policy: 'PRIORITY',
      tip: 1,
      tfp: 1,
      tcp: 0
    }
  };

  const adaptador = new AdaptadorSimuladorDominio(workload);
  const resultado = adaptador.ejecutar();

  const eventos = resultado.eventosInternos;
  const despachos = eventos.filter(e => e.tipo === 'Despacho');
  const expropriaciones = eventos.filter(e => e.tipo === 'AgotamientoQuantum');

  console.log('📋 Orden de despachos:');
  despachos.forEach((evento, i) => {
    console.log(`  ${i + 1}. ${evento.proceso} en tiempo ${evento.tiempo}`);
  });

  console.log('\n🎯 Verificación de comportamiento Priority:');
  
  // En Priority expropiativo:
  // 1. Debe haber expropiaciones cuando llegan procesos de mayor prioridad
  const tieneExpropiaciones = expropriaciones.length > 0;
  
  // 2. El proceso CRITICA (99) debe ejecutar antes que los otros cuando llega
  const criticaDespacho = despachos.find(d => d.proceso === 'CRITICA');
  const altaDespacho = despachos.find(d => d.proceso === 'ALTA');
  const criticaEjecutoRapido = criticaDespacho && criticaDespacho.tiempo <= 3;
  
  // 3. Los procesos de mayor prioridad deben completarse antes
  const ordenFinalizacion = eventos
    .filter(e => e.tipo === 'FinTFP')
    .map(e => ({ proceso: e.proceso, tiempo: e.tiempo }))
    .sort((a, b) => a.tiempo - b.tiempo);
  
  console.log(`  ✅ Hay expropiaciones: ${tieneExpropiaciones ? 'SÍ' : 'NO'}`);
  console.log(`  ✅ CRITICA ejecutó rápidamente: ${criticaEjecutoRapido ? 'SÍ' : 'NO'}`);
  console.log(`  📋 Orden de finalización: ${ordenFinalizacion.map(o => o.proceso).join(' → ')}`);
  
  return tieneExpropiaciones && criticaEjecutoRapido;
}

async function testPriorityExpropiacion() {
  console.log('\n⚡ Test Priority: Comportamiento expropiativo específico');
  console.log('=========================================================');

  // Test específico: proceso de baja prioridad ejecutando, llega uno de alta
  const workload: Workload = {
    processes: [
      { id: 'LENTO', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 30 },
      { id: 'RAPIDO', arribo: 3, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 80 }
    ],
    config: {
      policy: 'PRIORITY',
      tip: 1,
      tfp: 1,
      tcp: 0
    }
  };

  const adaptador = new AdaptadorSimuladorDominio(workload);
  const resultado = adaptador.ejecutar();

  const eventos = resultado.eventosInternos;
  const expropriaciones = eventos.filter(e => e.tipo === 'AgotamientoQuantum');
  const despachos = eventos.filter(e => e.tipo === 'Despacho');

  console.log('📋 Secuencia de eventos:');
  eventos
    .filter(e => ['Despacho', 'AgotamientoQuantum', 'FinRafagaCPU'].includes(e.tipo))
    .forEach(evento => {
      console.log(`  ${evento.tiempo}: ${evento.proceso} - ${evento.tipo}`);
    });

  // Verificaciones específicas
  const rapidoExpropiaALento = expropriaciones.some(e => 
    e.proceso === 'LENTO' && e.tiempo === 4 // RAPIDO llega en 3, TIP=1, entonces expropia en 4
  );
  
  const rapidoEjecutaPrimero = despachos.find(d => d.proceso === 'RAPIDO')?.tiempo === 4;

  console.log('\n⚡ Verificaciones:');
  console.log(`  ✅ RAPIDO expropia a LENTO: ${rapidoExpropiaALento ? 'SÍ' : 'NO'}`);
  console.log(`  ✅ RAPIDO ejecuta inmediatamente: ${rapidoEjecutaPrimero ? 'SÍ' : 'NO'}`);

  return rapidoExpropiaALento && rapidoEjecutaPrimero;
}

async function testPriorityConEmpates() {
  console.log('\n🤝 Test Priority: Manejo de empates de prioridad');
  console.log('=================================================');

  // Procesos con la misma prioridad - deben seguir FCFS
  const workload: Workload = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 50 },
      { id: 'P2', arribo: 1, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 50 },
      { id: 'P3', arribo: 1, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 50 },
      { id: 'PRIORITARIO', arribo: 2, rafagasCPU: 1, duracionCPU: 1, duracionIO: 0, prioridad: 80 }
    ],
    config: {
      policy: 'PRIORITY',
      tip: 1,
      tfp: 1,
      tcp: 0
    }
  };

  const adaptador = new AdaptadorSimuladorDominio(workload);
  const resultado = adaptador.ejecutar();

  const eventos = resultado.eventosInternos;
  const despachos = eventos.filter(e => e.tipo === 'Despacho');

  console.log('📋 Orden de despachos:');
  despachos.forEach((evento, i) => {
    console.log(`  ${i + 1}. ${evento.proceso} en tiempo ${evento.tiempo}`);
  });

  // El proceso PRIORITARIO debe ejecutar tan pronto como llegue
  const prioritarioDespacho = despachos.find(d => d.proceso === 'PRIORITARIO');
  const prioritarioEjecutaRapido = prioritarioDespacho && prioritarioDespacho.tiempo <= 3;

  console.log('\n🤝 Verificaciones:');
  console.log(`  ✅ PRIORITARIO ejecuta rápidamente: ${prioritarioEjecutaRapido ? 'SÍ' : 'NO'}`);

  return prioritarioEjecutaRapido;
}

async function runAllTests() {
  console.log('🧪 Ejecutando todos los tests de Priority...\n');

  const results = {
    basico: await testPriorityBasico(),
    expropiacion: await testPriorityExpropiacion(), 
    empates: await testPriorityConEmpates()
  };

  console.log('\n📋 === RESUMEN DE TESTS PRIORITY CORREGIDOS ===');
  console.log(`✅ Test básico: ${results.basico ? 'PASÓ' : 'FALLÓ'}`);
  console.log(`✅ Test expropiación: ${results.expropiacion ? 'PASÓ' : 'FALLÓ'}`);
  console.log(`✅ Test empates: ${results.empates ? 'PASÓ' : 'FALLÓ'}`);

  const allPassed = Object.values(results).every(result => result);
  
  console.log(`\n🎯 RESULTADO FINAL: ${allPassed ? '✅ TODOS LOS TESTS PASARON' : '❌ ALGUNOS TESTS FALLARON'}`);
  
  if (!allPassed) {
    process.exit(1);
  }
}

// Ejecutar tests
runAllTests().catch(console.error);