<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let selectedMode: 'json' | 'csv' = 'json';
  export let file: File | null = null;
  export let loading = false;
  export let errors: string[] = [];
  
  const dispatch = createEventDispatcher();
  
  let fileInput: HTMLInputElement;
  
  function handleModeChange(mode: 'json' | 'csv') {
    selectedMode = mode;
    file = null;
    if (fileInput) {
      fileInput.value = '';
    }
    dispatch('modeChange', { mode });
  }
  
  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    file = target.files?.[0] ?? null;
    dispatch('fileChange', { file, mode: selectedMode });
  }
  
  function handleLoadFile() {
    if (file && selectedMode) {
      dispatch('loadFile', { file, mode: selectedMode });
    }
  }
  
  function getAcceptForMode(mode: 'json' | 'csv'): string {
    return mode === 'json' ? '.json' : '.csv,.txt';
  }
  
  function getDescriptionForMode(mode: 'json' | 'csv'): string {
    if (mode === 'json') {
      return 'Formato: [{"nombre":"P1","tiempo_arribo":0,"cantidad_rafagas_cpu":3,"duracion_rafaga_cpu":6,"duracion_rafaga_es":2,"prioridad_externa":3}]';
    }
    return 'Formato CSV/TXT: nombre,tiempo_arribo,cantidad_rafagas_cpu,duracion_rafaga_cpu,duracion_rafaga_es,prioridad_externa (sin headers)';
  }
  
  function getIconForMode(mode: 'json' | 'csv'): string {
    return mode === 'json' ? '📄' : '📊';
  }
  
  function getLabelForMode(mode: 'json' | 'csv'): string {
    return mode === 'json' ? 'Archivo JSON' : 'Archivo CSV/TXT';
  }
</script>

<div class="file-loader">
  <!-- Selector de tipo de archivo -->
  <div class="mode-selector">
    <h3>Tipo de archivo</h3>
    <div class="mode-buttons">
      <button
        class="mode-btn {selectedMode === 'json' ? 'active' : ''}"
        on:click={() => handleModeChange('json')}
      >
        <span class="mode-icon">📄</span>
        <span class="mode-label">Archivo JSON</span>
      </button>
      <button
        class="mode-btn {selectedMode === 'csv' ? 'active' : ''}"
        on:click={() => handleModeChange('csv')}
      >
        <span class="mode-icon">📊</span>
        <span class="mode-label">Archivo CSV/TXT</span>
      </button>
    </div>
  </div>
  
  <!-- Información del tipo seleccionado -->
  <div class="type-info">
    <div class="info-card">
      <h4>{getIconForMode(selectedMode)} {getLabelForMode(selectedMode)}</h4>
      <p class="description">{getDescriptionForMode(selectedMode)}</p>
      <p class="example">📎 Ejemplo: <code>ejemplo.{selectedMode}</code></p>
    </div>
  </div>
  
  <!-- Selector de archivo -->
  <div class="file-selector">
    <input
      bind:this={fileInput}
      type="file"
      accept={getAcceptForMode(selectedMode)}
      on:change={handleFileChange}
      disabled={loading}
    />
    
    {#if file}
      <div class="file-info">
        <span class="file-icon">{getIconForMode(selectedMode)}</span>
        <span class="file-name">{file.name}</span>
        <span class="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
      </div>
    {/if}
  </div>
  
  <!-- Botón de carga -->
  <div class="load-button">
    <button
      class="btn-primary"
      on:click={handleLoadFile}
      disabled={loading || !file}
    >
      {loading ? 'Cargando...' : 'Cargar archivo'}
    </button>
  </div>
  
  <!-- Errores -->
  {#if errors.length > 0}
    <div class="error-box">
      <h4>❌ Errores</h4>
      <ul>
        {#each errors as error}
          <li>{error}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .file-loader {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .mode-selector h3 {
    margin: 0 0 1rem 0;
    color: var(--color-text-primary, #333);
  }
  
  .mode-buttons {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .mode-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    border: 2px solid #ddd;
    border-radius: 8px;
    background: #f8f9fa;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .mode-btn:hover {
    border-color: #007bff;
    background: #e9ecef;
  }
  
  .mode-btn.active {
    border-color: #007bff;
    background: #e7f3ff;
    color: #007bff;
  }
  
  .mode-icon {
    font-size: 1.5rem;
  }
  
  .mode-label {
    font-weight: 500;
  }
  
  .type-info {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1rem;
  }
  
  .info-card h4 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }
  
  .description {
    margin: 0 0 0.5rem 0;
    color: #666;
    font-size: 0.9rem;
  }
  
  .example {
    margin: 0;
    font-size: 0.85rem;
    color: #999;
  }
  
  .example code {
    background: #e9ecef;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: monospace;
  }
  
  .file-selector input[type="file"] {
    width: 100%;
    padding: 0.75rem;
    border: 2px dashed #ddd;
    border-radius: 8px;
    background: #f8f9fa;
    cursor: pointer;
  }
  
  .file-selector input[type="file"]:hover {
    border-color: #007bff;
  }
  
  .file-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: #d4edda;
    border-radius: 6px;
    font-size: 0.9rem;
  }
  
  .file-icon {
    font-size: 1.2rem;
  }
  
  .file-name {
    font-weight: 500;
    color: #333;
  }
  
  .file-size {
    color: #666;
  }
  
  .load-button {
    display: flex;
    justify-content: flex-start;
  }
  
  .btn-primary {
    padding: 0.75rem 2rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: #0056b3;
  }
  
  .btn-primary:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
  
  .error-box {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 6px;
    padding: 1rem;
  }
  
  .error-box h4 {
    margin: 0 0 0.5rem 0;
    color: #721c24;
  }
  
  .error-box ul {
    margin: 0;
    padding-left: 1.5rem;
  }
  
  .error-box li {
    color: #721c24;
    margin-bottom: 0.25rem;
  }
</style>
