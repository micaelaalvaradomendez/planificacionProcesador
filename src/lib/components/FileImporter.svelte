<!-- src/lib/components/FileImporter.svelte -->
<script lang="ts">
  import { loadFromTandaJSON, loadFixture, simulationError, importWarnings, simulationConfig, procesos } from '$lib/stores/simulacion';
  import { parseTandaJSON } from '$lib/io/parser';
  
  let fileInput: HTMLInputElement;
  let dragActive = false;
  
  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      await processFile(file);
    }
  }
  
  async function processFile(file: File) {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      
      // Detectar si es una tanda (array) o un escenario completo
      if (Array.isArray(json)) {
        // Es una tanda legacy
        loadFromTandaJSON(json);
      } else if (json.cfg && json.procesos) {
        // Es un escenario completo exportado
        simulationConfig.set(json.cfg);
        procesos.set(json.procesos);
      } else if (json.procesos && Array.isArray(json.procesos)) {
        // Formato con procesos wrapeados
        loadFromTandaJSON(json.procesos);
      } else {
        // Intentar como tanda simple
        loadFromTandaJSON(json);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al procesar el archivo';
      console.error('Error al importar archivo:', error);
      // El error se maneja en los stores
    }
  }
  
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragActive = true;
  }
  
  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    dragActive = false;
  }
  
  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragActive = false;
    
    const file = event.dataTransfer?.files[0];
    if (file && file.type === 'application/json') {
      await processFile(file);
    }
  }
  
  function triggerFileInput() {
    fileInput.click();
  }
</script>

<div class="importer-container">
  <h3>  Importar Datos</h3>
  
  <!-- Input de archivo oculto -->
  <input 
    bind:this={fileInput}
    type="file" 
    accept=".json"
    on:change={handleFileSelect}
    style="display: none;"
  />
  
  <!-- Zona de drop -->
  <div 
    class="drop-zone"
    class:active={dragActive}
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
    role="button"
    tabindex="0"
    on:click={triggerFileInput}
    on:keydown={(e) => e.key === 'Enter' && triggerFileInput()}
  >
    <div class="drop-content">
      <div class="drop-icon">📄</div>
      <p class="drop-text">
        Arrastre un archivo JSON aquí o haga clic para seleccionar
      </p>
      <p class="drop-subtext">
        Formatos soportados: Tandas legacy, escenarios completos
      </p>
    </div>
  </div>
  
  <!-- Botones de fixtures -->
  <div class="fixtures-section">
    <h4>  Fixtures de Prueba</h4>
    <div class="fixtures-grid">
      <button 
        on:click={() => loadFixture('A_sinES_FCFS')}
        class="fixture-btn"
      >
        📘 A_sinES_FCFS
        <small>2 procesos, sin E/S</small>
      </button>
      
      <button 
        on:click={() => loadFixture('B_conES_25')}
        class="fixture-btn"
      >
        📗 B_conES_25
        <small>Con E/S por proceso (valores diferentes)</small>
      </button>
      
      <button 
        on:click={() => loadFixture('RR_q2')}
        class="fixture-btn"
      >
        📙 RR_q2
        <small>Round Robin</small>
      </button>
      
      <button 
        on:click={() => loadFixture('SRTN_preempt')}
        class="fixture-btn"
      >
        📕 SRTN_preempt
        <small>Con desalojo</small>
      </button>
    </div>
  </div>
  
  <!-- Warnings de importación -->
  {#if $importWarnings.length > 0}
    <div class="warnings">
      <h4>⚠️ Advertencias de Importación</h4>
      <ul>
        {#each $importWarnings as warning}
          <li>{warning}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .importer-container {
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .importer-container h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #333;
  }

  .drop-zone {
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background-color: #fafafa;
    margin-bottom: 1rem;
  }

  .drop-zone:hover, .drop-zone.active {
    border-color: #2196f3;
    background-color: #e3f2fd;
  }

  .drop-content {
    pointer-events: none;
  }

  .drop-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .drop-text {
    margin: 0 0 0.5rem 0;
    font-weight: bold;
    color: #333;
  }

  .drop-subtext {
    margin: 0;
    font-size: 0.875rem;
    color: #666;
  }

  .fixtures-section {
    margin-top: 1rem;
  }

  .fixtures-section h4 {
    margin: 0 0 1rem 0;
    color: #555;
  }

  .fixtures-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
  }

  .fixture-btn {
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: white;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .fixture-btn:hover {
    background-color: #f5f5f5;
    border-color: #bbb;
    transform: translateY(-1px);
  }

  .fixture-btn small {
    display: block;
    margin-top: 0.25rem;
    color: #666;
    font-size: 0.75rem;
  }

  .warnings {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #fff3e0;
    border: 1px solid #ff9800;
    border-radius: 4px;
  }

  .warnings h4 {
    margin: 0 0 0.5rem 0;
    color: #ef6c00;
  }

  .warnings ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .warnings li {
    color: #e65100;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }
</style>