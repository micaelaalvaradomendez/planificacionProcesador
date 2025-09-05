import { ejecutarSimulacionCompleta } from './src/lib/application/usecases/runSimulation.js';

// Cargar workload desde el archivo de ejemplo
const workload = {
  workloadName: 'Test UI Debug',
  processes: [
    {
      name: 'P1',
      tiempoArribo: 0,
      rafagasCPU: 1,
      duracionRafagaCPU: 5,
      duracionRafagaES: 0,
      prioridad: 2
    },
    {
      name: 'P2',
      tiempoArribo: 1,
      rafagasCPU: 1,
      duracionRafagaCPU: 3,
      duracionRafagaES: 0,
      prioridad: 1
    }
  ],
  config: {
    policy: 'FCFS' as const,
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

console.log('🧪 Debug - Test UI Simulation');
console.log('='.repeat(50));

async function testUISimulation() {
  try {
    const resultado = await ejecutarSimulacionCompleta(workload);
    
    if (resultado.exitoso) {
      console.log('\n✅ Simulación UI exitosa');
      console.log('📊 Estructura de resultado para UI:');
      console.log('  Eventos:', resultado.eventos.length);
      console.log('  Métricas:', resultado.metricas);
      console.log('  Tiempo total:', resultado.tiempoTotal);
      console.log('  Advertencias:', resultado.advertencias);
      
      console.log('\n📈 Detalles de métricas:');
      console.log('  Por proceso:', resultado.metricas.porProceso);
      console.log('  Tanda:', resultado.metricas.tanda);
      
      // Verificar si los porcentajes están calculados
      const tanda = resultado.metricas.tanda;
      console.log('\n🔍 Porcentajes CPU:');
      console.log('  Ocioso:', tanda.porcentajeCpuOcioso);
      console.log('  SO:', tanda.porcentajeCpuSO);
      console.log('  Procesos:', tanda.porcentajeCpuProcesos);
    } else {
      console.log('❌ Simulación UI falló:', resultado.error);
    }
  } catch (error) {
    console.log('❌ Error:', error);
  }
}

testUISimulation();
