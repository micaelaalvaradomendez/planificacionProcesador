

<script lang="ts">
import UploadFileWithPreview from '$lib/ui/components/UploadFileWithPreview.svelte';
import Controls from '$lib/ui/components/Controls.svelte';
import Gantt from '$lib/ui/components/Gantt.svelte';
import StatsPanel from '$lib/ui/components/StatsPanel.svelte';
import { construirDiagramaGantt } from '$lib/application/usecases/buildGantt';
import { simState } from '$lib/stores/simulation';
import { onMount } from 'svelte';

import type { DiagramaGantt } from '$lib/application/usecases/buildGantt';

// Debug de renders
let contenedorGantt: HTMLElement;

onMount(() => {
    console.log('🎯 Página de simulación montada');
});

$: if ($simState.simulacionCompletada) {
    console.log('🔍 Estado de renderizado:', {
        haySimulacion: $simState.simulacionCompletada,
        hayDiagrama: !!diagrama,
        datosGantt: diagrama ? {
            tiempoTotal: diagrama.tiempoTotal,
            segmentos: diagrama.segmentos.length,
            procesos: diagrama.procesos
        } : null,
        elementosDOM: {
            contenedorGantt: !!contenedorGantt,
            ganttSection: document.querySelector('.gantt-section'),
            ganttContainer: document.querySelector('.gantt-container'),
            todosLosDivs: document.querySelectorAll('div').length
        }
    });
}

// Estado local
let diagrama: DiagramaGantt | undefined;

// Construir diagrama cuando la simulación está completada y hay ganttSlices
$: {
    if ($simState.simulacionCompletada && $simState.ganttSlices.length > 0) {
        diagrama = {
            segmentos: $simState.ganttSlices,
            tiempoTotal: $simState.tiempoTotalSimulacion,
            procesos: [...new Set($simState.ganttSlices.map(s => s.process))].sort(),
            estadisticas: {
                utilizacionCPU: 0, // Se calculará más tarde si es necesario
                tiempoOcioso: 0,
                tiempoSO: 0,
                segmentosPorProceso: new Map(),
                duracionPromedioPorTipo: new Map()
            }
        };
        console.log('✅ Diagrama listo para render:', {
            segmentos: diagrama.segmentos.length,
            tiempoTotal: diagrama.tiempoTotal,
            procesos: diagrama.procesos.length
        });
    } else {
        console.log('⏳ Esperando datos para diagrama...', {
            simulacionCompletada: $simState.simulacionCompletada,
            ganttSlices: $simState.ganttSlices.length
        });
        diagrama = undefined;
    }
}
            primerSegmento: diagrama?.segmentos[0],
            ultimoSegmento: diagrama?.segmentos[diagrama?.segmentos.length - 1]
        });

        // Verificar si el diagrama es válido para renderizar
        if (diagrama?.segmentos.length === 0) {
            console.warn('⚠️ El diagrama no tiene segmentos');
        }
        if (!diagrama?.tiempoTotal) {
            console.warn('⚠️ El diagrama no tiene tiempo total');
        }
        
        validacion = validarDiagramaGantt(diagrama);
        if (!validacion.valido) {
            console.error('❌ El diagrama no es válido:', validacion.errores);
        }
    } else {
        console.log('❌ No hay eventos para construir el diagrama');
        diagrama = undefined;
    }


$: {
    if (diagrama) {
        validacion = validarDiagramaGantt(diagrama);
        if (validacion) {
            console.log('Validación del diagrama:', {
                valido: validacion.valido,
                errores: validacion.errores,
                advertencias: validacion.advertencias
            });
        }
    } else {
        validacion = undefined;
    }
}

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



