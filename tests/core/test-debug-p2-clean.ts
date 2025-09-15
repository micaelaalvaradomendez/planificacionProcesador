import { MotorSimulacion } from '../../src/lib/core/engine';
import type { Workload } from '../../src/lib/domain/types';

// Test específico para debuggear qué pasa con P2
console.log('🔍 Debug P2 en FCFS');
console.log('===================');

const testDebug: Workload = {
  processes: [
    { name: 'P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 10, duracionRafagaES: 0, prioridad: 1 },
    { name: 'P2', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 1 }
  ],
  config: { policy: 'FCFS', tip: 0, tfp: 1, tcp: 1 }
};

console.log('🚀 Iniciando simulación...');

const motor = new MotorSimulacion(testDebug);
const resultado = motor.ejecutar();

console.log('🏁 Resultado:');
console.log('Tiempo transcurrido hasta finalización');

// Analizar todos los eventos
console.log('\n📋 TODOS LOS EVENTOS:');
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

// ¿Por qué solo se despacha P1?
console.log('\n🤔 ANÁLISIS:');
console.log(`- Total despachos: ${despachos.length}`);
console.log(`- Total arribos: ${arribos.length}`);
if (despachos.length === 1) {
  console.log('❌ P2 nunca se despacha - necesitamos ver por qué');
}
