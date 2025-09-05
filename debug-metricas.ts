import { MotorSimulacion } from './src/lib/core/engine.js';
import { calcularMetricasCompletas } from './src/lib/core/metrics.js';
import { calcularEstadisticasExtendidas } from './src/lib/application/usecases/computeStatistics.js';

const workload = {
  workloadName: 'Debug Métricas',
  processes: [
    {
      name: 'P1',
      tiempoArribo: 0,
      rafagasCPU: 1,
      duracionRafagaCPU: 5,
      duracionRafagaES: 0,
      prioridad: 50
    }
  ],
  config: {
    policy: 'FCFS' as const,
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

console.log('🧪 Debug - Test Métricas Simples');
console.log('='.repeat(50));

const sim = new MotorSimulacion(workload);
const resultado = sim.ejecutar();

if (resultado.exitoso) {
  console.log('\n✅ Simulación exitosa');
  
  // Calcular métricas desde el estado final
  const metricas = calcularMetricasCompletas(resultado.estadoFinal);
  console.log('📊 Métricas calculadas:');
  console.log('  Métricas por proceso:', metricas.porProceso);
  console.log('  Métricas de tanda:', metricas.tanda);
  
  console.log('\n📈 Estadísticas extendidas:');
  const estadisticas = calcularEstadisticasExtendidas(
    metricas,
    resultado.eventosExportacion,
    resultado.estadoFinal.tiempoActual
  );
  console.log('  Análisis:', estadisticas.analisis);
  console.log('  Throughput:', estadisticas.analisis.throughput);
  console.log('  Eficiencia CPU:', estadisticas.analisis.eficienciaCPU);
} else {
  console.log('❌ Simulación falló:', resultado.error);
}
