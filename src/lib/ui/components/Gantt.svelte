
<script lang="ts">
  export let gantt: any;
</script>

{#if gantt && gantt.length > 0}
  <div class="section card">
    <h3>📊 Diagrama de Gantt</h3>
    <div class="gantt-container">
      <div class="gantt-header">
        <div class="time-labels">
          {#each Array.from({length: Math.max(...gantt.map((event: any) => event.instante))}, (_, i) => i + 1) as tiempo}
            <span class="time-label">{tiempo}</span>
          {/each}
        </div>
      </div>
      
      <div class="gantt-tracks">
        <div class="track-label">CPU:</div>
        <div class="track-timeline">
          {#each gantt as event (event.id || event.instante)}
            {#if event.tipo === 'rafaga_cpu'}
              <div 
                class="gantt-block cpu-block" 
                style="left: {event.instante * 30}px; width: {event.duracion * 30}px;"
                title="Proceso {event.proceso} - CPU ({event.instante}-{event.instante + event.duracion})"
              >
                P{event.proceso}
              </div>
            {/if}
          {/each}
        </div>
      </div>

      <div class="gantt-tracks">
        <div class="track-label">E/S:</div>
        <div class="track-timeline">
          {#each gantt as event}
            {#if event.tipo === 'rafaga_es'}
              <div 
                class="gantt-block es-block" 
                style="left: {event.instante * 30}px; width: {event.duracion * 30}px;"
                title="Proceso {event.proceso} - E/S ({event.instante}-{event.instante + event.duracion})"
              >
                P{event.proceso}
              </div>
            {/if}
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .section { margin-bottom: 1.5rem; }
  .card { border: 1px solid var(--border-color, #ddd); border-radius: 12px; padding: 1rem; background: var(--bg-card, #111); }
  
  .gantt-container {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1rem;
  }
  
  .gantt-header {
    margin-bottom: 1rem;
  }
  
  .time-labels {
    display: flex;
    margin-left: 80px;
  }
  
  .time-label {
    width: 30px;
    text-align: center;
    font-size: 0.8rem;
    color: #666;
    border-left: 1px solid #ddd;
  }
  
  .gantt-tracks {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
    position: relative;
    height: 40px;
  }
  
  .track-label {
    width: 70px;
    font-weight: bold;
    text-align: right;
    margin-right: 10px;
  }
  
  .track-timeline {
    position: relative;
    flex: 1;
    height: 30px;
    border: 1px solid #ddd;
    background: white;
  }
  
  .gantt-block {
    position: absolute;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: bold;
    color: white;
    border-radius: 4px;
  }
  
  .cpu-block {
    background: #007bff;
  }
  
  .es-block {
    background: #28a745;
  }
</style>
