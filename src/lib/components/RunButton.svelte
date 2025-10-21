<script lang="ts">
  import { executeSimulation, canExecute, isSimulating, simulationError, simulationResult } from '$lib/stores/simulacion';
  import { get } from 'svelte/store';
  
  $: canRun = $canExecute;
  $: running = $isSimulating;
  $: error = $simulationError;
  
  let lastError = '';
  
  async function handleExecute() {
    try {
      lastError = '';
      
      // Verificar estado antes de continuar
      if (!canRun || running) {
        console.warn(' RunButton: No se puede ejecutar - canRun:', canRun, 'running:', running);
        return;
      }
      
      await executeSimulation();
      
      // Verificar que los stores se hayan actualizado correctamente
      const result = get(simulationResult);
      const currentlySimulating = get(isSimulating);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      lastError = `Error en botón: ${errorMsg}`;
      
      // Mostrar el error en una alerta también para debugging
      if (typeof window !== 'undefined') {
        alert(`Error de simulación: ${errorMsg}`);
      }
    }
  }
  
  $: displayError = error || lastError;
</script>

<div class="run-section">
  <button 
    on:click={() => {
      handleExecute();
    }}
    disabled={!canRun || running}
    class="run-button"
    class:disabled={!canRun || running}
    class:running
  >
    {#if running}
      Ejecutando...
    {:else if !canRun}
      No se puede ejecutar
    {:else}
      Simular
    {/if}
  </button>
  
  {#if displayError}
    <div class="error-display">
      <h4>Error de Validación:</h4>
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
    padding: 1.5rem;
    border: 2px solid #dde5b6;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    background: linear-gradient(135deg, white 0%, #f8f9fa 100%);
    box-shadow: 0 4px 16px rgba(63, 44, 80, 0.1);
    transition: all 0.3s ease;
  }

  .run-section:hover {
    border-color: #c8d49a;
    box-shadow: 0 6px 24px rgba(63, 44, 80, 0.15);
  }

    .run-button {
    width: 100%;
    padding: 1rem 2rem;
    font-size: 1.25rem;
    font-weight: bold;
    border: 2px solid #dde5b6;
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s ease;
    background: linear-gradient(135deg, #dde5b6 0%, #c8d49a 100%);
    color: #3f2c50;
    box-shadow: 0 4px 16px rgba(63, 44, 80, 0.2);
  }

  .run-button:hover:not(.disabled) {
    background: linear-gradient(135deg, #3f2c50 0%, #633f6e 100%);
    color: #dde5b6;
    border-color: #dde5b6;
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(63, 44, 80, 0.4);
  }

  .run-button.disabled {
    background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
    color: #6c757d;
    border-color: #dee2e6;
    cursor: not-allowed;
    box-shadow: none;
  }

  .run-button.running {
    background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
    color: #3f2c50;
    border-color: #ffb74d;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% { 
      opacity: 1; 
      box-shadow: 0 4px 16px rgba(255, 183, 77, 0.3);
    }
    50% { 
      opacity: 0.8; 
      box-shadow: 0 6px 24px rgba(255, 183, 77, 0.5);
    }
    100% { 
      opacity: 1; 
      box-shadow: 0 4px 16px rgba(255, 183, 77, 0.3);
    }
  }

  .error-display {
    margin-top: 1rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
    border: 2px solid #f44336;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(244, 67, 54, 0.2);
  }

  .error-display h4 {
    margin: 0 0 0.5rem 0;
    color: #d32f2f;
    font-weight: bold;
  }

  .error-display p {
    margin: 0;
    color: #c62828;
    font-weight: 500;
  }

  .requirements {
    margin-top: 1rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
    border: 2px solid #dde5b6;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(255, 152, 0, 0.1);
  }

  .requirements h4 {
    margin: 0 0 0.5rem 0;
    color: #3f2c50;
    font-weight: bold;
  }

  .requirements ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .requirements li {
    margin-bottom: 0.5rem;
    color: #633f6e;
    font-size: 0.875rem;
    font-weight: 500;
  }
</style>