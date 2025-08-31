import { MotorSimulacion } from '../../src/lib/core/engine';
import type { Workload } from '../../src/lib/model/types';

// Test específico para debuggear qué pasa con P2
console.log('🔍 Debug P2 en FCFS');
console.log('===================');

// Test Case: P1 llega en t=0, P2 llega en t=2
// P1 tiene ráfaga de 10, debería terminar después
// P2 debería despacharse después de P1
const test1: Workload = {
  processes: [
    { name: 'P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 10, duracionRafagaES: 0, prioridad: 1 },
    { name: 'P2', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'FCFS', tip: 0, tfp: 1, tcp: 1 }
};

console.log('🚀 Iniciando simulación...');

const motor = new MotorSimulacion(test1);
const resultado = motor.ejecutar();

console.log('🏁 Resultado final:');
console.log('Tiempo final:', resultado.estadoFinal.tiempoActual);

// Analizar eventos detalladamente
console.log('\n📋 EVENTOS DETALLADOS:');
resultado.eventosInternos.forEach((evento, i) => {
  console.log(`${i + 1}. ${evento.tiempo}: ${evento.tipo} - ${evento.proceso}`);
});

// Analizar despachos específicamente
const despachos = resultado.eventosInternos.filter(e => e.tipo === 'Despacho');
console.log('\n📋 DESPACHOS:');
despachos.forEach((d, i) => {
  console.log(`${i + 1}. Tiempo ${d.tiempo}: ${d.proceso}`);
});

// Analizar llegadas
const arribos = resultado.eventosInternos.filter(e => e.tipo === 'Arribo');
console.log('\n📋 ARRIBOS:');
arribos.forEach((a, i) => {
  console.log(`${i + 1}. Tiempo ${a.tiempo}: ${a.proceso}`);
});

// Analizar finalizaciones
const finTFP = resultado.eventosInternos.filter(e => e.tipo === 'FinTFP');
console.log('\n📋 FINALIZACIONES (FinTFP):');
finTFP.forEach((f, i) => {
  console.log(`${i + 1}. Tiempo ${f.tiempo}: ${f.proceso}`);
});

console.log('\n✅ Test completado');