<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let file: File | null = null;
  export let cargandoArchivo = false;
  export let errors: string[] = [];
  
  const dispatch = createEventDispatcher();
  
  let previewContent = '';
  let showPreview = false;
  let previewProcesses: any[] = [];
  let previewError = '';
  
  // Tipos de archivo soportados
  const supportedTypes = {
    'application/json': 'JSON',
    'text/csv': 'CSV', 
    'text/plain': 'TXT',
    'text/tab-separated-values': 'TSV'
  };
  
  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const selectedFile = target.files?.[0] ?? null;
    
    if (selectedFile) {
      file = selectedFile;
      previewFile(selectedFile);
    } else {
      resetPreview();
    }
  }
  
  async function previewFile(selectedFile: File) {
    showPreview = false;
    previewContent = '';
    previewProcesses = [];
    previewError = '';
    
    try {
      // Verificar tipo de archivo
      const fileType = selectedFile.type || getFileTypeFromExtension(selectedFile.name);
      
      if (!isValidFileType(fileType, selectedFile.name)) {
        previewError = `Tipo de archivo no soportado. Use archivos .json, .csv o .txt`;
        return;
      }
      
      // Leer contenido del archivo
      const content = await readFileContent(selectedFile);
      previewContent = content;
      
      // Intentar parsear y mostrar preview de procesos
      try {
        previewProcesses = await parseFilePreview(content, fileType);
        showPreview = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        previewError = `Error al parsear archivo: ${errorMessage}`;
        showPreview = true; // Mostrar contenido raw aunque no se pueda parsear
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      previewError = `Error al leer archivo: ${errorMessage}`;
    }
  }
  
  function readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file);
    });
  }
  
  function getFileTypeFromExtension(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'json': return 'application/json';
      case 'csv': return 'text/csv';
      case 'txt': return 'text/plain';
      case 'tsv': return 'text/tab-separated-values';
      default: return '';
    }
  }
  
  function isValidFileType(type: string, filename: string): boolean {
    if (type in supportedTypes) return true;
    
    const ext = filename.toLowerCase().split('.').pop();
    return ['json', 'csv', 'txt', 'tsv'].includes(ext || '');
  }
  
  async function parseFilePreview(content: string, fileType: string): Promise<any[]> {
    if (fileType === 'application/json') {
      return parseJsonPreview(content);
    } else {
      return parseCsvTxtPreview(content);
    }
  }
  
  function parseJsonPreview(content: string): any[] {
    const data = JSON.parse(content);
    
    if (Array.isArray(data)) {
      return data.slice(0, 5); // Mostrar solo los primeros 5 procesos
    } else if (data.processes && Array.isArray(data.processes)) {
      return data.processes.slice(0, 5);
    } else {
      throw new Error('Formato JSON no reconocido');
    }
  }
  
  function parseCsvTxtPreview(content: string): any[] {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) throw new Error('Archivo vacío');
    
    // Detectar separador
    const separators = [',', '\t', ' ', ';'];
    let separator = ',';
    for (const sep of separators) {
      const parts = lines[0].split(sep);
      if (parts.length >= 6) {
        separator = sep;
        break;
      }
    }
    
    const processes = [];
    let startIndex = 0;
    
    // Verificar si hay headers
    const firstLine = lines[0].split(separator);
    if (firstLine.some(field => field.toLowerCase().includes('nombre') || field.toLowerCase().includes('name'))) {
      startIndex = 1;
    }
    
    // Parsear hasta 5 procesos para preview
    for (let i = startIndex; i < Math.min(lines.length, startIndex + 5); i++) {
      const parts = lines[i].split(separator).map(p => p.trim());
      if (parts.length >= 6) {
        processes.push({
          nombre: parts[0],
          tiempo_arribo: parts[1],
          cantidad_rafagas_cpu: parts[2],
          duracion_rafaga_cpu: parts[3],
          duracion_rafaga_es: parts[4],
          prioridad_externa: parts[5]
        });
      }
    }
    
    return processes;
  }
  
  function resetPreview() {
    file = null;
    showPreview = false;
    previewContent = '';
    previewProcesses = [];
    previewError = '';
  }
  
  function handleUpload() {
    dispatch('uploadFile');
  }
  
  function handleReset() {
    resetPreview();
    dispatch('reset');
  }
  
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function getFileIcon(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'json': return '📄';
      case 'csv': return '📊';
      case 'txt': return '📝';
      case 'tsv': return '📋';
      default: return '📁';
    }
  }
</script>

