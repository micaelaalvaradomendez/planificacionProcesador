<script lang="ts">
  import { loadFromTandaJSON, loadFixture, simulationConfig, procesos } from '$lib/stores/simulacion';
  import { parseTandaJSON } from '$lib/io/parser';
  import { validateJSONData } from '$lib/io/json-validator';
  
  let fileInput: HTMLInputElement;
  let dragActive = false;
  
  // Variables locales para errores de importación (no usar stores globales)
  let importError: string | null = null;
  let importWarnings: string[] = [];
  
  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      await processFile(file);
    }
  }
  
  async function processFile(file: File) {
    try {
      // Limpiar errores locales anteriores
      importError = null;
      importWarnings = [];
      
      const text = await file.text();
      let json: unknown;
      
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`JSON inválido: ${parseError instanceof Error ? parseError.message : 'Error de formato'}`);
      }
      
      // 🛡️ VALIDACIÓN DEFENSIVA: Verificar estructura antes de procesar
      const validation = validateJSONData(json);
      
      if (!validation.isValid) {
        const errorMsg = validation.errors
          .map(err => `• ${err.field}: ${err.reason}`)
          .join('\n');
        throw new Error(`Datos inválidos en archivo JSON:\n${errorMsg}`);
      }
      
      // Guardar advertencias localmente si las hay
      if (validation.warnings.length > 0) {
        importWarnings = validation.warnings;
      }
      
      // Procesar datos validados
      if (Array.isArray(json)) {
        // Es una tanda legacy - procesar localmente sin usar loadFromTandaJSON
        const ps = parseTandaJSON(json as any);
        console.log('FileImporter: Cargando procesos desde tanda JSON:', {
          count: ps.length,
          procesos: ps
        });
        procesos.set(ps);
      } else if (json && typeof json === 'object' && 'cfg' in json && 'procesos' in json) {
        // Es un escenario completo exportado - validar configuración adicional
        const obj = json as Record<string, unknown>;
        
        // Validación adicional de configuración antes de cargar
        if (obj.cfg && typeof obj.cfg === 'object') {
          const cfg = obj.cfg as Record<string, unknown>;
          
          // Validar quantum para Round Robin
          if (cfg.politica === 'RR' && (!cfg.quantum || typeof cfg.quantum !== 'number' || cfg.quantum <= 0)) {
            throw new Error('Round Robin requiere un quantum válido > 0');
          }
          
          // Validar costos si están presentes
          if (cfg.costos && typeof cfg.costos === 'object') {
            const costos = cfg.costos as Record<string, unknown>;
            for (const [key, value] of Object.entries(costos)) {
              if (typeof value === 'number' && (value < 0 || !Number.isFinite(value))) {
                throw new Error(`Costo ${key} inválido: ${value}`);
              }
            }
          }
        }
        
        console.log('FileImporter: Cargando escenario completo:', { cfg: obj.cfg, procesos: obj.procesos });
        simulationConfig.set(obj.cfg);
        procesos.set(obj.procesos);
      } else if (json && typeof json === 'object' && 'procesos' in json && Array.isArray((json as any).procesos)) {
        // Formato con procesos wrapeados - procesar localmente
        const ps = parseTandaJSON((json as any).procesos);
        console.log('FileImporter: Cargando procesos encapsulados:', {
          count: ps.length,
          procesos: ps
        });
        procesos.set(ps);
      } else {
        // Intentar como tanda simple - procesar localmente
        const ps = parseTandaJSON(json as any);
        console.log('FileImporter: Cargando como tanda simple:', {
          count: ps.length,
          procesos: ps
        });
        procesos.set(ps);
      }
      
      console.log('✅ Archivo JSON cargado exitosamente');
      
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al procesar el archivo';
      console.error('❌ Error al importar archivo:', error);
      importError = msg;
      importWarnings = [];
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
  
  <!-- Botón de información de estructura JSON -->
  <div class="json-info-section">
    <details class="json-info-details">
      <summary class="json-info-summary">
        Estructuras de JSON Soportadas
      </summary>
      <div class="json-info-content">
        <h4>Formatos de Archivo Aceptados:</h4>
        
        <div class="format-section">
          <h5>1. Tanda de Procesos (Array simple):</h5>
          <pre><code>{`[
  {
    "nombre": "P1",
    "tiempo_arribo": 0,
    "cantidad_rafagas_cpu": 4,
    "duracion_rafaga_cpu": 3,
    "duracion_rafaga_es": 2,
    "prioridad_externa": 3
  },
  {
    "nombre": "P2", 
    "tiempo_arribo": 1,
    "cantidad_rafagas_cpu": 2,
    "duracion_rafaga_cpu": 8,
    "duracion_rafaga_es": 5,
    "prioridad_externa": 1
  }
]`}</code></pre>
        </div>

        <div class="format-section">
          <h5>2. Escenario Completo con Configuración:</h5>
          <pre><code>{`{
  "cfg": {
    "politica": "RR",
    "quantum": 3,
    "costos": {
      "TIP": 1,
      "TCP": 2,
      "TFP": 1,
      "bloqueoES": 25
    }
  },
  "procesos": [
    {
      "pid": 1,
      "arribo": 0,
      "rafagas": [5, 3, 2],
      "bloqueoES": [10, 5],
      "prioridad": 2
    }
  ]
}`}</code></pre>
        </div>

        <div class="format-section">
          <h5>3. Procesos Encapsulados:</h5>
          <pre><code>{`{
  "procesos": [
    {
      "nombre": "P1",
      "tiempo_arribo": 0,
      "cantidad_rafagas_cpu": 3,
      "duracion_rafaga_cpu": 4,
      "duracion_rafaga_es": 2,
      "prioridad_externa": 1
    }
  ]
}`}</code></pre>
        </div>

        <div class="field-descriptions">
          <h5>Descripción de Campos:</h5>
          <ul>
            <li><strong>nombre/pid:</strong> Identificador del proceso</li>
            <li><strong>tiempo_arribo/arribo:</strong> Momento de llegada al sistema</li>
            <li><strong>cantidad_rafagas_cpu:</strong> Número de ráfagas CPU</li>
            <li><strong>duracion_rafaga_cpu:</strong> Duración de cada ráfaga CPU</li>
            <li><strong>duracion_rafaga_es:</strong> Duración de bloqueo E/S</li>
            <li><strong>rafagas:</strong> Array con duraciones específicas de ráfagas</li>
            <li><strong>bloqueoES:</strong> Array con duraciones específicas de E/S</li>
            <li><strong>prioridad_externa/prioridad:</strong> Prioridad del proceso</li>
          </ul>
        </div>
      </div>
    </details>
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
  
  <!-- Errores de importación -->
  {#if importError}
    <div class="import-error">
      <h4>❌ Error de Importación</h4>
      <pre class="error-message">{importError}</pre>
      <p class="error-help">
        Verifica que el archivo JSON tenga la estructura correcta. 
        Usa el botón de "Estructuras de JSON Soportadas" arriba para ver ejemplos válidos.
      </p>
    </div>
  {/if}

  <!-- Advertencias de importación -->
  {#if importWarnings.length > 0}
    <div class="import-warnings">
      <h4>⚠️ Advertencias de Importación</h4>
      <ul>
        {#each importWarnings as warning}
          <li>{warning}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .importer-container {
    padding: 1.5rem;
    border: 2px solid #dde5b6;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    background: linear-gradient(135deg, white 0%, #f8f9fa 100%);
    box-shadow: 0 4px 16px rgba(63, 44, 80, 0.1);
    transition: all 0.3s ease;
  }

  .importer-container:hover {
    border-color: #c8d49a;
    box-shadow: 0 6px 24px rgba(63, 44, 80, 0.15);
  }

  .importer-container h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    color: #3f2c50;
    font-weight: bold;
    font-size: 1.2rem;
    text-align: center;
    padding-bottom: 0.75rem;
    border-bottom: 3px solid #dde5b6;
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
    color: #3f2c50;
    font-weight: bold;
    font-size: 1rem;
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

  /* Estilos para errores de importación */
  .import-error {
    margin-top: 1rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
    border: 2px solid #f44336;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(244, 67, 54, 0.2);
  }

  .import-error h4 {
    margin: 0 0 1rem 0;
    color: #d32f2f;
    font-weight: bold;
    font-size: 1.1rem;
  }

  .error-message {
    background-color: #ffffff;
    border: 1px solid #ef5350;
    border-radius: 6px;
    padding: 1rem;
    margin: 1rem 0;
    font-family: 'Courier New', Consolas, monospace;
    font-size: 0.875rem;
    color: #c62828;
    white-space: pre-wrap;
    overflow-x: auto;
    line-height: 1.4;
  }

  .error-help {
    margin: 0;
    color: #d32f2f;
    font-size: 0.875rem;
    font-weight: 500;
    background-color: rgba(255, 255, 255, 0.8);
    padding: 0.75rem;
    border-radius: 6px;
    border-left: 4px solid #f44336;
  }

  /* Estilos mejorados para advertencias */
  .import-warnings {
    margin-top: 1rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
    border: 2px solid #ff9800;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(255, 152, 0, 0.2);
  }

  .import-warnings h4 {
    margin: 0 0 1rem 0;
    color: #ef6c00;
    font-weight: bold;
    font-size: 1rem;
  }

  .import-warnings ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .import-warnings li {
    color: #e65100;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    line-height: 1.4;
  }

  /* Estilos para la información de estructura JSON */
  .json-info-section {
    margin-top: 1rem;
    margin-bottom: 1rem;
  }

  .json-info-details {
    border: 2px solid #dde5b6;
    border-radius: 8px;
    background: linear-gradient(135deg, white 0%, #f8f9fa 100%);
    box-shadow: 0 2px 8px rgba(63, 44, 80, 0.1);
    transition: all 0.3s ease;
  }

  .json-info-details:hover {
    border-color: #c8d49a;
    box-shadow: 0 4px 12px rgba(63, 44, 80, 0.15);
  }

  .json-info-summary {
    padding: 1rem;
    cursor: pointer;
    font-weight: bold;
    color: #3f2c50;
    background: linear-gradient(135deg, #dde5b6 0%, #c8d49a 100%);
    border-radius: 6px;
    transition: all 0.2s ease;
    list-style: none;
    user-select: none;
  }

  .json-info-summary:hover {
    background: linear-gradient(135deg, #c8d49a 0%, #b8c98a 100%);
    transform: translateY(-1px);
  }

  .json-info-summary::-webkit-details-marker {
    display: none;
  }

  .json-info-summary::marker {
    content: '';
  }

  .json-info-content {
    padding: 1.5rem;
    background: white;
  }

  .json-info-content h4 {
    margin: 0 0 1rem 0;
    color: #3f2c50;
    font-weight: bold;
    border-bottom: 2px solid #dde5b6;
    padding-bottom: 0.5rem;
  }

  .format-section {
    margin-bottom: 1.5rem;
  }

  .format-section h5 {
    margin: 0 0 0.75rem 0;
    color: #5d4e75;
    font-weight: bold;
    font-size: 1rem;
  }

  .format-section pre {
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 1rem;
    overflow-x: auto;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .format-section code {
    font-family: 'Courier New', Consolas, monospace;
    color: #333;
  }

  .field-descriptions {
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    padding: 1rem;
  }

  .field-descriptions h5 {
    margin: 0 0 0.75rem 0;
    color: #3f2c50;
    font-weight: bold;
  }

  .field-descriptions ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .field-descriptions li {
    margin-bottom: 0.5rem;
    color: #555;
    line-height: 1.4;
  }

  .field-descriptions strong {
    color: #3f2c50;
  }
</style>