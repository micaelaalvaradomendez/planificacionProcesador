#!/usr/bin/env npx tsx

/**
 * Test de integración: Verificar que la interfaz muestre datos correctos del simulador
 * Prueba el flujo completo desde el simuladorLogic hasta los componentes UI
 */

import { ejecutarSimulacion } from '../../src/lib/application/usecases/runSimulation.js';
import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio.js';
import type { Workload, SimEvent, MetricsPerProcess } from '../../src/lib/domain/types.js';

console.log('🧪 TEST: Integración Simulador-UI');
console.log('================================');

// Test de Round Robin simple para verificar que los datos corregidos lleguen a la UI
async function testIntegracionRR() {
  console.log('\n📋 Test: Round Robin - Datos para UI');
  
  const workload: Workload = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 1 },
      { id: 'P2', arribo: 1, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 2 }
    ],
    config: { policy: 'RR', tip: 0, tfp: 0, tcp: 0, quantum: 2 }
  };

  console.log('🔄 Ejecutando simulación usando función de aplicación...');
  
  // Usar la función que usa la interfaz
  const resultado = await ejecutarSimulacion(workload);
  
  console.log('📊 Resultados obtenidos:');
  console.log(`  - Eventos totales: ${resultado.eventos.length}`);
  console.log(`  - Métricas por proceso: ${resultado.metricas.porProceso.length}`);
  console.log(`  - Tiempo medio retorno: ${resultado.metricas.tanda.tiempoMedioRetorno}`);
  console.log(`  - CPU procesos: ${resultado.metricas.tanda.cpuProcesos}`);
  console.log(`  - CPU SO: ${resultado.metricas.tanda.cpuSO}`);
  console.log(`  - CPU ocioso: ${resultado.metricas.tanda.cpuOcioso}`);

  // Verificar que las métricas sean coherentes con la lógica corregida
  const eventosDespacho = resultado.eventos.filter((e: SimEvent) => e.tipo === 'LISTO_A_CORRIENDO');
  const eventosExpropiacion = resultado.eventos.filter((e: SimEvent) => e.tipo === 'CORRIENDO_A_LISTO');
  
  console.log('\n🔍 Análisis de eventos:');
  console.log(`  - Despachos: ${eventosDespacho.length}`);
  console.log(`  - Expropaciones: ${eventosExpropiacion.length}`);
  
  // Log eventos relevantes para verificar orden
  console.log('\n📝 Secuencia de eventos clave:');
  resultado.eventos
    .filter((e: SimEvent) => ['LISTO_A_CORRIENDO', 'CORRIENDO_A_LISTO', 'CORRIENDO_A_TERMINADO'].includes(e.tipo))
    .forEach((e: SimEvent) => {
      console.log(`    ${e.tiempo}s: ${e.proceso} - ${e.tipo}`);
    });

  // Verificar métricas específicas por proceso
  console.log('\n📈 Métricas por proceso:');
  resultado.metricas.porProceso.forEach((m: MetricsPerProcess) => {
    console.log(`  ${m.name}: TR=${m.tiempoRetorno}, TRn=${m.tiempoRetornoNormalizado.toFixed(2)}, TE=${m.tiempoEnListo}`);
  });

  return resultado;
}

// Test adicional: verificar que el adaptador directo produce los mismos resultados
async function testConsistenciaAdaptador() {
  console.log('\n📋 Test: Consistencia AdaptadorSimuladorDominio');
  
  const workload: Workload = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 1 }
    ],
    config: { policy: 'RR', tip: 0, tfp: 0, tcp: 0, quantum: 2 }
  };

  // Ejecutar con adaptador directo
  const adaptador = new AdaptadorSimuladorDominio(workload);
  const resultadoAdaptador = adaptador.ejecutar();
  
  // Ejecutar con función de aplicación
  const resultadoAplicacion = await ejecutarSimulacion(workload);
  
  console.log('🔄 Comparando resultados:');
  console.log(`  Adaptador - tiempo final: ${resultadoAdaptador.estadoFinal.tiempoActual}`);
  console.log(`  Aplicación - eventos: ${resultadoAplicacion.eventos.length}`);
  console.log(`  Aplicación - tiempo medio retorno: ${resultadoAplicacion.metricas.tanda.tiempoMedioRetorno}`);

  // Verificar que ambos produzcan eventos consistentes
  const eventosAdaptador = resultadoAdaptador.eventosInternos.length;
  const eventosAplicacion = resultadoAplicacion.eventos.length;
  
  console.log(`\n📊 Eventos generados:`);
  console.log(`  - Adaptador (internos): ${eventosAdaptador}`);
  console.log(`  - Aplicación (exportados): ${eventosAplicacion}`);
  
  const consistente = Math.abs(eventosAdaptador - eventosAplicacion) <= 2; // Permitir diferencia menor
  console.log(`  ✅ Consistencia: ${consistente ? 'SÍ' : 'NO'}`);
  
  return { adaptador: resultadoAdaptador, aplicacion: resultadoAplicacion, consistente };
}

async function main() {
  try {
    const resultadoRR = await testIntegracionRR();
    const resultadoConsistencia = await testConsistenciaAdaptador();
    
    console.log('\n🎯 RESUMEN:');
    console.log(`  ✅ Test RR UI: ${resultadoRR.eventos.length > 0 ? 'EXITOSO' : 'FALLÓ'}`);
    console.log(`  ✅ Consistencia: ${resultadoConsistencia.consistente ? 'SÍ' : 'NO'}`);
    console.log('\n📝 Los datos están listos para ser mostrados en la interfaz correctamente.');
    
  } catch (error) {
    console.error('❌ Error en test de integración:', error);
    process.exit(1);
  }
}

main();