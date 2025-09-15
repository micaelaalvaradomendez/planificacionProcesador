/**
 * Test del motor ÚNICO que usa entidades del dominio
 */
import { ejecutarSimulacionCompleta } from '../../src/lib/application/usecases/runSimulation';
import type { Workload } from '../../src/lib/domain/types';

// Workload de ejemplo simple
const workloadTest: Workload = {
  workloadName: "test-motor-unico",
  processes: [
    {
      name: "P1",
      tiempoArribo: 0,
      rafagasCPU: 2,
      duracionRafagaCPU: 3,
      duracionRafagaES: 1,
      prioridad: 1
    },
    {
      name: "P2", 
      tiempoArribo: 1,
      rafagasCPU: 1,
      duracionRafagaCPU: 4,
      duracionRafagaES: 2,
      prioridad: 2
    }
  ],
  config: {
    policy: "FCFS",
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

console.log('🧪 Test del motor ÚNICO (entidades del dominio)...\n');

async function main() {
  try {
    console.log('🚀 Iniciando simulación...');
    
    // Solo hay UN motor ahora - el del dominio
    const resultado = await ejecutarSimulacionCompleta(workloadTest);
    
    if (resultado.exitoso) {
      console.log('🎉 ¡Simulación exitosa!');
      console.log(`⏱️  Tiempo final: ${resultado.tiempoTotal}`);
      console.log(`📊 Eventos: ${resultado.eventos.length}`);
      console.log(`🖥️  CPU Ocioso: ${resultado.metricas.tanda.cpuOcioso}`);
      console.log(`🏭 CPU SO: ${resultado.metricas.tanda.cpuSO}`);
      console.log(`👥 CPU Procesos: ${resultado.metricas.tanda.cpuProcesos}`);
      
      console.log('\n📋 Métricas por proceso:');
      resultado.metricas.porProceso.forEach(p => {
        console.log(`  ${p.name}: TR=${p.tiempoRetorno}, TRn=${p.tiempoRetornoNormalizado.toFixed(2)}`);
      });
      
      if (resultado.advertencias && resultado.advertencias.length > 0) {
        console.log('\n⚠️  Advertencias:');
        resultado.advertencias.forEach(adv => console.log(`  - ${adv}`));
      }
      
      console.log('\n✅ El motor único con entidades del dominio funciona correctamente');
      
    } else {
      console.error('❌ Error en la simulación:', resultado.error);
    }
    
  } catch (error) {
    console.error('💥 Error fatal:', error);
  }
}

main();
