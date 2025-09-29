<!-- src/routes/resultados/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { get } from 'svelte/store';
  
  import { 
    simulationResult, 
    simulationConfig, 
    procesos,
    exportResultadoJSON,
    exportMetricasCSV,
    exportTraceCSV,
    clearSimulation
  } from '$lib/stores/simulacion';
  
  import GanttView from '$lib/components/GanttView.svelte';
  import MetricsTable from '$lib/components/MetricsTable.svelte';
  import TraceViewer from '$lib/components/TraceViewer.svelte';
  
  $: result = $simulationResult;
  $: config = $simulationConfig;
  $: procesosData = $procesos;
  
  function backToSimulation() {
    console.log('🔙 Resultados: Navegando de vuelta a simulación...');
    console.log('🔙 Resultados: Base path:', base);
    
    // Usar el base path de SvelteKit
    const targetPath = base || '/';
    
    goto(targetPath)
      .then(() => {
        console.log('✅ Resultados: Regreso exitoso a simulación');
      })
      .catch((err) => {
        console.error('❌ Resultados: Error en navegación:', err);
        // Como último recurso, usar window.location
        if (typeof window !== 'undefined') {
          window.location.href = targetPath;
        }
      });
  }
  
  function startNewSimulation() {
    try {
      console.log('🆕 Resultados: Iniciando nueva simulación...');
      console.log('🆕 Resultados: Base path:', base);
      
      // Limpiar todos los datos de simulación
      clearSimulation();
      console.log('✅ Resultados: Datos limpiados, navegando...');
      
      // Usar el base path de SvelteKit
      const targetPath = base || '/';
      console.log('🆕 Resultados: Navegando a:', targetPath);
      
      goto(targetPath)
        .then(() => {
          console.log('✅ Resultados: Navegación exitosa a nueva simulación');
        })
        .catch((err) => {
          console.error('❌ Resultados: Error en navegación:', err);
          // Como último recurso, usar window.location
          if (typeof window !== 'undefined') {
            console.log('🔄 Resultados: Usando window.location como fallback');
            window.location.href = targetPath;
          }
        });
    } catch (error) {
      console.error('💥 Resultados: Error en startNewSimulation:', error);
    }
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
      <h1> Resultados de Simulación</h1>
      <div class="header-actions">
        <button on:click={startNewSimulation} class="new-sim-btn">
          Nueva Simulación
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
        <h2>No hay resultados disponibles</h2>
        <p>No se ha ejecutado ninguna simulación todavía.</p>
        <button on:click={backToSimulation} class="cta-btn">
          Ir al Inicio
        </button>
      </div>
    {:else}
      <!-- Sección de exports -->
      <section class="section export-section">
        <h3>Exportar Resultados</h3>
        <div class="export-buttons">
          <button on:click={handleExportJSON} class="export-btn">
            Exportar JSON Completo
          </button>
          <button on:click={handleExportMetricsCSV} class="export-btn">
             Exportar Métricas CSV
          </button>
          <button on:click={handleExportTraceCSV} class="export-btn">
             Exportar Trace CSV
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
        <h3>   Configuración Utilizada</h3>
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
            <strong>E/S (Fallback):</strong> {config.costos?.bloqueoES ?? 0}
          </div>
        </div>
      </section>

      <!-- Información de procesos -->
      <section class="section processes-summary">
        <h3>Procesos Simulados</h3>
        <div class="processes-table-container">
          <table>
            <thead>
              <tr>
                <th>PID</th>
                <th>Nombre</th>
                <th>Arribo</th>
                <th>Ráfagas CPU</th>
                <th>E/S</th>
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
                  <td class="io-cell">
                    {#if proceso.rafagasES}
                      [{proceso.rafagasES.join(', ')}]
                    {:else}
                      <span class="fallback">({config.costos?.bloqueoES ?? 0})</span>
                    {/if}
                  </td>
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
    background-color: #f5f5f5;
    min-height: calc(100vh - 200px);
  }

  .header {
    margin-bottom: 2rem;
    padding: 2rem;
    background: linear-gradient(135deg, #3f2c50 0%, #633f6e 100%);
    border-radius: 12px;
    color: white;
    box-shadow: 0 8px 32px rgba(63, 44, 80, 0.3);
    border: 3px solid #dde5b6;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .header h1 {
    margin: 0;
    font-size: 2.5rem;
    font-weight: bold;
    color: #dde5b6;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .new-sim-btn {
    background: linear-gradient(135deg, #dde5b6 0%, #c8d49a 100%);
    color: #3f2c50;
    border: 2px solid #dde5b6;
    padding: 0.75rem 1.5rem;
    border-radius: 25px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .new-sim-btn:hover {
    background: linear-gradient(135deg, #3f2c50 0%, #633f6e 100%);
    color: #dde5b6;
    border-color: #dde5b6;
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(63, 44, 80, 0.3);
  }

  .simulation-info {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
    padding: 1.5rem;
    background: linear-gradient(135deg, rgba(221, 229, 182, 0.1) 0%, rgba(200, 212, 154, 0.1) 100%);
    border-radius: 8px;
    border: 2px solid rgba(221, 229, 182, 0.3);
  }

  .info-item {
    color: #dde5b6;
    font-size: 0.925rem;
    font-weight: 500;
  }

  .main-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .section {
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    border: 2px solid #e9ecef;
    transition: all 0.3s ease;
  }

  .section:hover {
    border-color: #dde5b6;
    box-shadow: 0 6px 24px rgba(63, 44, 80, 0.15);
  }

  .no-results {
    text-align: center;
    padding: 4rem 2rem;
    background: linear-gradient(135deg, white 0%, #f8f9fa 100%);
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    border: 2px solid #dde5b6;
  }

  .no-results h2 {
    color: #3f2c50;
    margin-bottom: 1rem;
    font-weight: bold;
  }

  .no-results p {
    color: #633f6e;
    margin-bottom: 2rem;
    font-weight: 500;
  }

  .cta-btn {
    padding: 1rem 2rem;
    background: linear-gradient(135deg, #dde5b6 0%, #c8d49a 100%);
    color: #3f2c50;
    border: 2px solid #dde5b6;
    border-radius: 25px;
    cursor: pointer;
    font-size: 1.125rem;
    font-weight: bold;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #dde5b6 0%, #c8d49a 100%);
    color: #3f2c50;
    border: 2px solid #dde5b6;
    border-radius: 25px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .export-btn:hover {
    background: linear-gradient(135deg, #3f2c50 0%, #633f6e 100%);
    color: #dde5b6;
    border-color: #dde5b6;
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(63, 44, 80, 0.3);
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

  .io-cell {
    font-family: monospace;
    font-size: 0.875rem;
  }

  .io-cell .fallback {
    color: #666;
    font-style: italic;
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