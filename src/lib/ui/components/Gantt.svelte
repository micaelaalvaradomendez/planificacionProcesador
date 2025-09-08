<script lang="ts">
    import type { DiagramaGantt } from '$lib/application/usecases/buildGantt';
    import { onMount, afterUpdate } from 'svelte';
    
    export let gantt: DiagramaGantt;
    
    $: segmentos = gantt?.segmentos || [];
    $: maxTime = gantt?.tiempoTotal || 0;
    $: escala = Math.max(1, Math.floor(maxTime / 50));

    let componenteMontado = false;
    let contenedorGantt: HTMLElement;

    onMount(() => {
        componenteMontado = true;
        console.log('🎨 Gantt montado:', { 
            datos: gantt,
            segmentos: segmentos.length,
            maxTime,
            escala
        });
    });

    afterUpdate(() => {
        console.log('🎨 Gantt actualizado:', {
            montado: componenteMontado,
            segmentos: segmentos.length,
            maxTime,
            escala,
            elementosVisibles: contenedorGantt?.querySelectorAll('.gantt-segment')?.length || 0
        });
    });

    // Colores para los diferentes tipos de segmentos
    const COLORES = {
        'CPU': '#FF6B6B',    // Rojo - CPU
        'ES': '#4ECDC4',     // Turquesa - E/S
        'TIP': '#45B7D1',    // Azul - Tiempo Incorporación
        'TFP': '#96CEB4',    // Verde - Tiempo Finalización
        'TCP': '#FECA57',    // Amarillo - Tiempo Cambio
        'OCIOSO': '#DDD6FE'  // Lila - CPU ociosa
    } as const;

    function getSegmentosParaTrack(tipo: 'CPU' | 'ES' | 'SO') {
        console.log('🎯 Entrando a getSegmentosParaTrack:', { tipo, haySegmentos: segmentos?.length || 0 })
        
        if (!segmentos || segmentos.length === 0) {
            console.warn('⚠️ No hay segmentos disponibles');
            return [];
        }

        const filtrados = segmentos.filter(s => {
            if (tipo === 'CPU') return s.kind === 'CPU';
            if (tipo === 'ES') return s.kind === 'ES';
            if (tipo === 'SO') return ['TIP', 'TFP', 'TCP'].includes(s.kind);
            return false;
        });
        
        console.log(`🎯 Segmentos para ${tipo}:`, {
            total: filtrados.length,
            primero: filtrados[0],
            ultimo: filtrados[filtrados.length - 1]
        });
        
        return filtrados;
    }

    // Logs reactivos para debugging
    $: if (componenteMontado && gantt) {
        console.log('� Props actualizados:', {
            segmentos: segmentos.length,
            maxTime,
            escala,
            tracks: {
                cpu: getSegmentosParaTrack('CPU').length,
                es: getSegmentosParaTrack('ES').length,
                so: getSegmentosParaTrack('SO').length
            }
        });
    }
</script>

