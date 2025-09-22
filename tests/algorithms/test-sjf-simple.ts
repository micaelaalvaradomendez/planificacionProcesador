/**
 * Test: Algoritmo SJF/SPN (Shortest Job First / Shortest Process Next)
 * 
 * Verifica que el algoritmo SJF seleccione correctamente procesos
 * según el criterio de menor tiempo de ráfaga de CPU.
 * 
 * Características de SJF:
 * - No expropiativo
 * - Selecciona proceso con menor duración de ráfaga de CPU
 * - Minimiza tiempo promedio de retorno
 * - Puede causar inanición de procesos largos
 */

import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio.js';
import type { Workload } from '../../src/lib/domain/types.js';

async function testSJFBasico() {
  console.log('\n🔍 Test SJF: Comportamiento básico no expropiativo');
  console.log('=================================================');

  // Workload diseñado para demostrar ventaja de SJF
  const workload: Workload = {
    processes: [
      { id: 'LARGO', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 1 },
      { id: 'CORTO1', arribo: 1, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 1 },
      { id: 'CORTO2', arribo: 1, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 1 },
      { id: 'MEDIO', arribo: 1, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 1 }
    ],
    config: {
      policy: 'SPN',  // SPN es SJF en el sistema
      tip: 1,
      tfp: 1,
      tcp: 0
    }
  };

  const adaptador = new AdaptadorSimuladorDominio(workload);
  const resultado = adaptador.ejecutar();

  // Verificar orden de ejecución esperado en SJF
  const eventos = resultado.eventosInternos;
  const despachos = eventos.filter(e => e.tipo === 'Despacho');

  console.log('📋 Orden de despacho de procesos:');
  despachos.forEach((evento, i) => {
    console.log(`  ${i+1}. ${evento.proceso} en tiempo ${evento.tiempo}`);
  });

  // En SJF, después de LARGO (que llega primero), deben ejecutarse en orden:
  // CORTO2 (2), CORTO1 (3), MEDIO (5), por duración de CPU
  
  const ordenEsperado = ['LARGO', 'CORTO2', 'CORTO1', 'MEDIO'];
  const ordenActual = despachos.map(e => e.proceso);
  
  const ordenCorrecto = JSON.stringify(ordenActual) === JSON.stringify(ordenEsperado);
  
  console.log('\n🎯 Verificación de comportamiento SJF:');
  console.log(`  Orden esperado: ${ordenEsperado.join(' → ')}`);
  console.log(`  Orden actual:   ${ordenActual.join(' → ')}`);
  console.log(`  ✅ Orden correcto: ${ordenCorrecto ? 'SÍ' : 'NO'}`);

  // Verificar que es no expropiativo (no debe haber eventos de expropiación)
  const expropriaciones = eventos.filter(e => e.tipo === 'AgotamientoQuantum');
  const noExpropiativo = expropriaciones.length === 0;
  
  console.log(`  ✅ No expropiativo: ${noExpropiativo ? 'SÍ' : 'NO'} (${expropriaciones.length} expropriaciones)`);

  return ordenCorrecto && noExpropiativo;
}

async function testSJFTiemposOptimos() {
  console.log('\n📊 Test SJF: Optimización de tiempos de retorno');
  console.log('==============================================');

  // Comparar SJF vs FCFS con los mismos datos
  const processes = [
    { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 8, duracionIO: 0, prioridad: 1 },
    { id: 'P2', arribo: 1, rafagasCPU: 1, duracionCPU: 4, duracionIO: 0, prioridad: 1 },
    { id: 'P3', arribo: 2, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 1 }
  ];

  const configBase = { tip: 0, tfp: 0, tcp: 0 }; // Sin overhead para cálculo puro

  // Test con FCFS
  const workloadFCFS: Workload = {
    processes,
    config: { ...configBase, policy: 'FCFS' }
  };

  const adaptadorFCFS = new AdaptadorSimuladorDominio(workloadFCFS);
  const resultadoFCFS = adaptadorFCFS.ejecutar();

  // Test con SJF
  const workloadSJF: Workload = {
    processes,
    config: { ...configBase, policy: 'SPN' }
  };

  const adaptadorSJF = new AdaptadorSimuladorDominio(workloadSJF);
  const resultadoSJF = adaptadorSJF.ejecutar();

  // Calcular métricas usando MetricsCalculator
  const { MetricsCalculator } = await import('../../src/lib/domain/services/MetricsCalculator.js');
  
  const metricasFCFS = MetricsCalculator.calcularMetricasCompletas(resultadoFCFS.estadoFinal);
  const metricasSJF = MetricsCalculator.calcularMetricasCompletas(resultadoSJF.estadoFinal);

  console.log('\n📈 Comparación de métricas:');
  console.log(`  FCFS - Tiempo medio retorno: ${metricasFCFS.tanda.tiempoMedioRetorno}`);
  console.log(`  SJF  - Tiempo medio retorno: ${metricasSJF.tanda.tiempoMedioRetorno}`);
  
  // SJF debe tener menor tiempo medio de retorno (es óptimo)
  const sjfOptimo = metricasSJF.tanda.tiempoMedioRetorno <= metricasFCFS.tanda.tiempoMedioRetorno;
  
  console.log(`  ✅ SJF mejor que FCFS: ${sjfOptimo ? 'SÍ' : 'NO'}`);
  
  // Mostrar detalle de procesos en SJF
  console.log('\n👥 Detalle SJF - tiempo de retorno por proceso:');
  metricasSJF.porProceso.forEach(p => {
    console.log(`  ${p.name}: ${p.tiempoRetorno} unidades`);
  });

  return sjfOptimo;
}

