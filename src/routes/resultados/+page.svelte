<!-- src/routes/resultados/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { get } from 'svelte/store';
  
  import { 
    simulationResult, 
    simulationConfig, 
    procesos,
    exportResultadoJSON,
    exportMetricasCSV,
    exportTraceCSV
  } from '$lib/stores/simulacion';
  
  import GanttView from '$lib/components/GanttView.svelte';
  import MetricsTable from '$lib/components/MetricsTable.svelte';
  import TraceViewer from '$lib/components/TraceViewer.svelte';
  
  $: result = $simulationResult;
  $: config = $simulationConfig;
  $: procesosData = $procesos;
  
  function backToSimulation() {
    goto('/simulacion');
  }
  
  function handleExportJSON() {
    exportResultadoJSON();
  }
  
  function handleExportMetricsCSV() {
    exportMetricasCSV();
  }
  
  function handleExportTraceCSV() {
    exportTraceCSV();
  }
</script>

<svelte:head>
  <title>Resultados de Simulación - Planificador de Procesos</title>
  <meta name="description" content="Resultados de la simulación de planificación de procesos" />
</svelte:head>

<div class="container">
  <header class="header">
    <div class="header-content">
      <h1>📊 Resultados de Simulación</h1>
      <div class="header-actions">
        <button on:click={backToSimulation} class="back-btn">
          ⬅️ Volver a Simulación
        </button>
      </div>
    </div>
    
    {#if result}
      <div class="simulation-info">
        <div class="info-item">
          <strong>Política:</strong> {config.politica}
          {#if config.quantum}
            (quantum: {config.quantum})
          {/if}
        </div>
        <div class="info-item">
          <strong>Procesos:</strong> {procesosData.length}
        </div>
        <div class="info-item">
          <strong>Tiempo Total:</strong> {result.metricas.global.tiempoTotalSimulacion} unidades
        </div>
      </div>
    {/if}
  </header>

  <main class="main-content">
    {#if !result}
      <div class="no-results">
        <h2>🚫 No hay resultados disponibles</h2>
        <p>No se ha ejecutado ninguna simulación todavía.</p>
        <button on:click={backToSimulation} class="cta-btn">
          ▶️ Ir a Simulación
        </button>
      </div>
    {:else}
      <!-- Sección de exports -->
      <section class="section export-section">
        <h3>💾 Exportar Resultados</h3>
        <div class="export-buttons">
          <button on:click={handleExportJSON} class="export-btn">
            📄 Exportar JSON Completo
          </button>
          <button on:click={handleExportMetricsCSV} class="export-btn">
            📊 Exportar Métricas CSV
          </button>
          <button on:click={handleExportTraceCSV} class="export-btn">
            🔍 Exportar Trace CSV
          </button>
        </div>
      </section>

      <!-- Gantt Chart -->
      <section class="section">
        <GanttView gantt={result.gantt} />
      </section>

      <!-- Métricas -->
      <section class="section">
        <MetricsTable metricas={result.metricas} />
      </section>

      <!-- Trace de ejecución -->
      <section class="section">
        <TraceViewer trace={result.trace} />
      </section>

      <!-- Resumen de configuración -->
      <section class="section config-summary">
        <h3>⚙️ Configuración Utilizada</h3>
        <div class="config-grid">
          <div class="config-item">
            <strong>Política:</strong> {config.politica}
          </div>
          {#if config.quantum}
            <div class="config-item">
              <strong>Quantum:</strong> {config.quantum}
            </div>
          {/if}
          {#if config.aging}
            <div class="config-item">
              <strong>Aging Step:</strong> {config.aging.step}
            </div>
            <div class="config-item">
              <strong>Aging Quantum:</strong> {config.aging.quantum}
            </div>
          {/if}
          <div class="config-item">
            <strong>TIP:</strong> {config.costos?.TIP ?? 0}
          </div>
          <div class="config-item">
            <strong>TCP:</strong> {config.costos?.TCP ?? 0}
          </div>
          <div class="config-item">
            <strong>TFP:</strong> {config.costos?.TFP ?? 0}
          </div>
          <div class="config-item">
            <strong>Bloqueo E/S:</strong> {config.costos?.bloqueoES ?? 0}
          </div>
        </div>
      </section>

      <!-- Información de procesos -->
      <section class="section processes-summary">
        <h3>👥 Procesos Simulados</h3>
        <div class="processes-table-container">
          <table>
            <thead>
              <tr>
                <th>PID</th>
                <th>Nombre</th>
                <th>Arribo</th>
                <th>Ráfagas CPU</th>
                <th>Prioridad</th>
              </tr>
            </thead>
            <tbody>
              {#each procesosData as proceso}
                <tr>
                  <td class="pid-cell">P{proceso.pid}</td>
                  <td>{proceso.label}</td>
                  <td>{proceso.arribo}</td>
                  <td class="rafagas-cell">[{proceso.rafagasCPU.join(', ')}]</td>
                  <td>{proceso.prioridadBase || '-'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}
  </main>
</div>

<style>
  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #eee;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .header h1 {
    margin: 0;
    color: #333;
    font-size: 2.5rem;
  }

  .back-btn {
    padding: 0.75rem 1.5rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.2s;
  }

  .back-btn:hover {
    background-color: #5a6268;
  }

  .simulation-info {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
    padding: 1rem;
    background-color: #e3f2fd;
    border-radius: 6px;
    border-left: 4px solid #2196f3;
  }

  .info-item {
    color: #1565c0;
    font-size: 0.925rem;
  }

  .main-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .section {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .no-results {
    text-align: center;
    padding: 4rem 2rem;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .no-results h2 {
    color: #666;
    margin-bottom: 1rem;
  }

  .no-results p {
    color: #888;
    margin-bottom: 2rem;
  }

  .cta-btn {
    padding: 1rem 2rem;
    background-color: #2196f3;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1.125rem;
    font-weight: bold;
  }

  .cta-btn:hover {
    background-color: #1976d2;
  }

  .export-section {
    padding: 1rem;
  }

  .export-section h3 {
    margin: 0 0 1rem 0;
    color: #333;
  }

  .export-buttons {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .export-btn {
    padding: 0.75rem 1rem;
    background-color: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.2s;
  }

  .export-btn:hover {
    background-color: #45a049;
  }

  .config-summary, .processes-summary {
    padding: 1rem;
  }

  .config-summary h3, .processes-summary h3 {
    margin: 0 0 1rem 0;
    color: #333;
  }

  .config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .config-item {
    padding: 0.5rem;
    background-color: #f8f9fa;
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .processes-table-container {
    overflow-x: auto;
  }

  .processes-summary table {
    width: 100%;
    border-collapse: collapse;
  }

  .processes-summary th,
  .processes-summary td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  .processes-summary th {
    background-color: #f8f9fa;
    font-weight: bold;
    color: #495057;
  }

  .pid-cell {
    font-weight: bold;
    background-color: #e3f2fd;
  }

  .rafagas-cell {
    font-family: monospace;
    font-size: 0.875rem;
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    .header h1 {
      font-size: 2rem;
    }

    .header-content {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .simulation-info {
      flex-direction: column;
      gap: 0.5rem;
    }

    .export-buttons {
      flex-direction: column;
    }
  }
</style>