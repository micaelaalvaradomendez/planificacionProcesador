
import { MotorSimulacion, type ResultadoSimulacion } from '../../src/lib/core/engine';

const workload = {
  workloadName: 'Test CPU Ociosa',
  processes: [{
    name: 'P1',
    tiempoArribo: 0,
    rafagasCPU: 1,
    duracionRafagaCPU: 5,
    duracionRafagaES: 0,
    prioridad: 50
  }, {
    name: 'P2',
    tiempoArribo: 10, // Llega después de que P1 termine
    rafagasCPU: 1,
    duracionRafagaCPU: 3,
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

console.log('🧪 Test CPU Ociosa - Dos procesos con gap temporal');
const sim = new MotorSimulacion(workload);
const resultado: ResultadoSimulacion = sim.ejecutar();

if (resultado.exitoso) {
  console.log('📊 Estado final:');
  console.log('  Tiempo total:', resultado.estadoFinal.tiempoActual);
  console.log('  CPU procesos:', resultado.estadoFinal.contadoresCPU.procesos);
  console.log('  CPU SO:', resultado.estadoFinal.contadoresCPU.sistemaOperativo);
  console.log('  CPU ociosa:', resultado.estadoFinal.contadoresCPU.ocioso);
  
  const total = resultado.estadoFinal.contadoresCPU.procesos + 
               resultado.estadoFinal.contadoresCPU.sistemaOperativo + 
               resultado.estadoFinal.contadoresCPU.ocioso;
  console.log('  Total:', total);
  
  // Verificar que existe tiempo de CPU ociosa entre P1 y P2
  const tiempoOciosoEsperado = 10 - (5 + 1 + 1); // P2 llega en t=10, P1 termina en t=7 (5+1+1)
  console.log(`\n✅ Expectativa: CPU ociosa >= ${tiempoOciosoEsperado}`);
  console.log(`✅ Resultado: CPU ociosa = ${resultado.estadoFinal.contadoresCPU.ocioso}`);
  
  if (resultado.estadoFinal.contadoresCPU.ocioso >= tiempoOciosoEsperado) {
    console.log('✅ TEST PASÓ: CPU ociosa correctamente contabilizada');
  } else {
    console.log('❌ TEST FALLÓ: CPU ociosa no se está contabilizando correctamente');
  }
} else {
  console.error('❌ Simulación falló:', resultado.error);
}
