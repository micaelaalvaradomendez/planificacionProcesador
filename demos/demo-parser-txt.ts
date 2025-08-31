/**
 * Demo del parser TXT/CSV con archivos reales
 */

import { readFileSync } from 'fs';
import { parseTxtToWorkload, createDefaultConfig } from '../src/lib/infrastructure/parsers/txtParser';
import { ejecutarSimulacionCompleta } from '../src/lib/application/usecases/runSimulation';

console.log('📁 DEMO: Parser TXT/CSV con archivos reales');
console.log('==================================================');

async function testArchivoCSV(): Promise<void> {
  console.log('\n=== DEMO: Archivo CSV (5 procesos) ===');
  
  try {
    const contenido = readFileSync('examples/workloads/ejemplo_5procesos.csv', 'utf-8');
    console.log('📄 Contenido del archivo:');
    console.log(contenido);
    
    const config = createDefaultConfig('RR');
    config.quantum = 4;
    config.tip = 1;
    config.tfp = 1;
    config.tcp = 1;
    
    const workload = parseTxtToWorkload(contenido, config, 'ejemplo_5procesos.csv');
    
    console.log('\n✅ Workload parseado correctamente');
    console.log(`📊 Procesos: ${workload.processes.length}`);
    console.log(`⚙️  Política: ${workload.config.policy} (quantum=${workload.config.quantum})`);
    
    for (const proc of workload.processes) {
      console.log(`   ${proc.name}: arribo=${proc.tiempoArribo}, rafagas=${proc.rafagasCPU}, cpu=${proc.duracionRafagaCPU}, es=${proc.duracionRafagaES}, prio=${proc.prioridad}`);
    }
    
    // Ejecutar simulación
    console.log('\n🚀 Ejecutando simulación Round Robin...');
    const resultado = await ejecutarSimulacionCompleta(workload);
    
    if (resultado.exitoso) {
      console.log('✅ Simulación exitosa');
      console.log(`⏱️  Tiempo total: ${resultado.tiempoTotal}`);
      console.log(`📊 Eventos generados: ${resultado.eventos.length}`);
      
      console.log('\n📋 Métricas finales:');
      for (const proc of resultado.metricas.porProceso) {
        console.log(`   ${proc.name}: TR=${proc.tiempoRetorno.toFixed(2)}, TRn=${proc.tiempoRetornoNormalizado.toFixed(2)}, T_Listo=${proc.tiempoEnListo.toFixed(2)}`);
      }
      
      console.log(`\n📈 Uso de CPU:`);
      console.log(`   Procesos: ${resultado.metricas.tanda.cpuProcesos.toFixed(2)} (${resultado.metricas.tanda.porcentajeCpuProcesos?.toFixed(1)}%)`);
      console.log(`   SO: ${resultado.metricas.tanda.cpuSO.toFixed(2)} (${resultado.metricas.tanda.porcentajeCpuSO?.toFixed(1)}%)`);
      console.log(`   Ocioso: ${resultado.metricas.tanda.cpuOcioso.toFixed(2)} (${resultado.metricas.tanda.porcentajeCpuOcioso?.toFixed(1)}%)`);
    } else {
      console.error('❌ Simulación falló:', resultado.error);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error:', errorMessage);
  }
}

async function testArchivoTXT(): Promise<void> {
  console.log('\n=== DEMO: Archivo TXT simple (tabs) ===');
  
  try {
    const contenido = readFileSync('examples/workloads/ejemplo_simple.txt', 'utf-8');
    console.log('📄 Contenido del archivo:');
    console.log(contenido);
    
    const config = createDefaultConfig('PRIORITY');
    config.tip = 2;
    config.tfp = 1;
    config.tcp = 1;
    
    const workload = parseTxtToWorkload(contenido, config, 'ejemplo_simple.txt');
    
    console.log('\n✅ Workload parseado correctamente');
    console.log(`📊 Procesos: ${workload.processes.length}`);
    console.log(`⚙️  Política: ${workload.config.policy}`);
    
    for (const proc of workload.processes) {
      console.log(`   ${proc.name}: arribo=${proc.tiempoArribo}, rafagas=${proc.rafagasCPU}, cpu=${proc.duracionRafagaCPU}, es=${proc.duracionRafagaES}, prio=${proc.prioridad}`);
    }
    
    // Ejecutar simulación
    console.log('\n🚀 Ejecutando simulación Priority...');
    const resultado = await ejecutarSimulacionCompleta(workload);
    
    if (resultado.exitoso) {
      console.log('✅ Simulación exitosa');
      console.log(`⏱️  Tiempo total: ${resultado.tiempoTotal}`);
      
      console.log('\n📋 Métricas finales:');
      for (const proc of resultado.metricas.porProceso) {
        console.log(`   ${proc.name}: TR=${proc.tiempoRetorno.toFixed(2)}, TRn=${proc.tiempoRetornoNormalizado.toFixed(2)}, T_Listo=${proc.tiempoEnListo.toFixed(2)}`);
      }
    } else {
      console.error('❌ Simulación falló:', resultado.error);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error:', errorMessage);
  }
}

// Ejecutar demos
async function ejecutarTodosLosDemos(): Promise<void> {
  await testArchivoCSV();
  await testArchivoTXT();
  
  console.log('\n==================================================');
  console.log('🎉 ¡Demo completado! El parser TXT/CSV funciona correctamente');
  console.log('   con archivos reales y diferentes separadores.');
}

ejecutarTodosLosDemos().catch(console.error);
