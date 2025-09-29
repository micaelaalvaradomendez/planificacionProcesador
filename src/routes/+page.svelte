<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  
  import { 
    simulationResult, 
    simulationError, 
    isSimulating,
    hasProcesses,
    canExecute,
    clearSimulation 
  } from '$lib/stores/simulacion';
  
  import PolicySelector from '$lib/components/PolicySelector.svelte';
  import CostConfigForm from '$lib/components/CostConfigForm.svelte';
  import ProcessTableEditor from '$lib/components/ProcessTableEditor.svelte';
  import FileImporter from '$lib/components/FileImporter.svelte';
  import RunButton from '$lib/components/RunButton.svelte';
  
  // Redirigir a resultados cuando hay una simulación exitosa
  let hasNavigated = false;
  
  // Reset navigation flag when simulation starts
  $: if ($isSimulating) {
    hasNavigated = false;
  }
  
  $: if ($simulationResult && !$isSimulating && !hasNavigated) {
    console.log('🔍 +page.svelte: Simulación completada, verificando navegación...', {
      routeId: $page.route?.id,
      pathname: $page.url?.pathname,
      href: $page.url?.href
    });
    
    // Verificar que estamos en la página principal
    const routeId = $page.route?.id;
    
    // Ser más flexible con la detección de página principal
    const isHomePage = !routeId || routeId === '/' || routeId.includes('/(') || !routeId.includes('/resultados');
    
    if (isHomePage) {
      hasNavigated = true;
      
      goto('./resultados')
        .then(() => {
        })
        .catch((err) => {
          return goto('/resultados');
        })
        .catch((err) => {
          hasNavigated = false; // Permitir reintento
        });
    }
  }
  
  // Reset navigation flag when simulation changes
  $: if (!$simulationResult) {
    hasNavigated = false;
  }

  // Función para comenzar nueva simulación
  function startNewSimulation() {
    clearSimulation();
  }
</script>

<svelte:head>
  <title>Simulador de Planificación de Procesos</title>
  <meta name="description" content="Simulador de algoritmos de planificación de procesos de CPU" />
</svelte:head>

