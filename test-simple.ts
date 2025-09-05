/**
 * Test simple para verificar que el motor funciona
 */

import { MotorSimulacion } from './src/lib/core/engine';

const workload = {
  config: {
    policy: 'FCFS' as const,
    tip: 1,
    tfp: 1,
    tcp: 1
  },
  processes: [
    { 
      name: 'P1', 
      tiempoArribo: 0, 
      rafagasCPU: 1,     
      duracionRafagaCPU: 2, 
      duracionRafagaES: 0, 
      prioridad: 1 
    }
  ]
};

console.log('Ejecutando simulación simple...');
const motor = new MotorSimulacion(workload);
const resultado = motor.ejecutar();

console.log('✅ Simulación completada');
console.log(`Eventos internos: ${resultado.eventosInternos.length}`);
console.log(`Eventos exportación: ${resultado.eventosExportacion.length}`);

// Mostrar primeros eventos
console.log('\nPrimeros eventos internos:');
resultado.eventosInternos.slice(0, 5).forEach(e => {
  console.log(`t=${e.tiempo}: ${e.tipo} ${e.proceso || ''}`);
});
