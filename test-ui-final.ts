import { runSimulationWithTimeout } from './src/lib/application/usecases/simulationRunner.js';

// Simular carga de workload desde UI
const workload = {
  workloadName: 'Test UI Final',
  processes: [
    {
      name: 'P1',
      tiempoArribo: 0,
      rafagasCPU: 1,
      duracionRafagaCPU: 10,
      duracionRafagaES: 0,
      prioridad: 50
    },
    {
      name: 'P2',
      tiempoArribo: 2,
      rafagasCPU: 1,
      duracionRafagaCPU: 3,
      duracionRafagaES: 0,
      prioridad: 60
    }
  ],
  config: {
    policy: 'FCFS' as const,
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

console.log('🧪 Test Final - Simulación UI completa');
console.log('='.repeat(50));

async function testCompleteUIFlow() {
  try {
    const resultado = await runSimulationWithTimeout(workload);
    
    console.log('\n✅ Resultado de simulación UI:');
    console.log('  Simulación completada:', resultado.simulacionCompletada);
    console.log('  Errores:', resultado.errors);
    console.log('  Advertencias:', resultado.advertencias);
    
    if (resultado.simulacionCompletada && resultado.metrics) {
      console.log('\n📊 Estructura para StatsPanel:');
      console.log('  simState.simulacionCompletada:', resultado.simulacionCompletada);
      console.log('  simState.metrics exists:', !!resultado.metrics);
      console.log('  simState.metrics.porProceso exists:', !!resultado.metrics.porProceso);
      console.log('  simState.metrics.porProceso.length:', resultado.metrics.porProceso?.length || 0);
      console.log('  simState.metrics.tanda exists:', !!resultado.metrics.tanda);
      console.log('  simState.estadisticasExtendidas exists:', !!resultado.estadisticasExtendidas);
      
      console.log('\n📈 Métricas por proceso:');
      resultado.metrics.porProceso?.forEach(proc => {
        console.log(`    ${proc.name}: TR=${proc.tiempoRetorno?.toFixed(2)}, TRn=${proc.tiempoRetornoNormalizado?.toFixed(2)}, T_Listo=${proc.tiempoEnListo?.toFixed(2)}`);
      });
      
      console.log('\n📊 Métricas de tanda:');
      const tanda = resultado.metrics.tanda;
      console.log(`    Tiempo Retorno Tanda: ${tanda?.tiempoRetornoTanda?.toFixed(2) || 'N/A'}`);
      console.log(`    Tiempo Medio Retorno: ${tanda?.tiempoMedioRetorno?.toFixed(2) || 'N/A'}`);
      console.log(`    CPU Procesos: ${tanda?.cpuProcesos?.toFixed(2) || 'N/A'} (${tanda?.porcentajeCpuProcesos?.toFixed(1) || 'N/A'}%)`);
      console.log(`    CPU SO: ${tanda?.cpuSO?.toFixed(2) || 'N/A'} (${tanda?.porcentajeCpuSO?.toFixed(1) || 'N/A'}%)`);
      console.log(`    CPU Ocioso: ${tanda?.cpuOcioso?.toFixed(2) || 'N/A'} (${tanda?.porcentajeCpuOcioso?.toFixed(1) || 'N/A'}%)`);
      
      if (resultado.estadisticasExtendidas) {
        console.log('\n📈 Estadísticas extendidas:');
        console.log(`    Throughput: ${resultado.estadisticasExtendidas.analisis?.throughput?.toFixed(3) || 'N/A'}`);
        console.log(`    Eficiencia CPU: ${resultado.estadisticasExtendidas.analisis?.eficienciaCPU?.toFixed(1) || 'N/A'}%`);
      }
      
      console.log('\n✅ El StatsPanel debería funcionar correctamente con estos datos');
    } else {
      console.log('\n❌ No hay métricas disponibles para mostrar en StatsPanel');
    }
  } catch (error) {
    console.log('❌ Error en test UI:', error);
  }
}

testCompleteUIFlow();
