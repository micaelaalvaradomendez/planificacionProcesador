#!/usr/bin/env npx tsx

// Script para probar el flujo completo de la UI después del fix
import { cargarArchivo } from '../../src/lib/infrastructure/parsers/workloadParser';
import { runSimulationWithTimeout } from '../../src/lib/application/usecases/simulationRunner';
import fs from 'fs';

async function testUIFlowFixed() {
  console.log('🧪 TEST: Flujo completo UI después del FIX\n');
  
  // 1. Simular carga de archivo JSON con configuración de UI (como hace cargarArchivo ahora)
  const content = fs.readFileSync('../../examples/workloads/procesos_tanda_7p.json', 'utf8');
  const file = new File([content], 'procesos_tanda_7p.json', { type: 'application/json' });
  
  console.log('📁 Cargando archivo con cargarArchivo (simulando UI)...');
  const result = await cargarArchivo(
    file,
    'json',
    'FCFS',    // policy de UI
    2,         // tip de UI
    1,         // tfp de UI
    1,         // tcp de UI
    undefined  // quantum de UI
  );
  
  if (!result.loaded || !result.workload) {
    console.error('❌ Error cargando archivo:', result.errors);
    return;
  }
  
  console.log('✅ Archivo cargado correctamente');
  console.log('📋 Config del workload después de cargarArchivo:', result.workload.config);
  console.log('📋 Procesos cargados:', result.workload.processes.length);
  
  // 2. Ejecutar simulación (como hace ejecutarSimulacion en la UI)
  console.log('\n🚀 Ejecutando simulación...');
  const simResult = await runSimulationWithTimeout(result.workload);
  
  if (!simResult.simulacionCompletada) {
    console.error('❌ Error en simulación:', simResult.errors);
    return;
  }
  
  console.log('✅ Simulación completada exitosamente');
  console.log('📅 Eventos generados:', simResult.events.length);
  console.log('⏰ Tiempo total:', simResult.tiempoTotalSimulacion);
  
  // 3. Verificar métricas
  console.log('\n📊 RESULTADOS:');
  console.log('Métricas por proceso:', simResult.metrics.porProceso.length);
  console.log('Métricas de tanda:', simResult.metrics.tanda);
  
  if (simResult.metrics.porProceso.length > 0) {
    console.log('\n✅ MÉTRICAS POR PROCESO ENCONTRADAS:');
    simResult.metrics.porProceso.forEach(m => {
      console.log(`  ${m.name}: TR=${m.tiempoRetorno}, TRn=${m.tiempoRetornoNormalizado.toFixed(2)}, EnListo=${m.tiempoEnListo}`);
    });
  } else {
    console.log('\n❌ NO HAY MÉTRICAS POR PROCESO');
  }
  
  // 4. Verificar eventos de terminación
  const eventosTerminacion = simResult.events.filter(e => e.tipo === 'TERMINACION_PROCESO');
  console.log(`\n🔍 Eventos de terminación: ${eventosTerminacion.length}`);
  eventosTerminacion.forEach(e => {
    console.log(`  ${e.proceso} terminó en t=${e.tiempo}`);
  });
  
  // 5. Verificar si la tanda tiene valores correctos
  const tanda = simResult.metrics.tanda;
  const hasTandaValida = tanda.tiempoRetornoTanda > 0 && tanda.tiempoMedioRetorno > 0;
  console.log(`\n📈 Tanda válida: ${hasTandaValida ? '✅' : '❌'}`);
  
  console.log('\n🎯 RESUMEN:');
  console.log(`- Configuración aplicada: ${result.workload.config.tip > 0 ? '✅' : '❌'}`);
  console.log(`- Simulación exitosa: ${simResult.simulacionCompletada ? '✅' : '❌'}`);
  console.log(`- Métricas por proceso: ${simResult.metrics.porProceso.length > 0 ? '✅' : '❌'}`);
  console.log(`- Métricas de tanda: ${hasTandaValida ? '✅' : '❌'}`);
}

testUIFlowFixed().catch(console.error);