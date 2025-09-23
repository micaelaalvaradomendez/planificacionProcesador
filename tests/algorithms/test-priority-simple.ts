/**
 * Test: Algoritmo de Planificación por Prioridades
 * 
 * Verifica que el algoritmo de prioridades seleccione correctamente procesos
 * según su prioridad externa (valor numérico más alto = mayor prioridad).
 * 
 * Características del algoritmo Priority:
 * - Puede ser expropiativo o no expropiativo (configurable)
 * - Selecciona proceso con mayor prioridad (valor numérico más alto)
 * - Permite dar preferencia a procesos críticos del sistema
 * - Riesgo de inanición (starvation) para procesos de baja prioridad
 */

import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio.js';
import type { Workload } from '../../src/lib/domain/types.js';

async function testPrioridadBasico() {
  console.log('\n🔍 Test Priority: Comportamiento básico por prioridades');
  console.log('=====================================================');

  // Workload con prioridades diferentes (mayor número = mayor prioridad)
  const workload: Workload = {
    processes: [
      { id: 'BAJA', arribo: 0, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 10 },
      { id: 'ALTA', arribo: 1, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 90 },
      { id: 'MEDIA', arribo: 1, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 50 },
      { id: 'CRITICA', arribo: 2, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 99 }
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

  // Verificar orden de ejecución según prioridades
  const eventos = resultado.eventosInternos;
  const despachos = eventos.filter(e => e.tipo === 'Despacho');

  console.log('📋 Orden de despacho de procesos:');
  despachos.forEach((evento, i) => {
    const procesoInfo = workload.processes.find(p => p.id === evento.proceso);
    console.log(`  ${i+1}. ${evento.proceso} (prioridad: ${procesoInfo?.prioridad}) en tiempo ${evento.tiempo}`);
  });

  // Orden esperado: BAJA (primero disponible), luego CRITICA (99), ALTA (90), MEDIA (50)
  const ordenEsperado = ['BAJA', 'CRITICA', 'ALTA', 'MEDIA'];
  const ordenActual = despachos.map(e => e.proceso);
  
  const ordenCorrecto = JSON.stringify(ordenActual) === JSON.stringify(ordenEsperado);
  
  console.log('\n🎯 Verificación de comportamiento Priority:');
  console.log(`  Orden esperado: ${ordenEsperado.join(' → ')}`);
  console.log(`  Orden actual:   ${ordenActual.join(' → ')}`);
  console.log(`  ✅ Orden por prioridad correcto: ${ordenCorrecto ? 'SÍ' : 'NO'}`);

  return ordenCorrecto;
}

async function testPrioridadExpropiativo() {
  console.log('\n⚡ Test Priority: Comportamiento expropiativo');
  console.log('============================================');

  // Test de expropiación: proceso de alta prioridad interrumpe a uno de baja
  const workload: Workload = {
    processes: [
      { id: 'LENTO_BAJA', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 20 },
      { id: 'RAPIDO_ALTA', arribo: 3, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 80 }
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
  
  // Buscar eventos de expropiación
  const expropriaciones = eventos.filter(e => e.tipo === 'AgotamientoQuantum');
  const despachos = eventos.filter(e => e.tipo === 'Despacho');

  console.log('📋 Secuencia de eventos relevantes:');
  
  const eventosRelevantes = eventos.filter(e => 
    ['Despacho', 'AgotamientoQuantum', 'FinRafagaCPU'].includes(e.tipo)
  );
  
  eventosRelevantes.forEach(evento => {
    console.log(`  ${evento.tiempo}: ${evento.proceso} - ${evento.tipo} (${evento.extra || ''})`);
  });

  // Debe haber expropiación cuando llega RAPIDO_ALTA
  const hayExpropiacion = expropriaciones.length > 0;
  
  // RAPIDO_ALTA debe ejecutar antes que LENTO_BAJA termine
  const despachoRapidoAlta = despachos.find(d => d.proceso === 'RAPIDO_ALTA');
  const expropiacionOcurre = despachoRapidoAlta && despachoRapidoAlta.tiempo < 12; // Antes de que termine LENTO_BAJA
  
  console.log('\n⚡ Verificación de expropiación:');
  console.log(`  ✅ Hay eventos de expropiación: ${hayExpropiacion ? 'SÍ' : 'NO'} (${expropriaciones.length})`);
  console.log(`  ✅ RAPIDO_ALTA expropia correctamente: ${expropiacionOcurre ? 'SÍ' : 'NO'}`);

  return hayExpropiacion && expropiacionOcurre;
}

async function testPrioridadEmpates() {
  console.log('\n🤝 Test Priority: Manejo de empates de prioridad');
  console.log('===============================================');

  // Procesos con la misma prioridad deben manejarse por FCFS
  const workload: Workload = {
    processes: [
      { id: 'PRIMERO', arribo: 0, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 50 },
      { id: 'SEGUNDO', arribo: 1, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 50 },
      { id: 'TERCERO', arribo: 1, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 50 },
      { id: 'PRIORITARIO', arribo: 2, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 80 }
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

  const despachos = resultado.eventosInternos.filter(e => e.tipo === 'Despacho');

  console.log('📋 Orden de despacho:');
  despachos.forEach((evento, i) => {
    const procesoInfo = workload.processes.find(p => p.id === evento.proceso);
    console.log(`  ${i+1}. ${evento.proceso} (prioridad: ${procesoInfo?.prioridad}) en tiempo ${evento.tiempo}`);
  });

  const ordenActual = despachos.map(e => e.proceso);
  
  // PRIMERO debe ejecutar primero, luego PRIORITARIO (cuando llega), luego SEGUNDO y TERCERO por FCFS
  const ordenEsperado = ['PRIMERO', 'PRIORITARIO', 'SEGUNDO', 'TERCERO'];
  const ordenCorrecto = JSON.stringify(ordenActual) === JSON.stringify(ordenEsperado);
  
  console.log('\n🤝 Verificación de empates:');
  console.log(`  Orden esperado: ${ordenEsperado.join(' → ')}`);
  console.log(`  Orden actual:   ${ordenActual.join(' → ')}`);
  console.log(`  ✅ Empates manejados por FCFS: ${ordenCorrecto ? 'SÍ' : 'NO'}`);

  return ordenCorrecto;
}

async function testPrioridadInversion() {
  console.log('\n🔄 Test Priority: Comparación con FCFS');
  console.log('=====================================');

  // Mismos procesos, diferentes órdenes según algoritmo
  const processes = [
    { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 30 },
    { id: 'P2', arribo: 1, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 70 },
    { id: 'P3', arribo: 1, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 50 }
  ];

  const configBase = { tip: 0, tfp: 0, tcp: 0 };

  // Test con FCFS
  const workloadFCFS: Workload = {
    processes,
    config: { ...configBase, policy: 'FCFS' }
  };

  const adaptadorFCFS = new AdaptadorSimuladorDominio(workloadFCFS);
  const resultadoFCFS = adaptadorFCFS.ejecutar();

  // Test con Priority
  const workloadPriority: Workload = {
    processes,
    config: { ...configBase, policy: 'PRIORITY' }
  };

  const adaptadorPriority = new AdaptadorSimuladorDominio(workloadPriority);
  const resultadoPriority = adaptadorPriority.ejecutar();

  const despachosFCFS = resultadoFCFS.eventosInternos.filter(e => e.tipo === 'Despacho').map(e => e.proceso);
  const despachosPriority = resultadoPriority.eventosInternos.filter(e => e.tipo === 'Despacho').map(e => e.proceso);

  console.log('\n🔄 Comparación de órdenes:');
  console.log(`  FCFS:     ${despachosFCFS.join(' → ')}`);
  console.log(`  Priority: ${despachosPriority.join(' → ')}`);

  // Los órdenes deben ser diferentes (Priority reordena por prioridad)
  const ordenDiferente = JSON.stringify(despachosFCFS) !== JSON.stringify(despachosPriority);
  
  // Priority debe poner P2 (prioridad 70) antes que P3 (prioridad 50)
  const p2AntesQueP3 = despachosPriority.indexOf('P2') < despachosPriority.indexOf('P3');
  
  console.log(`  ✅ Órdenes diferentes: ${ordenDiferente ? 'SÍ' : 'NO'}`);
  console.log(`  ✅ Priority reordena correctamente: ${p2AntesQueP3 ? 'SÍ' : 'NO'}`);

  return ordenDiferente && p2AntesQueP3;
}

// Ejecutar todos los tests de Priority
async function ejecutarTestsPriority() {
  console.log('🚀 === TESTS DEL ALGORITMO PRIORITY ===');
  console.log('======================================');
  
  const resultados = [
    await testPrioridadBasico(),
    await testPrioridadExpropiativo(),
    await testPrioridadEmpates(),
    await testPrioridadInversion()
  ];
  
  const todosExitosos = resultados.every(r => r);
  
  console.log('\n📋 === RESUMEN DE TESTS PRIORITY ===');
  console.log(`✅ Test básico: ${resultados[0] ? 'PASÓ' : 'FALLÓ'}`);
  console.log(`✅ Test expropiativo: ${resultados[1] ? 'PASÓ' : 'FALLÓ'}`);
  console.log(`✅ Test empates: ${resultados[2] ? 'PASÓ' : 'FALLÓ'}`);
  console.log(`✅ Test comparación: ${resultados[3] ? 'PASÓ' : 'FALLÓ'}`);
  console.log(`\n🎯 RESULTADO FINAL: ${todosExitosos ? '✅ TODOS LOS TESTS PASARON' : '❌ ALGUNOS TESTS FALLARON'}`);
  
  if (todosExitosos) {
    console.log('\n🎉 El algoritmo Priority funciona correctamente según la teoría:');
    console.log('   ✅ Selecciona procesos por mayor prioridad');
    console.log('   ✅ Soporta expropiación cuando llegan procesos de mayor prioridad');
    console.log('   ✅ Maneja empates con FCFS (orden de llegada)');
    console.log('   ✅ Produce resultados diferentes a FCFS según prioridades');
  } else {
    console.log('\n💥 Se encontraron problemas en el algoritmo Priority');
  }
  
  return todosExitosos;
}

// Ejecutar tests
ejecutarTestsPriority()
  .then(exitoso => {
    process.exit(exitoso ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Error en tests Priority:', error);
    process.exit(1);
  });