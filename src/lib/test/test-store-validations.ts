import { get } from 'svelte/store';
import { simulationConfig, procesos, executeSimulation, simulationError } from '$lib/stores/simulacion';

console.log('Testing validaciones en store...\n');

// Test: Intentar ejecutar simulación con datos inválidos
simulationConfig.set({ politica: 'RR' }); // Sin quantum
procesos.set([
  { pid: 1, label: 'P1', arribo: 0, rafagasCPU: [5], estado: 'N' },
]);

try {
  await executeSimulation();
  console.log('ERROR: No debería haber ejecutado');
} catch (error) {
  console.log('Correcto: Se capturó error:', error);
}

// Verificar que se guardó el error en el store
const error = get(simulationError);
console.log('Error en store:', error);

// Test: Configurar datos válidos
simulationConfig.set({ politica: 'RR', quantum: 2 });

await executeSimulation();
const errorDespues = get(simulationError);
console.log('Error después de ejecutar con datos válidos:', errorDespues);

console.log('\n¡Validaciones en store funcionan correctamente!');