<!-- src/lib/components/TraceViewer.svelte -->
<script lang="ts">
  import type { Trace } from '$lib/engine/types';
  
  export let trace: Trace | null = null;
  
  $: eventos = trace?.events ?? [];
  
  let showTrace = false;
  let currentPage = 0;
  const pageSize = 50;
  
  $: totalPages = Math.ceil(eventos.length / pageSize);
  $: startIndex = currentPage * pageSize;
  $: endIndex = Math.min(startIndex + pageSize, eventos.length);
  $: paginatedEvents = eventos.slice(startIndex, endIndex);
  
  function formatEventType(type: string): string {
    const typeMap: Record<string, string> = {
      'N→L': '🆕 Nuevo → Listo',
      'L→E': '▶️ Listo → Ejecutando',
      'E→L': '⏸️ Ejecutando → Listo',
      'E→B': '⏹️ Ejecutando → Bloqueado',
      'B→L': '🔄 Bloqueado → Listo',
      'E→T': '✅ Ejecutando → Terminado',
      'TIP': '💰 Costo Ingreso',
      'TCP': '🔄 Costo Cambio',
      'TFP': '💰 Costo Fin'
    };
    return typeMap[type] || type;
  }
  
  function getEventColor(type: string): string {
    const colorMap: Record<string, string> = {
      'N→L': '#4caf50',
      'L→E': '#2196f3',
      'E→L': '#ff9800',
      'E→B': '#f44336',
      'B→L': '#9c27b0',
      'E→T': '#00bcd4',
      'TIP': '#795548',
      'TCP': '#607d8b',
      'TFP': '#3f51b5'
    };
    return colorMap[type] || '#666';
  }
  
  function nextPage() {
    if (currentPage < totalPages - 1) {
      currentPage++;
    }
  }
  
  function prevPage() {
    if (currentPage > 0) {
      currentPage--;
    }
  }
</script>

<div class="trace-container">
  <div class="trace-header">
    <h3>🔍 Trace de Ejecución</h3>
    <button 
      on:click={() => showTrace = !showTrace}
      class="toggle-btn"
    >
      {showTrace ? '📁 Ocultar' : '📂 Mostrar'} Trace ({eventos.length} eventos)
    </button>
  </div>
  
  {#if !trace}
    <div class="empty-state">
      <p>No hay trace disponible. Ejecute una simulación primero.</p>
    </div>
  {:else if showTrace}
    <div class="trace-content">
      <!-- Controles de paginación superior -->
      {#if totalPages > 1}
        <div class="pagination">
          <button 
            on:click={prevPage}
            disabled={currentPage === 0}
            class="page-btn"
          >
            ⬅️ Anterior
          </button>
          
          <span class="page-info">
            Página {currentPage + 1} de {totalPages} 
            (eventos {startIndex + 1}-{endIndex} de {eventos.length})
          </span>
          
          <button 
            on:click={nextPage}
            disabled={currentPage >= totalPages - 1}
            class="page-btn"
          >
            Siguiente ➡️
          </button>
        </div>
      {/if}
      
      <!-- Tabla de eventos -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Tiempo</th>
              <th>Evento</th>
              <th>PID</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {#each paginatedEvents as evento, index}
              {@const globalIndex = startIndex + index}
              <tr class:odd={globalIndex % 2 === 1}>
                <td class="time-cell">{evento.t}</td>
                <td class="event-cell">
                  <span 
                    class="event-badge" 
                    style="background-color: {getEventColor(evento.type)}"
                  >
                    {evento.type}
                  </span>
                </td>
                <td class="pid-cell">
                  {evento.pid ? `P${evento.pid}` : '-'}
                </td>
                <td class="description-cell">
                  {formatEventType(evento.type)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      
      <!-- Controles de paginación inferior -->
      {#if totalPages > 1}
        <div class="pagination">
          <button 
            on:click={prevPage}
            disabled={currentPage === 0}
            class="page-btn"
          >
            ⬅️ Anterior
          </button>
          
          <span class="page-info">
            Página {currentPage + 1} de {totalPages}
          </span>
          
          <button 
            on:click={nextPage}
            disabled={currentPage >= totalPages - 1}
            class="page-btn"
          >
            Siguiente ➡️
          </button>
        </div>
      {/if}
      
      <!-- Resumen del trace -->
      <div class="trace-summary">
        <h4>📊 Resumen del Trace</h4>
        <div class="summary-grid">
          <div class="summary-item">
            <strong>Total eventos:</strong> {eventos.length}
          </div>
          <div class="summary-item">
            <strong>Duración:</strong> {eventos.length > 0 ? eventos[eventos.length - 1].t : 0} unidades
          </div>
          <div class="summary-item">
            <strong>Procesos únicos:</strong> 
            {new Set(eventos.filter((e: any) => e.pid).map((e: any) => e.pid)).size}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .trace-container {
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .trace-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .trace-header h3 {
    margin: 0;
    color: #333;
  }

  .toggle-btn {
    padding: 0.5rem 1rem;
    background-color: #2196f3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .toggle-btn:hover {
    background-color: #1976d2;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #666;
    background-color: white;
    border-radius: 4px;
  }

  .trace-content {
    background-color: white;
    border-radius: 4px;
    padding: 1rem;
  }

  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 1rem 0;
    padding: 0.5rem;
    background-color: #f5f5f5;
    border-radius: 4px;
  }

  .page-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    background-color: white;
    border-radius: 4px;
    cursor: pointer;
  }

  .page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .page-btn:not(:disabled):hover {
    background-color: #e3f2fd;
  }

  .page-info {
    font-size: 0.875rem;
    color: #666;
  }

  .table-container {
    overflow-x: auto;
    border: 1px solid #eee;
    border-radius: 4px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 0.5rem;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  th {
    background-color: #f8f9fa;
    font-weight: bold;
    color: #495057;
    font-size: 0.875rem;
  }

  tr.odd {
    background-color: #f9f9f9;
  }

  .time-cell {
    text-align: center;
    font-family: monospace;
    color: #666;
    width: 80px;
  }

  .event-cell {
    text-align: center;
    width: 100px;
  }

  .event-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    color: white;
    font-size: 0.75rem;
    font-weight: bold;
  }

  .pid-cell {
    text-align: center;
    font-weight: bold;
    width: 60px;
  }

  .description-cell {
    color: #555;
  }

  .trace-summary {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #f0f8ff;
    border-radius: 4px;
    border-left: 4px solid #2196f3;
  }

  .trace-summary h4 {
    margin: 0 0 0.5rem 0;
    color: #1565c0;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.5rem;
  }

  .summary-item {
    font-size: 0.875rem;
    color: #1976d2;
  }
</style>