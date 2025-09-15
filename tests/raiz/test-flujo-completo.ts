/**
 * Test del flujo completo de la aplicación: parseo → simulación → gantt
 */

import { parseTxtToWorkload } from './src/lib/infrastructure/parsers/txtParser.js';
import { ejecutarSimulacion } from './src/lib/application/usecases/runSimulation.js';
import { GanttBuilder } from './src/lib/domain/services/GanttBuilder.js';

async function testFlujoCompleto() {
  console.log('🧪 Test del flujo completo de la aplicación');
  console.log('==================================================');

  try {
    // 1. Simular carga de archivo
    console.log('📁 Simulando parseo de archivo...');
    const contenidoArchivo = 'P1,0,1,3,0,1\nP2,1,1,2,0,2';
    const workload = parseTxtToWorkload(contenidoArchivo, {
      policy: 'FCFS',
      tip: 1,
      tfp: 1,
      tcp: 1
    });

    console.log('✅ Workload parseado:', {
      procesos: workload.processes.length,
      nombre: workload.workloadName
    });

    // 2. Ejecutar simulación
    console.log('🚀 Ejecutando simulación...');
    const resultado = await ejecutarSimulacion(workload);

    console.log('✅ Simulación completada:', {
      eventos: resultado.eventos.length,
      procesos: resultado.metricas.porProceso.length
    });

    // 3. Generar diagrama de Gantt manualmente
    console.log('📊 Generando diagrama de Gantt...');
    const gantt = GanttBuilder.construirDiagramaGantt(resultado.eventos);

    console.log('✅ Gantt generado exitosamente:', {
      segmentos: gantt.segmentos.length,
      tiempoTotal: gantt.tiempoTotal,
      procesos: gantt.procesos.length
    });

    // 4. Mostrar detalles del Gantt
    console.log('📋 Detalles del diagrama de Gantt:');
    console.log(`  - Total de segmentos: ${gantt.segmentos.length}`);
    console.log(`  - Tiempo total: ${gantt.tiempoTotal}`);
    console.log(`  - Procesos: [${gantt.procesos.join(', ')}]`);
    
    console.log('📊 Segmentos:');
    gantt.segmentos.forEach((segmento, i) => {
      console.log(`  ${i + 1}. ${segmento.process} [${segmento.tStart}-${segmento.tEnd}] (${segmento.kind})`);
    });

    console.log('\n🎉 Test del flujo completo exitoso');

  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

// Ejecutar test
testFlujoCompleto();
