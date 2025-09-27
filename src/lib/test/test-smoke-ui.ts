// Mini smoke test para verificar que los componentes se importan correctamente
import PolicySelector from '$lib/components/PolicySelector.svelte';
import CostConfigForm from '$lib/components/CostConfigForm.svelte';
import ProcessTableEditor from '$lib/components/ProcessTableEditor.svelte';
import FileImporter from '$lib/components/FileImporter.svelte';
import RunButton from '$lib/components/RunButton.svelte';
import GanttView from '$lib/components/GanttView.svelte';
import MetricsTable from '$lib/components/MetricsTable.svelte';
import TraceViewer from '$lib/components/TraceViewer.svelte';

console.log('✅ Todos los componentes se importan correctamente');

// Test de fixture rápido
import { loadFixture, executeSimulation, clearSimulation } from '$lib/stores/simulacion';
import { get } from 'svelte/store';
import { simulationResult, simulationConfig, procesos } from '$lib/stores/simulacion';

console.log('🧪 Testing smoke test de stores...');

// Limpiar estado
clearSimulation();

// Cargar fixture A_sinES_FCFS
loadFixture('A_sinES_FCFS');

const config = get(simulationConfig);
const procesosData = get(procesos);

console.log('Config loaded:', config.politica, procesosData.length, 'procesos');

// Ejecutar
await executeSimulation();

const result = get(simulationResult);
console.log('Result:', result ? 'OK' : 'FAIL');

if (result) {
  console.log('Gantt tracks:', result.gantt.tracks.length);
  console.log('Métricas globales TRp:', result.metricas.global.TRpPromedio);
  console.log('Trace events:', result.trace.events.length);
}

console.log('🎉 Smoke test completado exitosamente!');