<div bind:this={contenedorGantt} class="gantt-container">
    {#if gantt && segmentos.length > 0}
        <!-- Encabezado -->
        <div class="gantt-header">
            <h3>Diagrama de Gantt</h3>
            <div class="gantt-info">
                <span>Tiempo total: {maxTime}</span>
                <span>Escala: {escala}:1</span>
                <span>Segmentos: {segmentos.length}</span>
            </div>
        </div>

        <!-- Timeline -->
        <div class="gantt-timeline" style="width: {maxTime * escala}px;">
            {#each segmentos as seg}
                <div 
                    class="gantt-segment" 
                    style="
                        left: {seg.tStart * escala}px;
                        width: {(seg.tEnd - seg.tStart) * escala}px;
                        background-color: {COLORES[seg.kind] || '#ccc'};
                    "
                    title="{seg.process} - {seg.kind} ({seg.tStart}-{seg.tEnd})"
                >
                    {#if (seg.tEnd - seg.tStart) >= 2}
                        <span class="segment-label">
                            {seg.process}
                        </span>
                    {/if}
                </div>
            {/each}

            <!-- Marcas de tiempo -->
            {#each Array(Math.ceil(maxTime/5)) as _, i}
                <div 
                    class="time-mark" 
                    style="left: {i * 5 * escala}px;"
                >
                    {i * 5}
                </div>
            {/each}
        </div>

        <!-- Leyenda -->
        <div class="gantt-legend">
            {#each Object.entries(COLORES) as [tipo, color]}
                <div class="legend-item">
                    <span class="color-box" style="background-color: {color}"></span>
                    <span>{tipo}</span>
                </div>
            {/each}
        </div>

        <!-- Debug Info -->
        <div class="gantt-debug">
            <h4>Debug Info</h4>
            <pre>{JSON.stringify({
                tiempoTotal: maxTime,
                segmentos: segmentos.length,
                escala,
                primerSegmento: segmentos[0]
            }, null, 2)}</pre>
        </div>
    {:else}
        <div class="no-data">
            <p>No hay datos para mostrar en el diagrama de Gantt</p>
            <p>Estado actual:</p>
            <ul>
                <li>Hay gantt: {!!gantt ? 'Sí' : 'No'}</li>
                <li>Segmentos: {segmentos?.length || 0}</li>
                <li>Tiempo máximo: {maxTime}</li>
            </ul>
        </div>
    {/if}
</div>

<style>
    .gantt-container {
        border: 4px solid #4CAF50;  /* Verde visible para debug */
        border-radius: 8px;
        padding: 1rem;
        margin: 1rem 0;
        background: white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .gantt-header {
        margin-bottom: 1rem;
        border: 1px solid #e2e8f0;
        padding: 1rem;
    }

    .gantt-header h3 {
        margin: 0 0 0.5rem 0;
        color: #2d3748;
    }

    .gantt-info {
        font-size: 0.875rem;
        color: #4a5568;
    }

    .gantt-info span {
        margin-right: 1rem;
        padding: 0.25rem 0.5rem;
        background: #f7fafc;
        border-radius: 4px;
    }

    .gantt-timeline {
        position: relative;
        height: 200px;
        background: #f7fafc;
        border: 2px solid #4CAF50;  /* Verde visible para debug */
        border-radius: 4px;
        margin: 1rem 0;
        overflow-x: auto;
        padding: 1rem 0;
    }

    .gantt-segment {
        position: absolute;
        height: 30px;
        top: 50%;
        transform: translateY(-50%);
        border-radius: 4px;
        border: 1px solid rgba(0,0,0,0.1);  /* Borde visible para debug */
        color: white;
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        transition: all 0.2s;
    }

    .segment-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0 4px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .time-mark {
        position: absolute;
        bottom: 0;
        width: 1px;
        height: 10px;
        background: #4CAF50;
        transform: translateX(-50%);
    }

    .time-mark::after {
        content: attr(data-time);
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.75rem;
        color: #2d3748;
    }

    .gantt-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-top: 1rem;
        padding: 1rem;
        background: #f7fafc;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
    }

    .legend-item {
        display: flex;
        align-items: center;
        font-size: 0.875rem;
        color: #4a5568;
        padding: 0.25rem 0.5rem;
        background: white;
        border-radius: 4px;
    }

    .color-box {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        margin-right: 0.5rem;
        border: 1px solid rgba(0,0,0,0.1);
    }

    .gantt-debug {
        margin-top: 1rem;
        padding: 1rem;
        background: #f8f9fa;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
    }

    .gantt-debug h4 {
        margin: 0 0 0.5rem 0;
        color: #2d3748;
    }

    .gantt-debug pre {
        background: #2d3748;
        color: #f7fafc;
        padding: 1rem;
        border-radius: 4px;
        overflow: auto;
        font-size: 0.875rem;
    }

    .no-data {
        padding: 2rem;
        text-align: center;
        background: #f8f9fa;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
    }

    .no-data p {
        margin: 0 0 1rem 0;
        color: #2d3748;
    }

    .no-data ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .no-data li {
        margin: 0.25rem 0;
        color: #4a5568;
    }
</style>
