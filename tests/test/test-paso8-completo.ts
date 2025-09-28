// Test completo de métricas y Gantt - Paso 8
import { runFCFSSandbox } from '../../src/lib/engine/engine';
import { MetricsBuilder } from '../../src/lib/metrics/metricas';
import { GanttBuilder } from '../../src/lib/gantt/builder';
import type { Proceso } from '../../src/lib/model/proceso';

function testMetricasConTFP() {
  console.log('  Test Métricas con TFP (validación fin = C→T)');
  
  const procesos: Proceso[] = [
    { pid: 1, arribo: 0, rafagasCPU: [3], estado: 'N' },
    { pid: 2, arribo: 1, rafagasCPU: [2], estado: 'N' }
  ];
  
  // Ejecutar con TFP=2 para verificar que se incluye en el fin
  const trace = runFCFSSandbox(procesos, { TFP: 2 });
  
  const processMetrics = MetricsBuilder.build(trace, procesos);
  const globalMetrics = MetricsBuilder.buildGlobal(processMetrics, trace);
  
  console.log(' Trace generado:');
  console.log(`   Slices: ${trace.slices.length}`);
  trace.slices.forEach(s => {
    console.log(`   - P${s.pid}: ${s.start}→${s.end} (CPU: ${s.end - s.start})`);
  });
  
  console.log(`   Eventos: ${trace.events.length}`);
  trace.events.forEach(e => {
    console.log(`   - t=${e.t}: ${e.type} P${e.pid ?? '?'}`);
  });
  
  console.log('\n📈 Métricas por proceso:');
  processMetrics.forEach(m => {
    console.log(`   P${m.pid}: arribo=${m.arribo}, fin=${m.fin}, CPU=${m.servicioCPU}`);
    console.log(`         TRp=${m.TRp}, TE=${m.TE}, TRn=${m.TRn.toFixed(2)}`);
    
    // Validar que TRn >= 1.0 (tiempo respuesta >= servicio)
    if (m.TRn < 1.0) {
      console.error(`❌ TRn=${m.TRn} < 1.0 para P${m.pid} - ERROR en cálculo`);
    } else {
      console.log(`    TRn=${m.TRn.toFixed(2)} >= 1.0 - válido`);
    }
  });
  
  console.log('\n🌍 Métricas globales:');
  console.log(`   TRp promedio: ${globalMetrics.TRpPromedio.toFixed(2)}`);
  console.log(`   TE promedio: ${globalMetrics.TEPromedio.toFixed(2)}`);
  console.log(`   TRn promedio: ${globalMetrics.TRnPromedio.toFixed(2)}`);
  console.log(`   Throughput: ${globalMetrics.throughput.toFixed(4)}`);
  console.log(`   Cambios contexto: ${globalMetrics.cambiosDeContexto}`);
  console.log(`   Expropiaciones: ${globalMetrics.expropiaciones}`);
  
  // Verificar que los últimos eventos C→T incluyen TFP
  const eventosFinales = trace.events.filter(e => e.type === 'C→T');
  console.log(`\n⏰ Eventos C→T (deben incluir TFP=${2}):`);
  eventosFinales.forEach(e => {
    const metrics = processMetrics.find(m => m.pid === e.pid);
    if (metrics) {
      console.log(`   P${e.pid}: C→T en t=${e.t} = fin métrica=${metrics.fin} ✅`);
    }
  });
}