<div class="simulation-page">
    <!-- 1. Cargar archivo -->
    <section class="section">
        <UploadFileWithPreview />
    </section>

    <!-- 2. Configuración -->
    <section class="section">
        <Controls />
    </section>

    <!-- 3. Estado y Debug -->
    {#if $simState.loaded}
        <section class="section debug-panel">
            <h3>Estado de Simulación</h3>
            <pre>{JSON.stringify({
                cargado: $simState.loaded,
                enCurso: $simState.simulacionEnCurso,
                completada: $simState.simulacionCompletada,
                eventos: $simState.events?.length || 0,
                tiempoTotal: $simState.tiempoTotalSimulacion
            }, null, 2)}</pre>
        </section>

        <!-- 4. Gantt (si hay simulación completada) -->
        {#if $simState.simulacionCompletada && diagrama}
            <section class="section gantt-panel">
                <h3>Diagrama de Gantt</h3>
                
                <div class="debug-info" style="margin-bottom: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 4px;">
                    <strong>Debug Info:</strong>
                    <pre>{JSON.stringify({
                        tiempoTotal: diagrama.tiempoTotal,
                        segmentos: diagrama.segmentos.length,
                        procesos: diagrama.procesos
                    }, null, 2)}</pre>
                </div>

                <div style="border: 2px solid #4CAF50; padding: 1rem; margin: 1rem 0;">
                    <Gantt {diagrama} />
                </div>
            </section>
        {/if}
    {/if}

    <!-- 5. Stats Panel siempre visible si hay datos -->
    {#if $simState.simulacionCompletada}
        <section class="section">
            <StatsPanel />
        </section>
    {/if}
</div>

<style>
    .simulation-page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem;
    }

    .section {
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .section h3 {
        margin: 0 0 1rem 0;
        color: #2c3e50;
    }

    pre {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 4px;
        overflow-x: auto;
    }

    .debug-panel {
        border: 1px solid #e9ecef;
    }

    .gantt-panel {
        border: 1px solid #4CAF50;
    }
</style>
	</script>

<div class="simulation-page">
    <!-- 1. Upload y Config -->
    <section class="section">
        <UploadFileWithPreview />
        <Controls />
    </section>

    <!-- 2. Estado -->
    <section class="section">
        <h3>Estado de Simulación</h3>
        <pre>{JSON.stringify({
            cargado: $simState.loaded,
            enCurso: $simState.simulacionEnCurso,
            completada: $simState.simulacionCompletada,
            eventos: $simState.events?.length || 0
        }, null, 2)}</pre>
    </section>

    <!-- 3. Diagrama de Gantt -->
    <div class="debug-panel" style="margin: 2rem 0; padding: 1rem; border: 2px solid #cbd5e0; border-radius: 8px;">
        <h3 style="margin-bottom: 1rem;">Debug Panel</h3>
        <pre style="background: #2d3748; color: white; padding: 1rem; border-radius: 4px;">
Estado simulación: {$simState.simulacionCompletada ? 'Completada' : 'No completada'}
Hay diagrama: {!!diagrama}
{#if diagrama}
Tiempo total: {diagrama.tiempoTotal}
Segmentos: {diagrama.segmentos.length}
Procesos: {diagrama.procesos.join(', ')}
{/if}
        </pre>
    </div>

    <!-- Gantt Chart -->
    <section class="section gantt-section" bind:this={contenedorGantt}>
        <h3 style="color: #2d3748; margin-bottom: 1rem;">Diagrama de Gantt</h3>
        
        {#if $simState.simulacionCompletada}
            {#if diagrama}
                <div class="gantt-container" style="border: 2px solid red; padding: 1rem; margin: 1rem 0;">
                    <p style="color: blue; font-weight: bold; margin-bottom: 1rem;">↓ Gantt Component ↓</p>
                    
                    <div style="background: #f7fafc; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
                        <h4 style="margin-bottom: 0.5rem;">Estado del Componente:</h4>
                        <ul>
                            <li>Tiempo total: {diagrama.tiempoTotal}</li>
                            <li>Total segmentos: {diagrama.segmentos.length}</li>
                            <li>Procesos: {diagrama.procesos.length}</li>
                        </ul>
                    </div>
                    
                    <Gantt gantt={diagrama} />
                </div>
            {:else}
                <div class="error-message">❌ Error: No se pudo generar el diagrama</div>
            {/if}
        {:else}
            <div class="warning-message">⚠️ Ejecuta la simulación para ver el diagrama</div>
        {/if}
    </section>

    <!-- 4. Stats -->
    {#if $simState.simulacionCompletada}
        <section class="section">
            <StatsPanel />
        </section>
    {/if}
</div>
			<p>El diagrama no pudo ser construido.</p>
			<p>Estado actual:</p>
			<ul>
				<li>Eventos: {$simState.events?.length || 0}</li>
				<li>Workload cargado: {$simState.workload ? 'Sí' : 'No'}</li>
				<li>Simulación completada: {$simState.simulacionCompletada ? 'Sí' : 'No'}</li>
				<li>Simulación en curso: {$simState.simulacionEnCurso ? 'Sí' : 'No'}</li>
			</ul>
		</div>
	{/if}
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
		
			{/if}
{/if}

<style>
	.sim-status {
		margin: 2rem 0;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #e9ecef;
	}

	.sim-status h3 {
		margin: 0 0 1rem 0;
		color: #495057;
	}

	.sim-status ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.sim-status li {
		margin: 0.5rem 0;
		color: #6c757d;
	}

	.gantt-section {
		margin: 2rem 0;
		padding: 2rem;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}

	.gantt-section h3 {
		margin: 0 0 1.5rem 0;
		color: #333;
		font-size: 1.5rem;
	}

	.gantt-debug {
		margin-bottom: 2rem;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 4px;
		border: 1px solid #e9ecef;
	}

	.gantt-debug p {
		margin: 0 0 0.5rem 0;
		font-weight: bold;
		color: #495057;
	}

	.gantt-debug ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.gantt-section {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		margin: 1.5rem 0;
		box-shadow: 0 1px 3px rgba(0,0,0,0.1);
	}

	.debug-info {
		background: #f8f9fa;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		padding: 1rem;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
	}

	.debug-info h4 {
		color: #4a5568;
		margin: 0 0 0.5rem 0;
	}

	.debug-info ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.debug-info li {
		margin-bottom: 0.25rem;
		color: #4a5568;
	}

	.debug-info details {
		margin-top: 1rem;
	}

	.debug-info summary {
		cursor: pointer;
		color: #4a5568;
		font-weight: 500;
	}

	.debug-info pre {
		background: #2d3748;
		color: #e2e8f0;
		padding: 0.75rem;
		border-radius: 4px;
		overflow: auto;
		font-size: 0.75rem;
		margin-top: 0.5rem;
	}

	.gantt-container {
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		padding: 1rem;
		margin-top: 1rem;
		background: white;
		overflow: auto;
	}

	.error-message {
		color: #e53e3e;
		text-align: center;
		padding: 2rem;
		background: #fff5f5;
		border: 1px solid #feb2b2;
		border-radius: 6px;
		margin-top: 1rem;
	}

	.warning-message {
		color: #d69e2e;
		text-align: center;
		padding: 2rem;
		background: #fffff0;
		border: 1px solid #fbd38d;
		border-radius: 6px;
		margin-top: 1rem;
	}
</style>
