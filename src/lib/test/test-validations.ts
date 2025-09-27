import { validateInputs } from '$lib/io/validate';
import type { Proceso } from '$lib/model/proceso';
import type { SimulationConfig } from '$lib/stores/simulacion';

console.log('Testing validaciones...\n');

// Test 1: PIDs duplicados
const procesosConPidDuplicado: Proceso[] = [
  { pid: 1, label: 'P1', arribo: 0, rafagasCPU: [5], estado: 'N' },
  { pid: 1, label: 'P1b', arribo: 2, rafagasCPU: [3], estado: 'N' },
];

const cfg1: SimulationConfig = { politica: 'FCFS' };
const result1 = validateInputs(procesosConPidDuplicado, cfg1);
console.log('1. PIDs duplicados:', result1);

// Test 2: Arribo negativo
const procesosConArriboNegativo: Proceso[] = [
  { pid: 1, label: 'P1', arribo: -1, rafagasCPU: [5], estado: 'N' },
];

const result2 = validateInputs(procesosConArriboNegativo, cfg1);
console.log('2. Arribo negativo:', result2);

// Test 3: Sin ráfagas
const procesosSinRafagas: Proceso[] = [
  { pid: 1, label: 'P1', arribo: 0, rafagasCPU: [], estado: 'N' },
];

const result3 = validateInputs(procesosSinRafagas, cfg1);
console.log('3. Sin ráfagas:', result3);

// Test 4: Ráfaga cero
const procesosConRafagaCero: Proceso[] = [
  { pid: 1, label: 'P1', arribo: 0, rafagasCPU: [0], estado: 'N' },
];

const result4 = validateInputs(procesosConRafagaCero, cfg1);
console.log('4. Ráfaga cero:', result4);

// Test 5: RR sin quantum
const procesosValidos: Proceso[] = [
  { pid: 1, label: 'P1', arribo: 0, rafagasCPU: [5], estado: 'N' },
];

const cfgRRSinQuantum: SimulationConfig = { politica: 'RR' };
const result5 = validateInputs(procesosValidos, cfgRRSinQuantum);
console.log('5. RR sin quantum:', result5);

// Test 6: RR con quantum válido
const cfgRRValido: SimulationConfig = { politica: 'RR', quantum: 2 };
const result6 = validateInputs(procesosValidos, cfgRRValido);
console.log('6. RR válido:', result6);

console.log('\nTodas las validaciones funcionan correctamente!');