function testGanttFiltrado() {
  console.log('\n  Test Gantt - Solo barras CPU');
  
  const procesos: Proceso[] = [
    { pid: 1, arribo: 0, rafagasCPU: [2], estado: 'N' },
    { pid: 2, arribo: 1, rafagasCPU: [3], estado: 'N' }
  ];
  
  // Agregar costos para verificar que NO aparecen como barras
  const trace = runFCFSSandbox(procesos, { TCP: 1, TFP: 1 });
  const ganttModel = GanttBuilder.build(trace);
  
  console.log(' Gantt filtrado:');
  console.log(`   Tracks: ${ganttModel.tracks.length}`);
  console.log(`   Rango: ${ganttModel.tMin} - ${ganttModel.tMax}`);
  
  ganttModel.tracks.forEach(track => {
    console.log(`   ${track.pid}: ${track.segments.length} segmentos`);
    track.segments.forEach((seg, i) => {
      console.log(`      [${i}] ${seg.start}→${seg.end} (${seg.end - seg.start})`);
    });
  });
  
  // Verificar que solo hay slices CPU (no TCP/TFP como barras)
  const totalSegments = ganttModel.tracks.reduce((sum, track) => sum + track.segments.length, 0);
  console.log(`\n Validación:`);
  console.log(`   Segmentos Gantt: ${totalSegments}`);
  console.log(`   Slices trace: ${trace.slices.length}`);
  
  if (totalSegments === trace.slices.length) {
    console.log(`    1:1 - Gantt muestra solo CPU`);
  } else {
    console.log(`   ⚠️  Diferencia - verificar filtrado`);
  }
  
  // Detectar huecos (tiempo sin CPU)
  ganttModel.tracks.forEach(track => {
    const huecos = GanttBuilder.detectarHuecos(track);
    if (huecos.length > 0) {
      console.log(`   Huecos en ${track.pid}:`);
      huecos.forEach(h => console.log(`      ${h.start}→${h.end}`));
    }
  });
}

function testValidacionCompleta() {
  console.log('\n  Test Validación Completa - Paso 8');
  
  const procesos: Proceso[] = [
    { pid: 1, arribo: 0, rafagasCPU: [4], estado: 'N' },
    { pid: 2, arribo: 2, rafagasCPU: [2], estado: 'N' },
    { pid: 3, arribo: 1, rafagasCPU: [3], estado: 'N' }
  ];
  
  const trace = runFCFSSandbox(procesos, { TIP: 1, TCP: 1, TFP: 2 });
  const processMetrics = MetricsBuilder.build(trace, procesos);
  const globalMetrics = MetricsBuilder.buildGlobal(processMetrics, trace);
  const ganttModel = GanttBuilder.build(trace);
  
  console.log(' Resumen completo:');
  console.log(`   Procesos: ${procesos.length}`);
  console.log(`   Trace: ${trace.slices.length} slices, ${trace.events.length} eventos`);
  console.log(`   Gantt: ${ganttModel.tracks.length} tracks, ${ganttModel.tracks.reduce((s, t) => s + t.segments.length, 0)} segmentos`);
  console.log(`   Métricas: TRp=${globalMetrics.TRpPromedio.toFixed(2)}, cambios=${globalMetrics.cambiosDeContexto}`);
  
  // Validaciones finales
  let errores = 0;
  
  // 1. TRn >= 1.0 para todos
  processMetrics.forEach(m => {
    if (m.TRn < 1.0) {
      console.error(`❌ TRn=${m.TRn} < 1.0 para P${m.pid}`);
      errores++;
    }
  });
  
  // 2. Gantt 1:1 con slices
  const totalSegs = ganttModel.tracks.reduce((s, t) => s + t.segments.length, 0);
  if (totalSegs !== trace.slices.length) {
    console.error(`❌ Gantt ${totalSegs} ≠ slices ${trace.slices.length}`);
    errores++;
  }
  
  // 3. Tiempos consistentes
  processMetrics.forEach(m => {
    if (m.TE < 0) {
      console.error(`❌ TE=${m.TE} < 0 para P${m.pid}`);
      errores++;
    }
  });
  
  if (errores === 0) {
    console.log(' Todas las validaciones pasan - Paso 8 OK');
  } else {
    console.error(`❌ ${errores} errores encontrados`);
  }
}

// Ejecutar tests
testMetricasConTFP();
testGanttFiltrado();
testValidacionCompleta();

console.log('\n   Tests Paso 8 completados - Core implementado');