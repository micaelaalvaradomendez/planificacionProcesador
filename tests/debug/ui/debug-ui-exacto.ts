#!/usr/bin/env npx tsx

// Debug específico para simular exactamente lo que hace la UI
import { cargarArchivo } from '../../../src/lib/infrastructure/parsers/workloadParser';
import { runSimulationWithTimeout } from '../../../src/lib/application/usecases/simulationRunner';
import fs from 'fs';

async function debugUIFlow() {
  console.log('🔍 DEBUG: Simulando flujo exacto de la UI\n');
  
  const content = fs.readFileSync('../../../examples/workloads/procesos_tanda_7p.json', 'utf8');
  const file = new File([content], 'procesos_tanda_7p.json', { type: 'application/json' });
  
  // 1. Cargar archivo como lo hace la UI
  console.log('1️⃣ Cargando archivo JSON...');
  const loadResult = await cargarArchivo(file, 'json', 'FCFS', 2, 1, 1, undefined);
  
  if (!loadResult.loaded || !loadResult.workload) {
    console.error('❌ Error cargando:', loadResult.errors);
    return;
  }
  
  console.log('✅ Archivo cargado');
  console.log('Config aplicada:', loadResult.workload.config);
  
  // 2. Ejecutar simulación como lo hace la UI
  console.log('\n2️⃣ Ejecutando simulación...');
  const simResult = await runSimulationWithTimeout(loadResult.workload);
  
  console.log('\n📊 RESULTADOS DE LA SIMULACIÓN:');
  console.log('- Simulación completada:', simResult.simulacionCompletada);
  console.log('- Errores:', simResult.errors);
  console.log('- Eventos generados:', simResult.events?.length || 0);
  console.log('- Tiempo total:', simResult.tiempoTotalSimulacion);
  
  console.log('\n📈 MÉTRICAS:');
  console.log('- Métricas por proceso:', simResult.metrics?.porProceso?.length || 0);
  console.log('- Métricas tanda:', simResult.metrics?.tanda);
  
  if (simResult.metrics?.porProceso?.length > 0) {
    console.log('\n✅ MÉTRICAS POR PROCESO:');
    simResult.metrics.porProceso.forEach(m => {
      console.log(`  ${m.name}: TR=${m.tiempoRetorno}, TRn=${m.tiempoRetornoNormalizado.toFixed(2)}`);
    });
  } else {
    console.log('\n❌ NO HAY MÉTRICAS POR PROCESO');
  }
  
  // 3. Analizar eventos para ver por qué no hay métricas
  if (simResult.events) {
    console.log('\n🔍 ANÁLISIS DE EVENTOS:');
    
    const eventosTerminacion = simResult.events.filter(e => e.tipo === 'TERMINACION_PROCESO');
    console.log(`- Eventos TERMINACION_PROCESO: ${eventosTerminacion.length}`);
    
    const eventosInicioTerminacion = simResult.events.filter(e => e.tipo === 'INICIO_TERMINACION');
    console.log(`- Eventos INICIO_TERMINACION: ${eventosInicioTerminacion.length}`);
    
    const eventosFinRafaga = simResult.events.filter(e => e.tipo === 'FIN_RAFAGA_CPU');
    console.log(`- Eventos FIN_RAFAGA_CPU: ${eventosFinRafaga.length}`);
    
    const eventosDespacho = simResult.events.filter(e => e.tipo === 'DESPACHO');
    console.log(`- Eventos DESPACHO: ${eventosDespacho.length}`);
    
    // Mostrar primeros eventos para entender el flujo
    console.log('\n📅 PRIMEROS 10 EVENTOS:');
    simResult.events.slice(0, 10).forEach((e, i) => {
      console.log(`  ${i+1}. t=${e.tiempo} | ${e.tipo} | ${e.proceso} | ${e.extra || ''}`);
    });
    
    if (simResult.events.length > 10) {
      console.log('\n📅 ÚLTIMOS 5 EVENTOS:');
      simResult.events.slice(-5).forEach((e, i) => {
        const idx = simResult.events.length - 5 + i + 1;
        console.log(`  ${idx}. t=${e.tiempo} | ${e.tipo} | ${e.proceso} | ${e.extra || ''}`);
      });
    }
  }
}

debugUIFlow().catch(console.error);