<!-- src/lib/components/GanttView.svelte -->
<script lang="ts">
  import type { GanttModel } from '$lib/gantt/schema';
  
  export let gantt: GanttModel | null = null;
  
  $: model = gantt;
  $: tracks = model?.tracks ?? [];
  $: tMin = model?.tMin ?? 0;
  $: tMax = model?.tMax ?? 10;
  
  const W = 900;
  const trackHeight = 30;
  const headerHeight = 40;
  $: H = headerHeight + tracks.length * trackHeight + 20;
  
  function scale(t: number): number {
    const range = tMax - tMin || 1;
    return (t - tMin) / range * (W - 120) + 80;
  }
  
  function getSegmentColor(pid: string): string {
    const colors = ['#2196F3', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#CDDC39'];
    const pidNum = parseInt(pid) || 0;
    return colors[pidNum % colors.length];
  }
</script>

<div class="gantt-container">
  <h3>📊 Diagrama de Gantt (Solo CPU)</h3>
  
  {#if !model}
    <div class="empty-state">
      <p>No hay datos de Gantt disponibles. Ejecute una simulación primero.</p>
    </div>
  {:else if tracks.length === 0}
    <div class="empty-state">
      <p>No se encontraron segmentos de CPU en el Gantt.</p>
    </div>
  {:else}
    <div class="gantt-chart">
      <svg width={W} height={H} viewBox="0 0 {W} {H}">
        <!-- Línea de tiempo superior -->
        <line x1="80" y1={headerHeight - 10} x2={W - 40} y2={headerHeight - 10} 
              stroke="#333" stroke-width="2"/>
        
        <!-- Marcas de tiempo -->
        {#each Array.from({length: Math.min(11, tMax - tMin + 1)}, (_, i) => tMin + Math.floor(i * (tMax - tMin) / 10)) as t}
          <line x1={scale(t)} y1={headerHeight - 15} x2={scale(t)} y2={headerHeight - 5} 
                stroke="#666" stroke-width="1"/>
          <text x={scale(t)} y={headerHeight - 20} text-anchor="middle" 
                font-size="12" fill="#666">{t}</text>
        {/each}
        
        <!-- Tracks de procesos -->
        {#each tracks as track, i}
          {@const y = headerHeight + i * trackHeight}
          
          <!-- Label del proceso -->
          <text x="10" y={y + trackHeight/2 + 4} 
                font-size="14" font-weight="bold" fill="#333">
            P{track.pid}
          </text>
          
          <!-- Línea base del track -->
          <line x1="80" y1={y + trackHeight/2} x2={W - 40} y2={y + trackHeight/2} 
                stroke="#ddd" stroke-width="1"/>
          
          <!-- Segmentos CPU -->
          {#each track.segments as segment}
            {@const x = scale(segment.start)}
            {@const width = scale(segment.end) - scale(segment.start)}
            {@const color = getSegmentColor(track.pid)}
            
            <rect 
              x={x} 
              y={y + 5} 
              width={width} 
              height={trackHeight - 10}
              fill={color}
              stroke="#fff"
              stroke-width="1"
              rx="3"
            />
            
            <!-- Texto del segmento (si hay espacio) -->
            {#if width > 30}
              <text 
                x={x + width/2} 
                y={y + trackHeight/2 + 4}
                text-anchor="middle"
                font-size="10"
                fill="white"
                font-weight="bold"
              >
                {segment.end - segment.start}
              </text>
            {/if}
          {/each}
        {/each}
      </svg>
    </div>
    
    <!-- Leyenda -->
    <div class="legend">
      <h4>Leyenda:</h4>
      <div class="legend-items">
        {#each tracks as track}
          <div class="legend-item">
            <div class="color-box" style="background-color: {getSegmentColor(track.pid)}"></div>
            <span>P{track.pid}</span>
          </div>
        {/each}
      </div>
    </div>
    
    <!-- Información del modelo -->
    <div class="model-info">
      <p><strong>Tiempo total:</strong> {tMin} - {tMax} ({tMax - tMin} unidades)</p>
      <p><strong>Procesos con CPU:</strong> {tracks.length}</p>
      <p><strong>Segmentos CPU totales:</strong> {tracks.reduce((sum, t) => sum + t.segments.length, 0)}</p>
    </div>
  {/if}
</div>

<style>
  .gantt-container {
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 1rem;
    background-color: #fafafa;
  }

  .gantt-container h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #333;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #666;
    background-color: white;
    border-radius: 4px;
  }

  .gantt-chart {
    background-color: white;
    border-radius: 4px;
    padding: 1rem;
    overflow-x: auto;
  }

  .legend {
    margin-top: 1rem;
    padding: 1rem;
    background-color: white;
    border-radius: 4px;
  }

  .legend h4 {
    margin: 0 0 0.5rem 0;
  }

  .legend-items {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .color-box {
    width: 16px;
    height: 16px;
    border-radius: 2px;
    border: 1px solid #ccc;
  }

  .model-info {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #e8f5e8;
    border-radius: 4px;
    border-left: 4px solid #4caf50;
  }

  .model-info p {
    margin: 0.25rem 0;
    font-size: 0.875rem;
    color: #2e7d32;
  }
</style>