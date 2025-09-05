

<script lang="ts">
import UploadFileWithPreview from '$lib/ui/components/UploadFileWithPreview.svelte';
import Controls from '$lib/ui/components/Controls.svelte';
import Gantt from '$lib/ui/components/Gantt.svelte';
import StatsPanel from '$lib/ui/components/StatsPanel.svelte';
import LogViewer from '$lib/ui/components/LogViewer.svelte';
import EventsPanel from '$lib/ui/components/EventsPanel.svelte';
import { construirDiagramaGantt, validarDiagramaGantt } from '$lib/application/usecases/buildGantt';
import { simState } from '$lib/stores/simulation';
import { exportarEventosCsv, exportarEventosJson } from '$lib/infrastructure/io/exportEvents';

import type { DiagramaGantt } from '$lib/application/usecases/buildGantt';

let diagrama: DiagramaGantt | undefined;
let validacion: ReturnType<typeof validarDiagramaGantt> | undefined;


$: diagrama = ($simState.events && $simState.events.length > 0) ? construirDiagramaGantt($simState.events) : undefined;
$: validacion = diagrama ? validarDiagramaGantt(diagrama) : undefined;

function exportCSV() {
	if ($simState.events && $simState.events.length > 0) {
		const blob = exportarEventosCsv($simState.events);
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'eventos_simulacion.csv';
		a.click();
		URL.revokeObjectURL(url);
	}
}

function exportJSON() {
	if ($simState.events && $simState.events.length > 0) {
		const blob = exportarEventosJson($simState.events);
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'eventos_simulacion.json';
		a.click();
		URL.revokeObjectURL(url);
	}
}
</script>


<!-- 1. Cargar archivo y mostrar procesos -->
<UploadFileWithPreview />
{#if $simState.loaded && $simState.workload}
	<h3>Procesos cargados</h3>
	<ul>
		{#each $simState.workload.processes as p}
			<li>{p.name} (Arribo: {p.tiempoArribo}, Ráfagas: {p.rafagasCPU}, Prioridad: {p.prioridad})</li>
		{/each}
	</ul>

	<!-- 2. Selección de política y variables -->
	<Controls />

	<!-- 3. Ejecutar simulación y mostrar Gantt -->
	{#if diagrama}
		<h2>Diagrama de Gantt</h2>
		<Gantt gantt={diagrama} />
		{#if validacion && !validacion.valido}
			<div class="errores">
				<h3>Errores en el diagrama:</h3>
				<ul>
					{#each validacion.errores as err}
						<li>{err}</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if validacion && validacion.advertencias.length > 0}
			<div class="advertencias">
				<h3>Advertencias:</h3>
				<ul>
					{#each validacion.advertencias as adv}
						<li>{adv}</li>
					{/each}
				</ul>
			</div>
		{/if}
		<!-- 4. Métricas y logs -->
		<StatsPanel 
			simState={$simState} 
			onDescargarEventos={() => console.log('Descargar eventos')} 
			onDescargarMetricas={() => console.log('Descargar métricas')} 
		/>
		<!-- <LogViewer simState={$simState} /> -->
		
		<!-- Panel de eventos con descarga integrada -->
		<EventsPanel events={$simState.events || []} />
		
		<!-- 5. Botones de exportación legacy (ahora redundantes) -->
		<!-- <button on:click={exportCSV}>Exportar CSV</button>
		<button on:click={exportJSON}>Exportar JSON</button> -->
	{/if}
{/if}
