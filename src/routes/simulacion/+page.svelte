<!-- src/routes/simulacion/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { get } from 'svelte/store';
  
  import { 
    simulationResult, 
    simulationError, 
    isSimulating,
    hasProcesses,
    canExecute 
  } from '$lib/stores/simulacion';
  
  import PolicySelector from '$lib/components/PolicySelector.svelte';
  import CostConfigForm from '$lib/components/CostConfigForm.svelte';
  import ProcessTableEditor from '$lib/components/ProcessTableEditor.svelte';
  import FileImporter from '$lib/components/FileImporter.svelte';
  import RunButton from '$lib/components/RunButton.svelte';
  
  // Redirigir a resultados cuando hay una simulación exitosa
  $: if ($simulationResult && !$isSimulating) {
    // Pequeño delay para permitir que se complete la actualización del store
    setTimeout(() => {
      goto('/resultados');
    }, 100);
  }
</script>

<svelte:head>
  <title>Simulador de Planificación de Procesos</title>
  <meta name="description" content="Simulador de algoritmos de planificación de procesos de CPU" />
</svelte:head>

<div class="container">
  <header class="header">
    <h1>🖥️ Simulador de Planificación de Procesos</h1>
    <p class="subtitle">
      Configure los parámetros de simulación y ejecute algoritmos de planificación de CPU
    </p>
  </header>

  <main class="main-content">
    <!-- Sección de importación y fixtures -->
    <section class="section">
      <FileImporter />
    </section>

    <!-- Configuración de política -->
    <section class="section">
      <PolicySelector />
    </section>

    <!-- Configuración de costos -->
    <section class="section">
      <CostConfigForm />
    </section>

    <!-- Editor de procesos -->
    <section class="section">
      <ProcessTableEditor />
    </section>

    <!-- Botón de ejecución -->
    <section class="section">
      <RunButton />
    </section>

    <!-- Estado de la simulación -->
    {#if $isSimulating}
      <div class="status-card simulating">
        <h3>⏳ Ejecutando simulación...</h3>
        <p>Por favor espere mientras se procesa la simulación.</p>
      </div>
    {/if}

    {#if $simulationError}
      <div class="status-card error">
        <h3>❌ Error en la simulación</h3>
        <p>{$simulationError}</p>
      </div>
    {/if}

    <!-- Información de ayuda -->
    <section class="section help-section">
      <details>
        <summary>ℹ️ Ayuda e Información</summary>
        <div class="help-content">
          <h4>Políticas de Planificación:</h4>
          <ul>
            <li><strong>FCFS:</strong> First Come First Served - No apropiativo</li>
            <li><strong>RR:</strong> Round Robin - Apropiativo por quantum</li>
            <li><strong>SPN:</strong> Shortest Process Next - No apropiativo</li>
            <li><strong>SRTN:</strong> Shortest Remaining Time Next - Apropiativo</li>
            <li><strong>PRIORITY:</strong> Por prioridades con aging - Apropiativo</li>
          </ul>
          
          <h4>Costos del Sistema:</h4>
          <ul>
            <li><strong>TIP:</strong> Tiempo de ingreso de proceso al sistema</li>
            <li><strong>TCP:</strong> Tiempo de cambio de contexto entre procesos</li>
            <li><strong>TFP:</strong> Tiempo de finalización de proceso</li>
            <li><strong>Bloqueo E/S:</strong> Tiempo de bloqueo entre ráfagas de CPU</li>
          </ul>
          
          <h4>Formato de Procesos:</h4>
          <ul>
            <li><strong>PID:</strong> Identificador único del proceso</li>
            <li><strong>Arribo:</strong> Tiempo de llegada al sistema</li>
            <li><strong>Ráfagas CPU:</strong> Lista de duraciones separadas por coma</li>
            <li><strong>Prioridad:</strong> Menor número = Mayor prioridad (solo PRIORITY)</li>
          </ul>
        </div>
      </details>
    </section>
  </main>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #eee;
  }

  .header h1 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: 2.5rem;
  }

  .subtitle {
    margin: 0;
    color: #666;
    font-size: 1.125rem;
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

  .status-card {
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
  }

  .status-card.simulating {
    background-color: #fff3e0;
    border: 1px solid #ff9800;
  }

  .status-card.simulating h3 {
    color: #ef6c00;
    margin: 0 0 0.5rem 0;
  }

  .status-card.simulating p {
    color: #e65100;
    margin: 0;
  }

  .status-card.error {
    background-color: #ffebee;
    border: 1px solid #f44336;
  }

  .status-card.error h3 {
    color: #d32f2f;
    margin: 0 0 0.5rem 0;
  }

  .status-card.error p {
    color: #c62828;
    margin: 0;
  }

  .help-section {
    background-color: #f8f9fa;
    padding: 1rem;
  }

  .help-section details {
    cursor: pointer;
  }

  .help-section summary {
    font-weight: bold;
    padding: 0.5rem;
    border-radius: 4px;
    background-color: #e9ecef;
  }

  .help-section summary:hover {
    background-color: #dee2e6;
  }

  .help-content {
    padding: 1rem 0;
  }

  .help-content h4 {
    margin: 1rem 0 0.5rem 0;
    color: #495057;
  }

  .help-content ul {
    margin: 0 0 1rem 0;
    padding-left: 1.5rem;
  }

  .help-content li {
    margin-bottom: 0.25rem;
    color: #6c757d;
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    .header h1 {
      font-size: 2rem;
    }
  }
</style>