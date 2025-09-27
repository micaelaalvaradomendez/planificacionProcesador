<!-- src/lib/components/PolicySelector.svelte -->
<script lang="ts">
  import { simulationConfig } from '$lib/stores/simulacion';
  
  // Usar derivación reactiva más explícita
  $: cfg = $simulationConfig;
  
  function updatePolicy(politica: string) {
    simulationConfig.update(c => ({ ...c, politica: politica as any }));
  }
  
  function updateQuantum(quantum: number) {
    simulationConfig.update(c => ({ ...c, quantum }));
  }
  
  function updateAging(field: 'step' | 'quantum', value: number) {
    simulationConfig.update(c => ({
      ...c,
      aging: { ...(c.aging || { step: 1, quantum: 4 }), [field]: value }
    }));
  }
</script>

<div class="policy-selector">
  <div class="form-group">
    <label for="politica">Política de Planificación:</label>
    <select 
      id="politica" 
      value={cfg.politica}
      on:change={(e) => updatePolicy(e.currentTarget.value)}
    >
      <option value="FCFS">FCFS (First Come First Served)</option>
      <option value="RR">RR (Round Robin)</option>
      <option value="SPN">SPN (Shortest Process Next)</option>
      <option value="SRTN">SRTN (Shortest Remaining Time Next)</option>
      <option value="PRIORITY">PRIORITY (con Aging)</option>
    </select>
  </div>

  {#if cfg.politica === 'RR'}
    <div class="form-group">
      <label for="quantum">Quantum:</label>
      <input 
        id="quantum"
        type="number" 
        min="1" 
        value={cfg.quantum || ''}
        on:input={(e) => updateQuantum(+e.currentTarget.value)}
        placeholder="Ingrese quantum > 0"
      />
      {#if !cfg.quantum || cfg.quantum <= 0}
        <span class="error">⚠️ RR requiere quantum > 0</span>
      {/if}
    </div>
  {/if}

  {#if cfg.politica === 'PRIORITY'}
    <div class="priority-info">
      <p><strong>Regla:</strong> Menor número = Mayor prioridad</p>
      <div class="form-group">
        <label for="aging-step">Aging Step:</label>
        <input 
          id="aging-step"
          type="number" 
          min="1" 
          value={cfg.aging?.step ?? 1}
          on:input={(e) => updateAging('step', +e.currentTarget.value)}
          placeholder="Cuánto mejora la prioridad"
        />
      </div>
      <div class="form-group">
        <label for="aging-quantum">Aging Quantum:</label>
        <input 
          id="aging-quantum"
          type="number" 
          min="1" 
          value={cfg.aging?.quantum ?? 4}
          on:input={(e) => updateAging('quantum', +e.currentTarget.value)}
          placeholder="Cada cuántos ticks aplica aging"
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .policy-selector {
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }

  .form-group input, .form-group select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .error {
    color: #d32f2f;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: block;
  }

  .priority-info {
    background-color: #f5f5f5;
    padding: 1rem;
    border-radius: 4px;
    margin-top: 0.5rem;
  }

  .priority-info p {
    margin: 0 0 1rem 0;
    color: #666;
  }
</style>