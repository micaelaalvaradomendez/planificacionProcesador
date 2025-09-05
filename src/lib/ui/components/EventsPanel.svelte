<script lang="ts">
  import type { SimEvent } from '../../model/types';
  
  export let events: SimEvent[] = [];
  export let maxVisibleEvents = 10;
  
  let currentPage = 0;
  let showAll = false;
  
  $: paginatedEvents = showAll ? events : events.slice(currentPage * maxVisibleEvents, (currentPage + 1) * maxVisibleEvents);
  $: totalPages = Math.ceil(events.length / maxVisibleEvents);
  $: hasEvents = events && events.length > 0;
  
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
  
  function toggleShowAll() {
    showAll = !showAll;
    currentPage = 0;
  }
  
  function downloadCSV() {
    if (!hasEvents) return;
    
    const csvContent = [
      'Tiempo,Tipo,Proceso,Descripción',
      ...events.map(e => `${e.tiempo},${e.tipo},${e.proceso || ''},${e.extra || ''}`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventos_simulacion_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function downloadJSON() {
    if (!hasEvents) return;
    
    const jsonContent = JSON.stringify(events, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventos_simulacion_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

{#if hasEvents}
  <div class="events-panel">
    <div class="events-header">
      <h3>📅 Eventos de Simulación</h3>
      <div class="events-summary">
        <span class="event-count">Total: {events.length} eventos</span>
        {#if !showAll && events.length > maxVisibleEvents}
          <span class="page-info">
            Página {currentPage + 1} de {totalPages} 
            (mostrando {Math.min(maxVisibleEvents, events.length - currentPage * maxVisibleEvents)} eventos)
          </span>
        {/if}
      </div>
    </div>

    <div class="events-controls">
      <div class="pagination-controls">
        {#if !showAll && totalPages > 1}
          <button 
            class="btn btn-small" 
            on:click={prevPage} 
            disabled={currentPage === 0}
          >
            ← Anterior
          </button>
          <button 
            class="btn btn-small" 
            on:click={nextPage} 
            disabled={currentPage >= totalPages - 1}
          >
            Siguiente →
          </button>
        {/if}
        
        {#if events.length > maxVisibleEvents}
          <button class="btn btn-small" on:click={toggleShowAll}>
            {showAll ? 'Mostrar paginado' : 'Mostrar todos'}
          </button>
        {/if}
      </div>
      
      <div class="download-controls">
        <button class="btn btn-primary btn-small" on:click={downloadCSV}>
          📄 Descargar CSV
        </button>
        <button class="btn btn-primary btn-small" on:click={downloadJSON}>
          📊 Descargar JSON
        </button>
      </div>
    </div>

    <div class="events-table-container">
      <table class="events-table">
        <thead>
          <tr>
            <th>Tiempo</th>
            <th>Tipo de Evento</th>
            <th>Proceso</th>
            <th>Descripción</th>
          </tr>
        </thead>
        <tbody>
          {#each paginatedEvents as event, index}
            <tr class="event-row" class:event-critical={event.tipo.includes('TERMINACION') || event.tipo.includes('ERROR')}>
              <td class="event-time">{event.tiempo}</td>
              <td class="event-type">
                <span class="event-badge" class:badge-arrival={event.tipo.includes('ARRIBO')} 
                      class:badge-dispatch={event.tipo.includes('DESPACHO')} 
                      class:badge-finish={event.tipo.includes('FIN')} 
                      class:badge-quantum={event.tipo.includes('QUANTUM')} 
                      class:badge-termination={event.tipo.includes('TERMINACION')}>
                  {event.tipo}
                </span>
              </td>
              <td class="event-process">
                <strong>{event.proceso || 'SISTEMA'}</strong>
              </td>
              <td class="event-description">
                {event.extra || '-'}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if !showAll && totalPages > 1}
      <div class="pagination-footer">
        <span>
          Eventos {currentPage * maxVisibleEvents + 1}-{Math.min((currentPage + 1) * maxVisibleEvents, events.length)} de {events.length}
        </span>
      </div>
    {/if}
  </div>
{:else}
  <div class="events-panel events-empty">
    <h3>📅 Eventos de Simulación</h3>
    <p class="empty-message">No hay eventos para mostrar. Ejecute una simulación primero.</p>
  </div>
{/if}

<style>
  .events-panel {
    background: var(--bg-card, #1a1a1a);
    border: 1px solid var(--border-color, #333);
    border-radius: 12px;
    padding: 1.5rem;
    margin: 1rem 0;
  }

  .events-empty {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted, #888);
  }

  .empty-message {
    margin: 0.5rem 0 0 0;
    font-style: italic;
  }

  .events-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .events-header h3 {
    margin: 0;
    color: var(--text-primary, #ffffff);
  }

  .events-summary {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 0.85rem;
    color: var(--text-muted, #888);
  }

  .event-count {
    font-weight: 600;
    color: var(--text-accent, #4ade80);
  }

  .page-info {
    margin-top: 0.25rem;
  }

  .events-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .pagination-controls, .download-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    background: var(--bg-secondary, #2a2a2a);
    color: var(--text-primary, #ffffff);
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }

  .btn:hover:not(:disabled) {
    background: var(--bg-hover, #3a3a3a);
    border-color: var(--border-hover, #555);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--color-primary, #3b82f6);
    border-color: var(--color-primary, #3b82f6);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover, #2563eb);
  }

  .btn-small {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
  }

  .events-table-container {
    overflow-x: auto;
    border: 1px solid var(--border-color, #333);
    border-radius: 8px;
  }

  .events-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .events-table th {
    background: var(--bg-secondary, #2a2a2a);
    color: var(--text-primary, #ffffff);
    font-weight: 600;
    padding: 0.75rem;
    text-align: left;
    border-bottom: 2px solid var(--border-color, #333);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .events-table td {
    padding: 0.625rem 0.75rem;
    border-bottom: 1px solid var(--border-color, #333);
    vertical-align: top;
  }

  .event-row:hover {
    background: var(--bg-hover, rgba(255, 255, 255, 0.02));
  }

  .event-row.event-critical {
    background: rgba(220, 38, 127, 0.1);
  }

  .event-time {
    font-family: 'Fira Code', 'Courier New', monospace;
    font-weight: 600;
    color: var(--color-accent, #06b6d4);
    white-space: nowrap;
  }

  .event-type {
    white-space: nowrap;
  }

  .event-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    background: var(--bg-secondary, #374151);
    color: var(--text-primary, #ffffff);
  }

  .badge-arrival {
    background: #059669;
    color: white;
  }

  .badge-dispatch {
    background: #2563eb;
    color: white;
  }

  .badge-finish {
    background: #dc2626;
    color: white;
  }

  .badge-quantum {
    background: #d97706;
    color: white;
  }

  .badge-termination {
    background: #7c3aed;
    color: white;
  }

  .event-process {
    font-family: 'Fira Code', 'Courier New', monospace;
    white-space: nowrap;
  }

  .event-description {
    max-width: 300px;
    word-wrap: break-word;
    line-height: 1.4;
    color: var(--text-secondary, #d1d5db);
  }

  .pagination-footer {
    margin-top: 1rem;
    text-align: center;
    font-size: 0.85rem;
    color: var(--text-muted, #888);
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-color, #333);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .events-header {
      flex-direction: column;
      align-items: stretch;
    }

    .events-summary {
      align-items: flex-start;
    }

    .events-controls {
      flex-direction: column;
      align-items: stretch;
    }

    .pagination-controls, .download-controls {
      justify-content: center;
    }

    .events-table th,
    .events-table td {
      padding: 0.5rem;
    }

    .event-description {
      max-width: 200px;
    }
  }
</style>
