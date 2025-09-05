import { runSimulationWithTimeout } from './src/lib/application/usecases/simulationRunner.js';

// Simular el workload que se cargaría desde un archivo CSV/TXT simple
const workloadFromFile = {
  workloadName: 'Test UI - Desde archivo',
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
    },
    {
      name: 'P3',
      tiempoArribo: 4,
      rafagasCPU: 1,
      duracionRafagaCPU: 8,
      duracionRafagaES: 0,
      prioridad: 90
    }
  ],
  config: {
    policy: 'FCFS' as const,
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

console.log('🧪 Test - Simulando flujo UI exacto');
console.log('='.repeat(60));

async function testUIExactFlow() {
  try {
    console.log('📝 Simulando: Cargar archivo, configurar, ejecutar...');
    
    // Este es el mismo método que usa useSimulationUI.ts
    const result = await runSimulationWithTimeout(workloadFromFile);
    
    console.log('\n========== RESULTADO COMPLETO ==========');
    console.log('Simulación completada:', result.simulacionCompletada);
    console.log('Simulación en curso:', result.simulacionEnCurso);
    console.log('Errores:', result.errors);
    console.log('Advertencias:', result.advertencias);
    
    // Esto simula lo que hace updateSimulationResults
    console.log('\n========== DATOS PARA UI ==========');
    console.log('Events:', result.events?.length || 0, 'eventos');
    console.log('Metrics exists:', !!result.metrics);
    console.log('Metrics:', result.metrics);
    console.log('EstadisticasExtendidas exists:', !!result.estadisticasExtendidas);
    console.log('EstadisticasExtendidas:', result.estadisticasExtendidas);
    console.log('TiempoTotalSimulacion:', result.tiempoTotalSimulacion);
    
    // Verificar la estructura exacta que espera StatsPanel
    console.log('\n========== VERIFICACIÓN STATSPANEL ==========');
    const simState = {
      simulacionCompletada: result.simulacionCompletada,
      metrics: result.metrics,
      estadisticasExtendidas: result.estadisticasExtendidas,
      events: result.events,
      tiempoTotalSimulacion: result.tiempoTotalSimulacion
    };
    
    const conditionResult = simState.simulacionCompletada && 
                           simState.metrics && 
                           simState.metrics.porProceso;
    
    console.log('Condición StatsPanel:', conditionResult);
    console.log('  simulacionCompletada:', simState.simulacionCompletada);
    console.log('  metrics exists:', !!simState.metrics);
    console.log('  metrics.porProceso exists:', !!simState.metrics?.porProceso);
    console.log('  metrics.porProceso length:', simState.metrics?.porProceso?.length);
    
    if (conditionResult) {
      console.log('\n✅ StatsPanel debería renderizarse con estos datos:');
      console.log('Métricas por proceso:', simState.metrics.porProceso);
      console.log('Métricas de tanda:', simState.metrics.tanda);
    } else {
      console.log('\n❌ StatsPanel NO se renderizará. Falta algún dato.');
    }
    
  } catch (error) {
    console.log('❌ Error en test UI:', error);
  }
}

testUIExactFlow();
