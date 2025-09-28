<!-- src/lib/components/CostConfigForm.svelte -->
<script lang="ts">
  import { simulationConfig } from '$lib/stores/simulacion';
  
  $: cfg = $simulationConfig;
  $: costos = cfg.costos || { TIP: 1, TCP: 1, TFP: 1, bloqueoES: 25 };
  
  function setCost(key: string, value: number) {
    const newValue = Math.max(0, value);
    simulationConfig.update(c => ({
      ...c,
      costos: { ...(c.costos || { TIP: 1, TCP: 1, TFP: 1, bloqueoES: 25 }), [key]: newValue }
    }));
  }
</script>

<div class="cost-config">
  <h3>Configuración de Costos</h3>
  
  <div class="costs-grid">
    <div class="form-group">
      <label for="tip">TIP (Tiempo Ingreso Proceso):</label>
      <input 
        id="tip"
        type="number" 
        min="0" 
        value={costos.TIP}
        on:input={(e) => setCost('TIP', +e.currentTarget.value)}
      />
      <small>Costo de crear un proceso nuevo</small>
    </div>

    <div class="form-group">
      <label for="tcp">TCP (Tiempo Cambio Proceso):</label>
      <input 
        id="tcp"
        type="number" 
        min="0" 
        value={costos.TCP}
        on:input={(e) => setCost('TCP', +e.currentTarget.value)}
      />
      <small>Costo de cambio de contexto</small>
    </div>

    <div class="form-group">
      <label for="tfp">TFP (Tiempo Fin Proceso):</label>
      <input 
        id="tfp"
        type="number" 
        min="0" 
        value={costos.TFP}
        on:input={(e) => setCost('TFP', +e.currentTarget.value)}
      />
      <small>Costo de finalizar un proceso</small>
    </div>

    <div class="form-group">
      <label for="bloqueoES">Bloqueo E/S (Fallback):</label>
      <input 
        id="bloqueoES"
        type="number" 
        min="0" 
        value={costos.bloqueoES}
        on:input={(e) => setCost('bloqueoES', +e.currentTarget.value)}
      />
      <small>Fallback cuando el proceso no especifica su propio tiempo de E/S</small>
    </div>
  </div>

  <div class="info-panel">
    <p><strong>Nota:</strong> Cada proceso puede especificar su propio tiempo de E/S en el JSON (campo 'duracion_rafaga_es'). Este valor se usa como fallback cuando no se especifica.</p>
  </div>
</div>

<style>
  .cost-config {
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .cost-config h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #333;
  }

  .costs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  .form-group label {
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .form-group input {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-bottom: 0.25rem;
  }

  .form-group small {
    color: #666;
    font-size: 0.875rem;
  }

  .info-panel {
    background-color: #e3f2fd;
    padding: 1rem;
    border-radius: 4px;
    border-left: 4px solid #2196f3;
  }

  .info-panel p {
    margin: 0;
    color: #1565c0;
  }
</style>