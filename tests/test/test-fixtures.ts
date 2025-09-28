import { get } from 'svelte/store';
import { loadFixture, executeSimulation } from '$lib/stores/simulacion';
import { simulationResult, simulationConfig, procesos } from '$lib/stores/simulacion';

console.log('Testing fixtures...\n');

// Test fixture A_sinES_FCFS
console.log('1. Testing A_sinES_FCFS:');
loadFixture('A_sinES_FCFS');
console.log('Config:', get(simulationConfig));
console.log('Procesos:', get(procesos));
await executeSimulation();
const result1 = get(simulationResult);
console.log('Métricas:', result1?.metricas.global);
console.log('');

// Test fixture B_conES_25
console.log('2. Testing B_conES_25:');
loadFixture('B_conES_25');
console.log('Config:', get(simulationConfig));
console.log('Procesos:', get(procesos));
await executeSimulation();
const result2 = get(simulationResult);
console.log('Métricas:', result2?.metricas.global);
console.log('');

// Test fixture RR_q2
console.log('3. Testing RR_q2:');
loadFixture('RR_q2');
console.log('Config:', get(simulationConfig));
console.log('Procesos:', get(procesos));
await executeSimulation();
const result3 = get(simulationResult);
console.log('Métricas:', result3?.metricas.global);
console.log('');

// Test fixture SRTN_preempt
console.log('4. Testing SRTN_preempt:');
loadFixture('SRTN_preempt');
console.log('Config:', get(simulationConfig));
console.log('Procesos:', get(procesos));
await executeSimulation();
const result4 = get(simulationResult);
console.log('Métricas:', result4?.metricas.global);
console.log('');

console.log('All fixtures tested successfully!');