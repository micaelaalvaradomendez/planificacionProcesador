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
    padding: 1.5rem;
    border: 2px solid #dde5b6;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    background: linear-gradient(135deg, white 0%, #f8f9fa 100%);
    box-shadow: 0 4px 16px rgba(63, 44, 80, 0.1);
    transition: all 0.3s ease;
  }

  .cost-config:hover {
    border-color: #c8d49a;
    box-shadow: 0 6px 24px rgba(63, 44, 80, 0.15);
  }

  .cost-config h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    color: #3f2c50;
    font-weight: bold;
    font-size: 1.2rem;
    text-align: center;
    padding-bottom: 0.75rem;
    border-bottom: 3px solid #dde5b6;
  }

  .costs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  .form-group label {
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: #3f2c50;
    font-size: 0.95rem;
  }

  .form-group input {
    padding: 0.75rem 1rem;
    border: 2px solid #e9ecef;
    border-radius: 8px;
    margin-bottom: 0.5rem;
    font-size: 0.95rem;
    transition: all 0.3s ease;
    background-color: white;
    color: #3f2c50;
  }

  .form-group input:focus {
    outline: none;
    border-color: #dde5b6;
    box-shadow: 0 0 0 3px rgba(221, 229, 182, 0.3);
  }

  .form-group small {
    color: #6c757d;
    font-size: 0.825rem;
    font-style: italic;
    font-weight: 500;
  }

  .info-panel {
    background: linear-gradient(135deg, rgba(221, 229, 182, 0.1) 0%, rgba(200, 212, 154, 0.1) 100%);
    padding: 1.25rem;
    border-radius: 8px;
    border: 2px solid rgba(221, 229, 182, 0.3);
  }

  .info-panel p {
    margin: 0;
    color: #633f6e;
    font-weight: 500;
  }

  .info-panel strong {
    color: #3f2c50;
  }
</style>