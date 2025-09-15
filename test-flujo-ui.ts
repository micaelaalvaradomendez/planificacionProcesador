/**
 * Test del flujo completo de la UI: desde simuladorLogic hasta resultado
 */

import { ejecutarSimulacion } from './src/lib/application/simuladorLogic.js';

async function testFlujUI() {
  console.log('🧪 Test del flujo completo de la UI');
  console.log('==================================================');

  try {
    // 1. Simular datos de entrada como los que vienen de la UI
    const procesos = [
      { nombre: 'P1', llegada: 0, rafaga: 3, prioridad: 1 },
      { nombre: 'P2', llegada: 1, rafaga: 2, prioridad: 2 }
    ];
    
    const configuracion = {
      policy: 'FCFS' as const,
      tip: 1,
      tfp: 1,
      tcp: 1
    };

    console.log('📊 Procesos:', procesos);
    console.log('⚙️ Configuración:', configuracion);

    // 2. Ejecutar simulación como lo hace la UI
    console.log('🚀 Ejecutando simulación...');
    const resultado = await ejecutarSimulacion(procesos, configuracion);
    
    console.log('✅ Simulación completada:', {
      eventos: resultado.events.length,
      tieneGantt: !!resultado.gantt,
      segmentosGantt: resultado.gantt?.segmentos.length || 0
    });

    // 3. Verificar datos de Gantt
    if (resultado.gantt) {
      console.log('📊 Datos del Gantt:');
      console.log(`  - Segmentos: ${resultado.gantt.segmentos.length}`);
      console.log(`  - Tiempo total: ${resultado.gantt.tiempoTotal}`);
      console.log(`  - Procesos: [${resultado.gantt.procesos.join(', ')}]`);
      
      console.log('📋 Segmentos detallados:');
      resultado.gantt.segmentos.forEach((segmento, i) => {
        console.log(`  ${i + 1}. ${segmento.process} [${segmento.tStart}-${segmento.tEnd}] (${segmento.kind})`);
      });
    } else {
      console.log('❌ No se generó el diagrama de Gantt');
    }

    // 4. Simular guardado como lo hace la UI
    const datosCompletos = {
      procesos,
      configuracion,
      resultados: resultado,
      timestamp: new Date().toISOString()
    };

    console.log('💾 Datos que se guardarían en localStorage:', {
      tieneGantt: !!datosCompletos.resultados.gantt,
      segmentos: datosCompletos.resultados.gantt?.segmentos.length || 0
    });

    console.log('\n🎉 Test del flujo de UI exitoso');

  } catch (error) {
    console.error('❌ Error en test de UI:', error);
  }
}

// Ejecutar test
testFlujUI();
