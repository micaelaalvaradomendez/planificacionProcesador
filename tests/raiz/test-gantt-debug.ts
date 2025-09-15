/**
 * Test de debug para verificar el flujo completo de Gantt
 */

import { ejecutarSimulacion, guardarDatosSimulacion } from './src/lib/application/simuladorLogic.js';

async function testGanttCompleto() {
  console.log('🧪 Test de Gantt completo');
  console.log('='.repeat(50));
  
  // Datos de prueba
  const procesos = [
    { nombre: 'P1', llegada: 0, rafaga: 3, prioridad: 1 },
    { nombre: 'P2', llegada: 1, rafaga: 2, prioridad: 2 }
  ];
  
  const configuracion = {
    policy: 'FCFS',
    tip: 1,
    tfp: 1,
    tcp: 1
  };
  
  try {
    console.log('🚀 Ejecutando simulación...');
    const resultado = await ejecutarSimulacion(procesos, configuracion);
    
    console.log('✅ Resultado de simulación:');
    console.log('  - Events:', resultado.events.length);
    console.log('  - Metrics:', resultado.metrics ? 'Disponibles' : 'No disponibles');
    console.log('  - Gantt:', resultado.gantt ? 'Disponible' : 'NO DISPONIBLE');
    
    if (resultado.gantt) {
      console.log('📊 Detalles del Gantt:');
      console.log('  - Segmentos:', resultado.gantt.segmentos.length);
      console.log('  - Tiempo total:', resultado.gantt.tiempoTotal);
      console.log('  - Procesos:', resultado.gantt.procesos);
      
      console.log('📋 Primeros segmentos:');
      resultado.gantt.segmentos.slice(0, 3).forEach((seg, i) => {
        console.log(`  ${i+1}. ${seg.process} [${seg.tStart}-${seg.tEnd}] (${seg.kind})`);
      });
    } else {
      console.log('❌ No se generó diagrama de Gantt');
    }
    
    // Simular guardado
    const datosCompletos = {
      procesos,
      configuracion,
      resultados: resultado,
      timestamp: new Date().toISOString()
    };
    
    console.log('💾 Guardando datos...');
    guardarDatosSimulacion(datosCompletos);
    
    console.log('✅ Test completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

testGanttCompleto();
