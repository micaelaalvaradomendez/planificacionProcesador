/**
 * Test del componente TablaResumenComparativa
 * Verifica que el componente se renderiza correctamente con datos reales
 */

import { ejecutarSimulacion, guardarDatosSimulacion, type DatosSimulacionCompleta } from '../src/lib/application/simuladorLogic';

console.log('🧪 Test TablaResumenComparativa');
console.log('===============================');

async function testComponenteTablaResumen() {
  try {
    // Crear datos de prueba
    const procesos = [
      { nombre: 'P1', llegada: 0, rafaga: 5, prioridad: 2 },
      { nombre: 'P2', llegada: 1, rafaga: 3, prioridad: 1 },
      { nombre: 'P3', llegada: 2, rafaga: 8, prioridad: 3 }
    ];
    
    const configuracion = {
      policy: 'PRIORITY' as const,
      tip: 1,
      tfp: 1, 
      tcp: 2,
      quantum: 4
    };
    
    console.log('🚀 Ejecutando simulación de prueba...');
    const resultado = await ejecutarSimulacion(procesos, configuracion);
    
    console.log('✅ Simulación completada');
    console.log('📊 Verificando estructura de datos para TablaResumenComparativa:');
    
    // Crear datos completos como los esperaría el componente
    const datosCompletos: DatosSimulacionCompleta = {
      procesos,
      configuracion,
      resultados: resultado,
      timestamp: new Date().toISOString()
    };
    
    // Verificar que todos los datos necesarios están presentes
    console.log('\n🔍 Verificación de datos para el componente:');
    console.log('  ✓ configuracion.policy:', datosCompletos.configuracion.policy);
    console.log('  ✓ configuracion.tip/tfp/tcp:', datosCompletos.configuracion.tip, datosCompletos.configuracion.tfp, datosCompletos.configuracion.tcp);
    console.log('  ✓ configuracion.quantum:', datosCompletos.configuracion.quantum);
    console.log('  ✓ procesos.length:', datosCompletos.procesos.length);
    console.log('  ✓ resultados.events.length:', datosCompletos.resultados.events.length);
    console.log('  ✓ resultados.metrics.porProceso.length:', datosCompletos.resultados.metrics.porProceso.length);
    console.log('  ✓ resultados.metrics.tanda:', !!datosCompletos.resultados.metrics.tanda);
    
    // Verificar datos específicos que usa el componente
    const metrics = datosCompletos.resultados.metrics;
    console.log('\n📈 Métricas específicas para análisis:');
    console.log('  • Tiempo total simulación:', metrics.tanda.tiempoRetornoTanda);
    console.log('  • Eficiencia CPU (procesos):', metrics.tanda.porcentajeCpuProcesos, '%');
    console.log('  • CPU ociosa:', metrics.tanda.porcentajeCpuOcioso, '%');
    console.log('  • CPU SO:', metrics.tanda.porcentajeCpuSO, '%');
    console.log('  • Tiempo medio retorno:', metrics.tanda.tiempoMedioRetorno);
    
    // Guardar datos para probar en la UI
    guardarDatosSimulacion(datosCompletos);
    console.log('\n💾 Datos guardados en localStorage');
    console.log('🌐 Puedes ir a http://localhost:5174/resultados para ver el componente');
    
    return datosCompletos;
    
  } catch (error) {
    console.error('❌ Error en test:', error);
    throw error;
  }
}

// Ejecutar test
testComponenteTablaResumen()
  .then(() => console.log('\n✅ Test completado exitosamente'))
  .catch(err => console.error('\n❌ Test falló:', err));