async function testSJFConLlegadasEscalonadas() {
  console.log('\n⏰ Test SJF: Llegadas escalonadas');
  console.log('=================================');

  // Test con procesos que llegan en momentos diferentes
  const workload: Workload = {
    processes: [
      { id: 'INICIAL', arribo: 0, rafagasCPU: 1, duracionCPU: 6, duracionIO: 0, prioridad: 1 },
      { id: 'CORTO_TARDIO', arribo: 3, rafagasCPU: 1, duracionCPU: 1, duracionIO: 0, prioridad: 1 },
      { id: 'LARGO_TARDIO', arribo: 3, rafagasCPU: 1, duracionCPU: 8, duracionIO: 0, prioridad: 1 }
    ],
    config: {
      policy: 'SPN',
      tip: 1,
      tfp: 1,
      tcp: 0
    }
  };

  const adaptador = new AdaptadorSimuladorDominio(workload);
  const resultado = adaptador.ejecutar();

  const eventos = resultado.eventosInternos;
  const despachos = eventos.filter(e => e.tipo === 'Despacho');

  console.log('📋 Secuencia de despacho:');
  despachos.forEach((evento, i) => {
    console.log(`  ${i+1}. ${evento.proceso} en tiempo ${evento.tiempo}`);
  });

  // INICIAL debe ejecutar primero (único disponible)
  // Luego CORTO_TARDIO (menor duración que LARGO_TARDIO)
  // Finalmente LARGO_TARDIO
  const ordenEsperado = ['INICIAL', 'CORTO_TARDIO', 'LARGO_TARDIO'];
  const ordenActual = despachos.map(e => e.proceso);
  
  const correcto = JSON.stringify(ordenActual) === JSON.stringify(ordenEsperado);
  
  console.log(`\n✅ Orden correcto para llegadas escalonadas: ${correcto ? 'SÍ' : 'NO'}`);
  
  return correcto;
}

// Ejecutar todos los tests de SJF
async function ejecutarTestsSJF() {
  console.log('🚀 === TESTS DEL ALGORITMO SJF/SPN ===');
  console.log('=====================================');
  
  const resultados = [
    await testSJFBasico(),
    await testSJFTiemposOptimos(),
    await testSJFConLlegadasEscalonadas()
  ];
  
  const todosExitosos = resultados.every(r => r);
  
  console.log('\n📋 === RESUMEN DE TESTS SJF ===');
  console.log(`✅ Test básico: ${resultados[0] ? 'PASÓ' : 'FALLÓ'}`);
  console.log(`✅ Test optimización: ${resultados[1] ? 'PASÓ' : 'FALLÓ'}`);
  console.log(`✅ Test llegadas escalonadas: ${resultados[2] ? 'PASÓ' : 'FALLÓ'}`);
  console.log(`\n🎯 RESULTADO FINAL: ${todosExitosos ? '✅ TODOS LOS TESTS PASARON' : '❌ ALGUNOS TESTS FALLARON'}`);
  
  if (todosExitosos) {
    console.log('\n🎉 El algoritmo SJF/SPN funciona correctamente según la teoría:');
    console.log('   ✅ No es expropiativo');
    console.log('   ✅ Selecciona procesos por menor duración de CPU');
    console.log('   ✅ Optimiza tiempo medio de retorno');
    console.log('   ✅ Maneja correctamente llegadas escalonadas');
  } else {
    console.log('\n💥 Se encontraron problemas en el algoritmo SJF/SPN');
  }
  
  return todosExitosos;
}

// Ejecutar tests
ejecutarTestsSJF()
  .then(exitoso => {
    process.exit(exitoso ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Error en tests SJF:', error);
    process.exit(1);
  });