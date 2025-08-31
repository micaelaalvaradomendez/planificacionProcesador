<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let file: File | null = null;
  export let cargandoArchivo = false;
  export let errors: string[] = [];
  
  const dispatch = createEventDispatcher();
  
  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    file = target.files?.[0] ?? null;
  }
  
  function handleUpload() {
    dispatch('uploadFile');
  }
  
  function handleReset() {
    dispatch('reset');
  }
</script>

<div class="section card">
  <h2>1) Cargar tanda de procesos</h2>
  <div class="btn-row">
    <input
      type="file"
      accept=".json,.csv"
      on:change={handleFileChange}
    />
    <button class="btn-primary" on:click={handleUpload} disabled={cargandoArchivo || !file}>
      {cargandoArchivo ? 'Cargando…' : 'Cargar archivo'}
    </button>
    <button class="btn-primary" on:click={handleReset}>Reiniciar</button>
  </div>

  {#if errors && errors.length > 0}
    <div class="error-box section">
      <h4>❌ Errores</h4>
      <ul>
        {#each errors as err}
          <li>{err}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .section { margin-bottom: 1.5rem; }
  .card { border: 1px solid var(--border-color, #ddd); border-radius: 12px; padding: 1rem; background: var(--bg-card, #111); }
  .btn-row { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
  .btn-primary { background: #007bff; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
  .btn-primary:disabled { background: #6c757d; cursor: not-allowed; }
  .error-box { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 1rem; border-radius: 4px; }
  input[type="file"] { padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
</style>