<div class="section card">
  <h2>1) Cargar tanda de procesos</h2>
  
  <div class="upload-area">
    <input
      type="file"
      accept=".json,.csv,.txt,.tsv"
      on:change={handleFileChange}
      id="file-input"
    />
    <label for="file-input" class="file-label">
      📁 Seleccionar archivo (JSON, CSV, TXT)
    </label>
  </div>
  
  <!-- Información del archivo seleccionado -->
  {#if file}
    <div class="file-info">
      <div class="file-details">
        <span class="file-icon">{getFileIcon(file.name)}</span>
        <div>
          <div class="file-name">{file.name}</div>
          <div class="file-meta">
            {formatFileSize(file.size)} • 
            {supportedTypes[file.type as keyof typeof supportedTypes] || getFileTypeFromExtension(file.name).toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Preview del contenido -->
  {#if showPreview}
    <div class="preview-section">
      <h3>👁️ Preview del archivo</h3>
      
      {#if previewError}
        <div class="preview-error">
          <strong>⚠️ Error en preview:</strong>
          <div>{previewError}</div>
        </div>
      {/if}
      
      {#if previewProcesses.length > 0}
        <div class="preview-table">
          <h4>📋 Procesos detectados (mostrando primeros {previewProcesses.length}):</h4>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>T. Arribo</th>
                <th>Ráfagas CPU</th>
                <th>Dur. CPU</th>
                <th>Dur. E/S</th>
                <th>Prioridad</th>
              </tr>
            </thead>
            <tbody>
              {#each previewProcesses as proceso}
                <tr>
                  <td><strong>{proceso.nombre}</strong></td>
                  <td>{proceso.tiempo_arribo}</td>
                  <td>{proceso.cantidad_rafagas_cpu}</td>
                  <td>{proceso.duracion_rafaga_cpu}</td>
                  <td>{proceso.duracion_rafaga_es}</td>
                  <td>{proceso.prioridad_externa}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
      
      <!-- Preview del contenido raw -->
      <details class="raw-content">
        <summary>📝 Ver contenido raw</summary>
        <pre class="content-preview">{previewContent.slice(0, 1000)}{previewContent.length > 1000 ? '\n... (contenido truncado)' : ''}</pre>
      </details>
    </div>
  {/if}
  
  <!-- Botones de acción -->
  <div class="btn-row">
    <button 
      class="btn-primary" 
      on:click={handleUpload} 
      disabled={cargandoArchivo || !file || !!previewError}
    >
      {cargandoArchivo ? '🔄 Cargando…' : '📤 Cargar archivo'}
    </button>
    <button class="btn-secondary" on:click={handleReset}>
      🔄 Reiniciar
    </button>
  </div>

  <!-- Errores de carga -->
  {#if errors && errors.length > 0}
    <div class="error-box section">
      <h4>❌ Errores de carga</h4>
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
  .card { 
    border: 1px solid var(--border-color, #ddd); 
    border-radius: 12px; 
    padding: 1.5rem; 
    background: var(--bg-card, #fff); 
  }
  
  .upload-area {
    margin-bottom: 1rem;
  }
  
  #file-input {
    display: none;
  }
  
  .file-label {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: var(--primary-color, #007bff);
    color: white;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .file-label:hover {
    background: var(--primary-hover, #0056b3);
  }
  
  .file-info {
    background: var(--bg-light, #f8f9fa);
    border: 1px solid var(--border-light, #e9ecef);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  .file-details {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .file-icon {
    font-size: 1.5rem;
  }
  
  .file-name {
    font-weight: bold;
    color: var(--text-primary, #333);
  }
  
  .file-meta {
    font-size: 0.9rem;
    color: var(--text-muted, #666);
  }
  
  .preview-section {
    border: 1px solid var(--border-light, #e9ecef);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    background: var(--bg-light, #f8f9fa);
  }
  
  .preview-error {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }
  
  .preview-table {
    margin-bottom: 1rem;
  }
  
  .preview-table table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  
  .preview-table th,
  .preview-table td {
    padding: 0.5rem;
    border: 1px solid var(--border-color, #ddd);
    text-align: left;
  }
  
  .preview-table th {
    background: var(--bg-header, #e9ecef);
    font-weight: bold;
  }
  
  .raw-content {
    margin-top: 1rem;
  }
  
  .content-preview {
    background: var(--bg-code, #f5f5f5);
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    padding: 1rem;
    overflow-x: auto;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    white-space: pre-wrap;
    max-height: 300px;
    overflow-y: auto;
  }
  
  .btn-row { 
    display: flex; 
    gap: 0.75rem; 
    align-items: center; 
    flex-wrap: wrap; 
  }
  
  .btn-primary { 
    background: var(--primary-color, #007bff); 
    color: white; 
    border: none; 
    padding: 0.75rem 1.5rem; 
    border-radius: 6px; 
    cursor: pointer; 
    font-weight: 500;
  }
  
  .btn-primary:disabled { 
    background: var(--disabled-color, #6c757d); 
    cursor: not-allowed; 
  }
  
  .btn-secondary {
    background: var(--secondary-color, #6c757d);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }
  
  .error-box { 
    background: #f8d7da; 
    border: 1px solid #f5c6cb; 
    color: #721c24; 
    padding: 1rem; 
    border-radius: 6px; 
    margin-top: 1rem;
  }
  
  .error-box h4 {
    margin: 0 0 0.5rem 0;
  }
  
  .error-box ul {
    margin: 0;
    padding-left: 1.5rem;
  }
</style>
