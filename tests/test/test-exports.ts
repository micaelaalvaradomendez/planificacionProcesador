import { get } from 'svelte/store';
import { loadFixture, executeSimulation, exportResultadoJSON, exportMetricasCSV, exportTraceCSV } from '$lib/stores/simulacion';
import { simulationResult } from '$lib/stores/simulacion';

console.log('Testing exports...\n');

// Cargar fixture y ejecutar
loadFixture('A_sinES_FCFS');
await executeSimulation();

const result = get(simulationResult);
console.log('Resultado generado:', result ? 'Sí' : 'No');

// Test exports (solo mostrar que no fallan)
try {
  exportResultadoJSON();
  console.log('Export JSON: OK');
} catch (error) {
  console.log('Export JSON error:', error);
}

try {
  exportMetricasCSV();
  console.log('Export Métricas CSV: OK');
} catch (error) {
  console.log('Export Métricas CSV error:', error);
}

try {
  exportTraceCSV();
  console.log('Export Trace CSV: OK');  
} catch (error) {
  console.log('Export Trace CSV error:', error);
}

console.log('\n¡Tests de export completados!');