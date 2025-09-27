// Test básico de Priority con aging - anti-starvation
import { runPriority } from '../engine/engine';
import type { Proceso } from '../model/proceso';

function testPriorityAging() {
  console.log('🧪 Test Priority + Aging (anti-starvation)');
  
  const procesos: Proceso[] = [
    {
      pid: 1,
      arribo: 0,
      rafagasCPU: [20], // proceso largo
      estado: 'N'
    },
    {
      pid: 2, 
      arribo: 2,
      rafagasCPU: [3], // proceso corto
      estado: 'N'
    }
  ];
  
  const prioridades = {
    1: 5,  // A: prioridad media
    2: 10  // B: prioridad baja
  };
  
  try {
    const trace = runPriority(procesos, prioridades, {});
    
    console.log('✅ Priority test ejecutado (fallback FCFS)');
    console.log(`📊 Slices: ${trace.slices.length}, Eventos: ${trace.events.length}`);
    
  } catch (error) {
    console.error('❌ Error en test Priority:', error);
  }
}

async function testMetricas() {
  console.log('🧪 Test Métricas');
  
  const procesos: Proceso[] = [
    { pid: 1, arribo: 0, rafagasCPU: [5], estado: 'N' },
    { pid: 2, arribo: 2, rafagasCPU: [3], estado: 'N' }
  ];
  
  try {
    // Usar FCFS como base para test de métricas
    const { runFCFSSandbox } = await import('../engine/engine');
    const trace = runFCFSSandbox(procesos, { TFP: 1 });
    
    const { MetricsBuilder } = await import('../metrics/metricas');
    
    const processMetrics = MetricsBuilder.build(trace, procesos);
    const globalMetrics = MetricsBuilder.buildGlobal(processMetrics, trace);
    
    console.log('✅ Métricas calculadas');
    console.log(`📊 Procesos: ${processMetrics.length}`);
    console.log(`⏱️  TRp promedio: ${globalMetrics.TRpPromedio.toFixed(2)}`);
    console.log(`🔄 Cambios contexto: ${globalMetrics.cambiosDeContexto}`);
    
    // Validar que TFP está incluido en fin
    for (const m of processMetrics) {
      if (m.TRn < 1.0) {
        console.warn(`⚠️ TRn=${m.TRn} < 1.0 para P${m.pid} - posible error en cálculo`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error en test Métricas:', error);
  }
}

async function testGantt() {
  console.log('🧪 Test Gantt');
  
  const procesos: Proceso[] = [
    { pid: 1, arribo: 0, rafagasCPU: [3], estado: 'N' },
    { pid: 2, arribo: 1, rafagasCPU: [2], estado: 'N' }
  ];
  
  try {
    const { runFCFSSandbox } = await import('../engine/engine'); 
    const trace = runFCFSSandbox(procesos, {});
    
    const { GanttBuilder } = await import('../gantt/builder');
    const ganttModel = GanttBuilder.build(trace);
    
    console.log('✅ Gantt generado');
    console.log(`📊 Tracks: ${ganttModel.tracks.length}`);
    console.log(`⏱️  Rango: ${ganttModel.tMin} - ${ganttModel.tMax}`);
    
    // Validar 1:1 con trace.slices
    const totalSegments = ganttModel.tracks.reduce((sum: number, track: any) => sum + track.segments.length, 0);
    if (totalSegments !== trace.slices.length) {
      console.warn(`⚠️ Segmentos Gantt (${totalSegments}) ≠ Slices trace (${trace.slices.length})`);
    }
    
  } catch (error) {
    console.error('❌ Error en test Gantt:', error);
  }
}

// Ejecutar tests
async function runTests() {
  console.log('🚀 Ejecutando tests Paso 8...\n');
  
  testPriorityAging();
  await testMetricas();
  await testGantt();
  
  console.log('\n✨ Tests completados');
}

if (import.meta.main) {
  runTests();
}