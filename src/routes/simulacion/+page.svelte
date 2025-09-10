
<script lang="ts">
import UploadFileWithPreview from '$lib/ui/components/UploadFileWithPreview.svelte';
import Controls from '$lib/ui/components/Controls.svelte';
import Gantt from '$lib/ui/components/Gantt.svelte';
import StatsPanel from '$lib/ui/components/StatsPanel.svelte';
import EventsPanel from '$lib/ui/components/EventsPanel.svelte';
import { exportarEventosCSV, exportarEventosJSON, convertirEventosExportacion } from '$lib/infrastructure/io/eventLogger';
import { simState } from '$lib/stores/simulation';
import { onMount } from 'svelte';

import type { DiagramaGantt } from '$lib/application/usecases/buildGantt';

onMount(() => {
    console.log('🎯 Página de simulación montada');
});

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
                utilizacionCPU: 0,
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
            ganttSlices: $simState.ganttSlices?.length || 0
        });
        diagrama = undefined;
    }
}

function exportCSV() {
    if ($simState.events && $simState.events.length > 0) {
        const eventosLog = convertirEventosExportacion($simState.events);
        const csvContent = exportarEventosCSV(eventosLog);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
        const eventosLog = convertirEventosExportacion($simState.events);
        const jsonContent = exportarEventosJSON(eventosLog);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
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
        <h2>📁 Cargar Archivo de Procesos</h2>
        <UploadFileWithPreview />
    </section>

    <!-- 2. Configuración y controles -->
    <section class="section">
        <h2>⚙️ Configuración de Simulación</h2>
        <Controls />
    </section>

    <!-- 3. Estado de simulación -->
    {#if $simState.loaded}
        <section class="section debug-panel">
            <h3>📊 Estado de Simulación</h3>
            <div class="status-grid">
                <div class="status-item">
                    <span class="label">Archivo cargado:</span>
                    <span class="value {$simState.loaded ? 'success' : 'error'}">
                        {$simState.loaded ? '✅' : '❌'}
                    </span>
                </div>
                <div class="status-item">
                    <span class="label">En curso:</span>
                    <span class="value {$simState.simulacionEnCurso ? 'warning' : 'neutral'}">
                        {$simState.simulacionEnCurso ? '⏳' : '⏸️'}
                    </span>
                </div>
                <div class="status-item">
                    <span class="label">Completada:</span>
                    <span class="value {$simState.simulacionCompletada ? 'success' : 'neutral'}">
                        {$simState.simulacionCompletada ? '✅' : '⏳'}
                    </span>
                </div>
                <div class="status-item">
                    <span class="label">Eventos generados:</span>
                    <span class="value">{$simState.events?.length || 0}</span>
                </div>
                <div class="status-item">
                    <span class="label">Tiempo total:</span>
                    <span class="value">{$simState.tiempoTotalSimulacion?.toFixed(2) || 'N/A'}</span>
                </div>
            </div>
        </section>

        <!-- 4. Diagrama de Gantt -->
        {#if $simState.simulacionCompletada}
            <section class="section gantt-section">
                <h3>📈 Diagrama de Gantt</h3>
                
                {#if diagrama}
                    <div class="gantt-info">
                        <h4>📋 Información del Diagrama</h4>
                        <ul>
                            <li><strong>Tiempo total:</strong> {diagrama.tiempoTotal} unidades</li>
                            <li><strong>Segmentos:</strong> {diagrama.segmentos.length}</li>
                            <li><strong>Procesos:</strong> {diagrama.procesos.join(', ')}</li>
                        </ul>
                    </div>
                    
                    <div class="gantt-container">
                        <Gantt gantt={diagrama} />
                    </div>
                {:else}
                    <div class="error-message">
                        ❌ No se pudo generar el diagrama de Gantt
                    </div>
                {/if}
            </section>

            <!-- 5. Métricas y estadísticas -->
            <section class="section">
                <h3>📊 Métricas de Rendimiento</h3>
                <StatsPanel 
                    simState={$simState} 
                    onDescargarEventos={exportCSV} 
                    onDescargarMetricas={exportJSON} 
                />
            </section>

            <!-- 6. Panel de eventos -->
            <section class="section">
                <h3>📝 Registro de Eventos</h3>
                <EventsPanel events={$simState.events || []} />
            </section>
        {:else}
            <section class="section info-panel">
                <h3>ℹ️ Información</h3>
                <p>Configura los parámetros de simulación y presiona <strong>"Ejecutar Simulación"</strong> para ver los resultados.</p>
            </section>
        {/if}
    {/if}
</div>

<style>
    .simulation-page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem;
        font-family: system-ui, -apple-system, sans-serif;
    }

    .section {
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        border: 1px solid #e2e8f0;
        margin-top: 3rem;
    }

    .section h2, .section h3 {
        margin: 0 0 1rem 0;
        color: #2d3748;
        font-weight: 600;
    }

    .section h2 {
        font-size: 1.5rem;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 0.5rem;
    }

    .section h3 {
        font-size: 1.25rem;
    }

    .debug-panel {
        background: #f7fafc;
        border-left: 4px solid #4299e1;
    }

    .status-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    .status-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: white;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
    }

    .label {
        font-weight: 500;
        color: #4a5568;
    }

    .value {
        font-weight: 600;
    }

    .value.success {
        color: #38a169;
    }

    .value.error {
        color: #e53e3e;
    }

    .value.warning {
        color: #d69e2e;
    }

    .value.neutral {
        color: #718096;
    }

    .gantt-section {
        background: #f8fafc;
        border-left: 4px solid #48bb78;
    }

    .gantt-info {
        background: white;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        border: 1px solid #e2e8f0;
    }

    .gantt-info h4 {
        margin: 0 0 0.75rem 0;
        color: #2d3748;
        font-size: 1rem;
    }

    .gantt-info ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .gantt-info li {
        margin: 0.5rem 0;
        color: #4a5568;
    }

    .gantt-container {
        background: white;
        border-radius: 8px;
        padding: 1rem;
        border: 1px solid #e2e8f0;
        overflow-x: auto;
    }

    .error-message {
        color: #e53e3e;
        text-align: center;
        padding: 2rem;
        background: #fff5f5;
        border: 1px solid #feb2b2;
        border-radius: 8px;
        font-weight: 500;
    }

    .info-panel {
        background: #edf2f7;
        border-left: 4px solid #718096;
        text-align: center;
    }

    .info-panel p {
        color: #4a5568;
        font-size: 1.1rem;
        margin: 0;
    }

    @media (max-width: 768px) {
        .simulation-page {
            padding: 0.5rem;
        }
        
        .section {
            padding: 1rem;
        }
        
        .status-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
