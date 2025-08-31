<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let policy: string = '';
  export let tip: number | null = null;
  export let tfp: number | null = null; 
  export let tcp: number | null = null;
  export let quantum: number | null = null;
  export let configEstablecida: boolean = false;
  export let faltanCampos: boolean = false;
  export let tieneProcesos: boolean = false;
  export let ejecutando: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  $: necesitaQuantum = policy === 'RR';
  
  function handleConfigChange() {
    dispatch('configChange');
  }
  
  function handleSetConfig() {
    dispatch('setConfig');
  }
  
  function handleRunSimulation() {
    dispatch('runSimulation');
  }
  
  function handleChangeConfig() {
    dispatch('changeConfig');
  }
</script>

<!-- 3) Parámetros (siempre debajo de la tabla) -->
<div class="section card">
  <h2>3) Configuración de planificación</h2>
  <div class="grid grid-3">
    <label>
      <div>Política</div>
      <select bind:value={policy} on:change={handleConfigChange}>
        <option value="" disabled>Seleccionar…</option>
        <option value="FCFS">FCFS (First Come First Served)</option>
        <option value="SPN">SPN (Shortest Process Next)</option>
        <option value="SRTN">SRTN (Shortest Remaining Time Next)</option>
        <option value="PRIORITY">Prioridad Externa</option>
        <option value="RR">Round Robin</option>
      </select>
    </label>

    <label>
      <div>TIP (Tiempo de ingreso al sistema)</div>
      <input type="number" min="0" bind:value={tip} on:input={handleConfigChange} />
    </label>

    <label>
      <div>TFP (Tiempo de finalización de proceso)</div>
      <input type="number" min="0" bind:value={tfp} on:input={handleConfigChange} />
    </label>

    <label>
      <div>TCP (Tiempo de conmutación entre procesos)</div>
      <input type="number" min="0" bind:value={tcp} on:input={handleConfigChange} />
    </label>

    {#if necesitaQuantum}
      <label>
        <div>Quantum (unidades de tiempo)</div>
        <input type="number" min="1" bind:value={quantum} on:input={handleConfigChange} />
      </label>
    {/if}
  </div>

  <!-- 4) Establecer configuración -->
  <div class="section">
    <button class="btn-primary" on:click={handleSetConfig} disabled={faltanCampos}>
      Establecer configuración
    </button>
    {#if faltanCampos}
      <span class="warning">Complete todos los campos requeridos: política, TIP, TFP, TCP{#if necesitaQuantum} y Quantum{/if}.</span>
    {/if}
  </div>
</div>

<!-- 5) Configuración confirmada + controles -->
{#if configEstablecida && tieneProcesos}
  <div class="section card">
    <h2>4) Configuración establecida</h2>
    <p class="muted">Parámetros confirmados para la simulación de planificación del procesador.</p>
    <ul>
      <li><strong>Política:</strong> {policy}</li>
      <li><strong>TIP:</strong> {tip} unidades</li>
      <li><strong>TFP:</strong> {tfp} unidades</li>
      <li><strong>TCP:</strong> {tcp} unidades</li>
      {#if policy === 'RR' && quantum != null}
        <li><strong>Quantum:</strong> {quantum} unidades</li>
      {/if}
    </ul>

    <div class="btn-row">
      <button class="btn-primary" on:click={handleRunSimulation} disabled={ejecutando}>
        {ejecutando ? '🔄 Ejecutando…' : '▶️ Ejecutar simulación'}
      </button>
      <button class="btn-primary" on:click={handleChangeConfig}>
        ✏️ Cambiar configuración
      </button>
    </div>
  </div>
{/if}

<style>
  .section { margin-bottom: 1.5rem; }
  .card { border: 1px solid var(--border-color, #ddd); border-radius: 12px; padding: 1rem; background: var(--bg-card, #111); }
  .grid { display: grid; gap: 1rem; }
  .grid-3 { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
  .btn-row { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
  .btn-primary { background: #007bff; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
  .btn-primary:disabled { background: #6c757d; cursor: not-allowed; }
  .warning { color: #dc3545; font-size: 0.9rem; margin-left: 0.5rem; }
  .muted { color: #6c757d; }
  label { display: flex; flex-direction: column; gap: 0.25rem; }
  label div { font-weight: bold; }
  input, select { padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
</style>
