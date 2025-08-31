import { MotorSimulacion, type ResultadoSimulacion } from './src/lib/core/engine';

console.log('🔍 Test Debug - CPU SO Simple');
console.log('='.repeat(40));

// Test más simple: TIP=1, TFP=1, TCP=1
const workload = {
  workloadName: 'Debug Simple',
  processes: [{
    name: 'P1',
    tiempoArribo: 0,
    rafagasCPU: 1,
    duracionRafagaCPU: 2,
    duracionRafagaES: 0,
    prioridad: 50
  }],
  config: {
    policy: 'FCFS' as const,
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

console.log('Configuración:');
console.log(`  TIP: ${workload.config.tip}`);
console.log(`  TFP: ${workload.config.tfp}`);
console.log(`  TCP: ${workload.config.tcp}`);
console.log(`  Esperado total: ${workload.config.tip + workload.config.tfp + workload.config.tcp} (1+1+1=3)`);

const sim = new MotorSimulacion(workload);
const resultado: ResultadoSimulacion = sim.ejecutar();

if (resultado.exitoso) {
  console.log('\nResultado:');
  console.log(`  CPU SO obtenida: ${resultado.estadoFinal.contadoresCPU.sistemaOperativo}`);
  console.log(`  CPU Procesos: ${resultado.estadoFinal.contadoresCPU.procesos}`);
  console.log(`  CPU Ociosa: ${resultado.estadoFinal.contadoresCPU.ocioso}`);
  console.log(`  Tiempo total: ${resultado.estadoFinal.tiempoActual}`);
  
  console.log('\nEventos internos generados:');
  resultado.estadoFinal.eventosInternos.forEach((evento, i) => {
    console.log(`  ${i+1}. ${evento.tiempo}: ${evento.tipo} - ${evento.proceso}`);
  });
  
  const esperado = workload.config.tip + workload.config.tfp + workload.config.tcp;
  const actual = resultado.estadoFinal.contadoresCPU.sistemaOperativo;
  
  console.log(`\n${actual === esperado ? '✅ CORRECTO' : '❌ ERROR'}: CPU SO ${actual} ${actual === esperado ? '==' : '!='} ${esperado}`);
  
  if (actual !== esperado) {
    console.log('\n🔧 Análisis de la diferencia:');
    console.log(`  Diferencia: ${actual - esperado} unidades extra`);
    console.log('  Posibles causas:');
    console.log('  - Eventos duplicados');
    console.log('  - Contabilización incorrecta');
    console.log('  - Lógica de TIP/TFP/TCP mal implementada');
  }
} else {
  console.log('❌ Simulación falló:', resultado.error);
}
