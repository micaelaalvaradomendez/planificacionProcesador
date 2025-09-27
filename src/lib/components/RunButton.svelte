<!-- src/lib/components/RunButton.svelte -->
<script lang="ts">
  import { executeSimulation, canExecute, isSimulating, simulationError } from '$lib/stores/simulacion';
  
  $: canRun = $canExecute;
  $: running = $isSimulating;
  $: error = $simulationError;
  
  let lastError = '';
  
  async function handleExecute() {
    try {
      lastError = '';
      await executeSimulation();
      // Si llegamos acá, la simulación fue exitosa
      // Podrías navegar a /resultados o hacer scroll a los resultados
    } catch (err) {
      // Este catch maneja errores síncronos, pero executeSimulation ya maneja sus errores internamente
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  
  $: displayError = error || lastError;
</script>

<div class="run-section">
  <button 
    on:click={handleExecute}
    disabled={!canRun || running}
    class="run-button"
    class:disabled={!canRun || running}
    class:running
  >
    {#if running}
      ⏳ Ejecutando...
    {:else if !canRun}
      ❌ No se puede ejecutar
    {:else}
      ▶️ Simular
    {/if}
  </button>
  
  {#if displayError}
    <div class="error-display">
      <h4>❌ Error de Validación:</h4>
      <p>{displayError}</p>
    </div>
  {/if}
  
  {#if !canRun && !running}
    <div class="requirements">
      <h4>Requisitos para ejecutar:</h4>
      <ul>
        <li>Debe haber al menos un proceso cargado</li>
        <li>Si usa RR, debe especificar quantum > 0</li>
        <li>Los procesos deben tener PIDs únicos</li>
        <li>Los arribos deben ser ≥ 0</li>
        <li>Cada proceso debe tener al menos una ráfaga CPU > 0</li>
      </ul>
    </div>
  {/if}
</div>

<style>
  .run-section {
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .run-button {
    width: 100%;
    padding: 1rem 2rem;
    font-size: 1.25rem;
    font-weight: bold;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    background-color: #2196f3;
    color: white;
  }

  .run-button:hover:not(.disabled) {
    background-color: #1976d2;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }

  .run-button.disabled {
    background-color: #ccc;
    color: #666;
    cursor: not-allowed;
  }

  .run-button.running {
    background-color: #ff9800;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }

  .error-display {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #ffebee;
    border: 1px solid #d32f2f;
    border-radius: 4px;
  }

  .error-display h4 {
    margin: 0 0 0.5rem 0;
    color: #d32f2f;
  }

  .error-display p {
    margin: 0;
    color: #c62828;
  }

  .requirements {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #fff3e0;
    border: 1px solid #ff9800;
    border-radius: 4px;
  }

  .requirements h4 {
    margin: 0 0 0.5rem 0;
    color: #ef6c00;
  }

  .requirements ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .requirements li {
    margin-bottom: 0.25rem;
    color: #e65100;
    font-size: 0.875rem;
  }
</style>