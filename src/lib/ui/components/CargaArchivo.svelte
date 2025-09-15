<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let archivoSeleccionado: File | null = null;
  export let cargando = false;
  export let error: string | null = null;
  
  let inputFile: HTMLInputElement;
  let dragOver = false;
  
  // Tipos de archivo soportados
  const tiposAceptados = ['.json', '.csv', '.txt'];
  const tiposDescripcion = {
    json: 'Formato JSON con procesos y configuración',
    csv: 'Formato CSV separado por comas',
    txt: 'Formato TXT según consigna del profesor'
  };
  
  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      procesarArchivo(file);
    }
  }
  
  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    
    const file = event.dataTransfer?.files[0];
    if (file) {
      procesarArchivo(file);
    }
  }
  
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragOver = true;
  }
  
  function handleDragLeave() {
    dragOver = false;
  }
  
  function procesarArchivo(file: File) {
    // Validar tipo de archivo
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!tiposAceptados.includes(extension)) {
      error = `Tipo de archivo no soportado. Use: ${tiposAceptados.join(', ')}`;
      return;
    }
    
    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      error = 'El archivo es demasiado grande. Máximo 5MB.';
      return;
    }
    
    archivoSeleccionado = file;
    error = null;
    
    // Emitir evento con el archivo
    dispatch('archivoSeleccionado', { file });
  }
  
  function removerArchivo() {
    archivoSeleccionado = null;
    error = null;
    if (inputFile) {
      inputFile.value = '';
    }
    dispatch('archivoRemovido');
  }
  
  function abrirSelector() {
    inputFile?.click();
  }
  
  // Obtener tipo de archivo para mostrar icono
  function getTipoArchivo(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }
  
  function formatearTamaño(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
</script>

<div class="carga-archivo">
  <h3 class="titulo">Cargar Archivo de Procesos</h3>
  
  <!-- Input file oculto -->
  <input 
    bind:this={inputFile}
    type="file" 
    accept="{tiposAceptados.join(',')}"
    on:change={handleFileSelect}
    style="display: none;"
  />
  
  {#if !archivoSeleccionado}
    <!-- Zona de drop -->
    <div 
      class="zona-drop"
      class:drag-over={dragOver}
      class:cargando
      on:drop={handleDrop}
      on:dragover={handleDragOver}
      on:dragleave={handleDragLeave}
      on:click={abrirSelector}
      role="button"
      tabindex="0"
      on:keydown={(e) => e.key === 'Enter' && abrirSelector()}
    >
      {#if cargando}
        <div class="estado-carga">
          <div class="spinner"></div>
          <p>Procesando archivo...</p>
        </div>
      {:else}
        <div class="contenido-drop">
          <div class="icono-upload">📁</div>
          <h4>Arrastra tu archivo aquí</h4>
          <p>o <span class="link">haz clic para seleccionar</span></p>
          <div class="tipos-soportados">
            <small>Tipos soportados: {tiposAceptados.join(', ')}</small>
          </div>
        </div>
      {/if}
    </div>
    
  {:else}
    <!-- Archivo seleccionado -->
    <div class="archivo-seleccionado">
      <div class="archivo-info">
        <div class="archivo-detalles">
          <h4 class="archivo-nombre">{archivoSeleccionado.name}</h4>
          <div class="archivo-meta">
            <span class="archivo-tamaño">{formatearTamaño(archivoSeleccionado.size)}</span>
            <span class="archivo-tipo">{getTipoArchivo(archivoSeleccionado.name).toUpperCase()}</span>
          </div>
        </div>
      </div>
      <button 
        class="boton-remover"
        on:click={removerArchivo}
        title="Remover archivo"
        type="button"
      >
        ✕
      </button>
    </div>
  {/if}
  
  <!-- Errores -->
  {#if error}
    <div class="error">
      <span class="error-icono">⚠️</span>
      <span class="error-mensaje">{error}</span>
    </div>
  {/if}
</div>

<style>
  .carga-archivo {
    background: var(--blanco-puro);
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid var(--celeste-suave);
  }

  .titulo {
    margin: 0 0 20px 0;
    color: var(--gris-casi-negro);
    font-size: 1.25rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .titulo::before {
    font-size: 1.2em;
  }

  /* Zona de drop */
  .zona-drop {
    border: 3px dashed var(--celeste-suave);
    border-radius: 12px;
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: var(--blanco-tiza);
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .zona-drop:hover {
    border-color: var(--turquesa-intenso);
    background: var(--marfil-claro);
    transform: translateY(-2px);
  }

  .zona-drop.drag-over {
    border-color: var(--turquesa-intenso);
    background: var(--marfil-claro);
    border-style: solid;
  }

  .zona-drop.cargando {
    cursor: not-allowed;
    border-color: var(--gris-medio);
  }

  .contenido-drop {
    width: 100%;
  }

  .icono-upload {
    font-size: 4rem;
    margin-bottom: 16px;
    opacity: 0.7;
  }

  .zona-drop h4 {
    margin: 0 0 8px 0;
    color: var(--gris-casi-negro);
    font-size: 1.2rem;
    font-weight: 600;
  }

  .zona-drop p {
    margin: 0 0 16px 0;
    color: var(--gris-medio);
    font-size: 1rem;
  }

  .link {
    color: var(--turquesa-intenso);
    font-weight: 600;
    text-decoration: underline;
  }

  .tipos-soportados {
    background: var(--durazno-claro);
    padding: 8px 16px;
    border-radius: 20px;
    display: inline-block;
  }

  .tipos-soportados small {
    color: var(--gris-medio);
    font-size: 0.85rem;
  }

  /* Estado de carga */
  .estado-carga {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--celeste-suave);
    border-top: 4px solid var(--turquesa-intenso);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }


  /* Archivo seleccionado */
  .archivo-seleccionado {
    background: var(--marfil-claro);
    border: 2px solid var(--turquesa-intenso);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .archivo-info {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
  }

  .archivo-detalles {
    flex: 1;
  }

  .archivo-nombre {
    margin: 0 0 6px 0;
    color: var(--gris-casi-negro);
    font-size: 1.1rem;
    font-weight: 600;
    word-break: break-word;
  }

  .archivo-meta {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .archivo-tamaño {
    background: var(--durazno-claro);
    color: var(--gris-casi-negro);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .archivo-tipo {
    background: var(--turquesa-intenso);
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .boton-remover {
    background: var(--coral-vibrante);
    color: white;
    border: none;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: bold;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .boton-remover:hover {
    background: var(--rojo-elegante);
    transform: scale(1.1);
  }

  /* Error */
  .error {
    background: var(--durazno-claro);
    border: 1px solid var(--coral-vibrante);
    border-radius: 8px;
    padding: 12px 16px;
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .error-icono {
    color: var(--rojo-elegante);
    font-size: 1.2rem;
  }

  .error-mensaje {
    color: var(--rojo-elegante);
    font-size: 0.9rem;
    font-weight: 500;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .carga-archivo {
      padding: 16px;
    }

    .zona-drop {
      padding: 30px 15px;
      min-height: 150px;
    }

    .icono-upload {
      font-size: 3rem;
    }

    .archivo-seleccionado {
      flex-direction: column;
      align-items: flex-start;
    }

    .archivo-info {
      width: 100%;
    }

    .archivo-meta {
      flex-wrap: wrap;
    }
  }
</style>