<div class="container">
  <header class="header">
    <h1> ¡Bienvenido!</h1>
    <h3 class="subtitle">
      Para comenzar, configure los parámetros de simulación y ejecute algoritmos de planificación de CPU
    </h3>
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

    <!-- Sección de Ejecución y Ayuda -->
    <section class="section">
      <RunButton />
    </section>

    <!-- Estado de la simulación -->
    {#if $isSimulating}
      <div class="status-card simulating">
        <h3>Ejecutando simulación...</h3>
        <p>Por favor espere mientras se procesa la simulación.</p>
      </div>
    {/if}

    <!-- Debug: Navegación manual a resultados si hay simulación completa -->
    {#if $simulationResult && !$isSimulating}
      <div class="status-card success">
        <h3>¡Simulación Completada!</h3>
        <p>La simulación se ha ejecutado correctamente.</p>
        <button 
          class="manual-nav-button"
          on:click={() => {
            goto('./resultados').catch(() => goto('/resultados'));
          }}
        >
          Ver Resultados 🎯
        </button>
        <button 
          class="results-button"
          on:click={() => {
            goto('/resultados');
          }}
        >
          Ver Resultados →
        </button>
      </div>
    {/if}

    {#if $simulationError}
      <div class="status-card error">
        <h3>Error en la simulación</h3>
        <p>{$simulationError}</p>
      </div>
    {/if}

    <!-- Información de ayuda -->
    <section class="section help-section">
      <details>
        <summary>Ayuda e Información</summary>
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
            <li><strong>Bloqueo E/S:</strong> Tiempo de fallback cuando el proceso no especifica E/S propia</li>
          </ul>
          
          <h4>Formato de Procesos:</h4>
          <ul>
            <li><strong>PID:</strong> Identificador único del proceso</li>
            <li><strong>Arribo:</strong> Tiempo de llegada al sistema</li>
            <li><strong>Ráfagas CPU:</strong> Lista de duraciones separadas por coma</li>
            <li><strong>Prioridad:</strong> Menor número = Mayor prioridad (solo PRIORITY)</li>
          </ul>

          <h4>E/S por Proceso (JSON):</h4>
          <ul>
            <li><strong>duracion_rafaga_es:</strong> Tiempo de E/S específico para este proceso</li>
            <li>Si no se especifica, usa el valor de "Bloqueo E/S (Fallback)" global</li>
            <li>Permite que cada proceso tenga diferentes tiempos de E/S</li>
            <li>Ejemplo: P1 con 10ms de E/S, P2 con 20ms de E/S</li>
          </ul>
        </div>
      </details>
    </section>

    <!-- Estado de la simulación -->
    {#if $isSimulating}
      <div class="status-card simulating">
        <h3>Ejecutando simulación...</h3>
        <p>Por favor espere mientras se procesa la simulación.</p>
      </div>
    {/if}

    {#if $simulationError}
      <div class="status-card error">
        <h3>Error en la simulación</h3>
        <p>{$simulationError}</p>
      </div>
    {/if}
  </main>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #f5f5f5;
    min-height: calc(100vh - 200px);
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
    padding: 2rem;
    background: linear-gradient(135deg, #3f2c50 0%, #633f6e 100%);
    border-radius: 12px;
    color: white;
    box-shadow: 0 8px 32px rgba(63, 44, 80, 0.3);
    border: 3px solid #dde5b6;
  }

  .header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2.5rem;
    font-weight: bold;
    color: #dde5b6;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .subtitle {
    margin: 0;
    color: #bdc3c7;
    font-size: 1.125rem;
    font-style: italic;
  }

  .main-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .status-card {
    padding: 1.5rem;
    border-radius: 12px;
    text-align: center;
    margin-bottom: 1rem;
  }

  .status-card.simulating {
    background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
    border: 2px solid #dde5b6;
    box-shadow: 0 4px 16px rgba(255, 152, 0, 0.2);
  }

  .status-card.simulating h3 {
    color: #3f2c50;
    margin: 0 0 0.5rem 0;
    font-weight: bold;
  }

  .status-card.simulating p {
    color: #633f6e;
    margin: 0;
    font-weight: 500;
  }

  .status-card.error {
    background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
    border: 2px solid #f44336;
    box-shadow: 0 4px 16px rgba(244, 67, 54, 0.2);
  }

  .status-card.error h3 {
    color: #d32f2f;
    margin: 0 0 0.5rem 0;
    font-weight: bold;
  }

  .status-card.error p {
    color: #c62828;
    margin: 0;
    font-weight: 500;
  }

  .status-card.success {
    background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
    border: 2px solid #4caf50;
    box-shadow: 0 4px 16px rgba(76, 175, 80, 0.2);
  }

  .status-card.success h3 {
    color: #2e7d32;
    margin: 0 0 0.5rem 0;
    font-weight: bold;
  }

  .status-card.success p {
    color: #388e3c;
    margin: 0 0 1rem 0;
    font-weight: 500;
  }

  .results-button {
    background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
  }

  .results-button:hover {
    background: linear-gradient(135deg, #388e3c 0%, #4caf50 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(76, 175, 80, 0.4);
  }

  .status-card.success {
    background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
    border: 2px solid #4caf50;
    box-shadow: 0 4px 16px rgba(76, 175, 80, 0.2);
  }

  .status-card.success h3 {
    color: #2e7d32;
    margin: 0 0 0.5rem 0;
    font-weight: bold;
  }

  .status-card.success p {
    color: #388e3c;
    margin: 0;
    font-weight: 500;
  }

  .results-button {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    background: linear-gradient(135deg, #4caf50 0%, #81c784 100%);
    color: white;
    border: none;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.3s ease, transform 0.3s ease;
  }

  .results-button:hover {
    background: linear-gradient(135deg, #388e3c 0%, #66bb6a 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(76, 175, 80, 0.3);
  }

  .help-section {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #dde5b6;
  }

  .help-section details {
    cursor: pointer;
  }

  .help-section summary {
    font-weight: bold;
    padding: 1rem;
    border-radius: 8px;
    background: linear-gradient(135deg, #dde5b6 0%, #c8d49a 100%);
    color: #3f2c50;
    margin-bottom: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
  }

  .help-section summary:hover {
    background: linear-gradient(135deg, #3f2c50 0%, #633f6e 100%);
    color: #dde5b6;
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(63, 44, 80, 0.3);
  }

  .help-content {
    padding: 1rem 0;
  }

  .help-content h4 {
    margin: 1.5rem 0 0.5rem 0;
    color: #3f2c50;
    font-weight: bold;
    border-bottom: 2px solid #dde5b6;
    padding-bottom: 0.25rem;
  }

  .help-content ul {
    margin: 0 0 1rem 0;
    padding-left: 1.5rem;
  }

  .help-content li {
    margin-bottom: 0.5rem;
    color: #633f6e;
    line-height: 1.5;
  }

  .help-content li strong {
    color: #3f2c50;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    .header {
      padding: 1.5rem;
    }

    .header h1 {
      font-size: 2rem;
    }

    .status-card {
      padding: 1rem;
    }
  }

  .manual-nav-button {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #3f2c50 0%, #633f6e 100%);
    color: #dde5b6;
    border: 2px solid #dde5b6;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1rem;
  }

  .manual-nav-button:hover {
    background: linear-gradient(135deg, #dde5b6 0%, #c8d49a 100%);
    color: #3f2c50;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(63, 44, 80, 0.3);
  }
</style>