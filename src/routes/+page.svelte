<script lang="ts">
  import { useSimulationUI } from '$lib/application/composables/useSimulationUI';
  import { useFileDownload } from '$lib/application/composables/useFileDownload';
  import UploadFileWithPreview from '$lib/ui/components/UploadFileWithPreview.svelte';
  import EventsPanel from '$lib/ui/components/EventsPanel.svelte';
  import StatsPanel from '$lib/ui/components/StatsPanel.svelte';

  const {
    simState,
    configEstablecida,
    cargandoArchivo,
    ejecutando,
    tieneProcesos,
    necesitaQuantum,
    faltanCampos,
    cargarArchivoUI,
    cambiarModoArchivo,
    cargarArchivoConModo,
    establecerConfiguracion,
    ejecutarSimulacion,
    reiniciarTodo,
    limpiarResultadosPrevios
  } = useSimulationUI();

  const { descargarEventosUI, descargarMetricasUI } = useFileDownload();

  // Handlers para el nuevo componente de carga con preview
  function handleUploadFile() {
    const state = $simState;
    if (state.file) {
      // Detectar tipo automáticamente basado en extensión
      const fileName = state.file.name.toLowerCase();
      const mode = fileName.endsWith('.json') ? 'json' : 'csv';
      cargarArchivoConModo(state.file, mode);
    }
  }

  function handleResetFile() {
    simState.update(state => ({ 
      ...state, 
      file: null, 
      loaded: false, 
      workload: null, 
      errors: [] 
    }));
    configEstablecida.set(false);
    limpiarResultadosPrevios();
  }

  function handleConfigChange() {
    configEstablecida.set(false);
  }

  function handleDescargarEventos() {
    const state = $simState;
    descargarEventosUI(state.events);
  }

  function handleDescargarMetricas() {
    const state = $simState;
    descargarMetricasUI(state.metrics);
  }

  function handleCambiarConfiguracion() {
    configEstablecida.set(false);
    limpiarResultadosPrevios();
  }
</script>

<div class="container">
  <h1>Simulador de Planificación del Procesador</h1>

  <!-- 1) Cargar tanda de procesos -->
  <div class="section card">
    <h2>1) Cargar tanda de procesos</h2>
    
    <UploadFileWithPreview
      bind:file={$simState.file}
      bind:cargandoArchivo={$cargandoArchivo}
      bind:errors={$simState.errors}
      on:uploadFile={handleUploadFile}
      on:reset={handleResetFile}
    />
    
    <div class="btn-row">
      <button class="btn-primary" on:click={reiniciarTodo}>Reiniciar Todo</button>
    </div>
  </div>

  <!-- 2) Tabla de procesos cargados -->
  {#if $tieneProcesos}
    <div class="section card">
      <h2>2) Procesos cargados</h2>
      <table>
        <thead>
          <tr>
            <th>Nombre del Proceso</th>
            <th>Tiempo de Arribo</th>
            <th>Ráfagas de CPU</th>
            <th>Duración de Ráfaga CPU</th>
            <th>Duración de Ráfaga E/S</th>
            <th>Prioridad Externa</th>
          </tr>
        </thead>
        <tbody>
          {#each $simState.workload?.processes ?? [] as p}
            <tr>
              <td><strong>{p.name ?? '-'}</strong></td>
              <td>{p.tiempoArribo ?? '-'}</td>
              <td>{p.rafagasCPU ?? '-'}</td>
              <td>{p.duracionRafagaCPU ?? '-'}</td>
              <td>{p.duracionRafagaES ?? '-'}</td>
              <td>{p.prioridad ?? '-'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- 3) Configuración de planificación -->
  <div class="section card">
    <h2>3) Configuración de planificación</h2>
    <div class="grid grid-3">
      <label>
        <div>Política de Planificación</div>
        <select bind:value={$simState.policy} on:change={handleConfigChange}>
          <option value="" disabled>Seleccionar política…</option>
          <option value="FCFS">FCFS (First Come First Served)</option>
          <option value="PRIORITY">Prioridad Externa</option>
          <option value="RR">Round Robin</option>
          <option value="SPN">SPN (Shortest Process Next)</option>
          <option value="SRTN">SRTN (Shortest Remaining Time Next)</option>
        </select>
      </label>

      <label>
        <div>TIP (Tiempo de ingreso al sistema)</div>
        <input 
          type="number" 
          min="0" 
          bind:value={$simState.tip} 
          on:input={handleConfigChange} 
        />
      </label>

      <label>
        <div>TFP (Tiempo de finalización de proceso)</div>
        <input 
          type="number" 
          min="0" 
          bind:value={$simState.tfp} 
          on:input={handleConfigChange} 
        />
      </label>

      <label>
        <div>TCP (Tiempo de conmutación entre procesos)</div>
        <input 
          type="number" 
          min="0" 
          bind:value={$simState.tcp} 
          on:input={handleConfigChange} 
        />
      </label>

      {#if $necesitaQuantum}
        <label>
          <div>Quantum (unidades de tiempo)</div>
          <input 
            type="number" 
            min="1" 
            bind:value={$simState.quantum} 
            on:input={handleConfigChange} 
          />
        </label>
      {/if}
    </div>

    <div class="btn-row">
      <button 
        class="btn-primary" 
        on:click={establecerConfiguracion} 
        disabled={$faltanCampos}
      >
        Establecer configuración
      </button>
      {#if $faltanCampos}
        <span class="warning">
          Complete todos los campos requeridos: política, TIP, TFP, TCP{#if $necesitaQuantum} y Quantum{/if}.
        </span>
      {/if}
    </div>
  </div>

  <!-- 4) Configuración establecida + ejecución -->
  {#if $configEstablecida && $tieneProcesos}
    <div class="section card">
      <h2>4) Configuración establecida</h2>
      <p class="muted">Parámetros confirmados para la simulación de planificación del procesador.</p>
      <ul>
        <li><strong>Política:</strong> {$simState.policy}</li>
        <li><strong>TIP:</strong> {$simState.tip} unidades</li>
        <li><strong>TFP:</strong> {$simState.tfp} unidades</li>
        <li><strong>TCP:</strong> {$simState.tcp} unidades</li>
        {#if $simState.policy === 'RR' && $simState.quantum != null}
          <li><strong>Quantum:</strong> {$simState.quantum} unidades</li>
        {/if}
      </ul>

      <div class="btn-row">
        <button 
          class="btn-primary" 
          on:click={ejecutarSimulacion} 
          disabled={$ejecutando}
        >
          {$ejecutando ? '🔄 Ejecutando…' : '▶️ Ejecutar simulación'}
        </button>
        <button class="btn-primary" on:click={handleCambiarConfiguracion}>
          ✏️ Cambiar configuración
        </button>
      </div>
    </div>
  {/if}

  <!-- 5) Resultados de la simulación -->
  {#if $simState.simulacionCompletada}
    <div class="section card">
      <h2>5) Resultados de la simulación</h2>
      <div class="results-panel">
        <p><strong>✅ Simulación completada exitosamente</strong></p>
        <p><strong>Tiempo total de simulación:</strong> {$simState.tiempoTotalSimulacion} unidades</p>
        <p><strong>Eventos generados:</strong> {$simState.events?.length ?? 0}</p>
      </div>

      <div class="btn-row">
        <button class="btn-primary" on:click={handleDescargarEventos}>
          📄 Descargar Eventos (CSV)
        </button>
        <button class="btn-primary" on:click={handleDescargarMetricas}>
          📊 Descargar Métricas (JSON)
        </button>
        <button class="btn-primary" on:click={reiniciarTodo}>
          🔁 Reiniciar todo
        </button>
      </div>
    </div>

    {#if $simState.simulacionCompletada}
      <!-- Debug: Mostrar siempre si la simulación está completada -->
      <div class="section card" style="background: #fff3cd; border: 1px solid #ffeaa7; margin: 1rem 0;">
        <h3>🔍 Debug Estado Simulación</h3>
        <p><strong>Simulación Completada:</strong> {$simState.simulacionCompletada}</p>
        <p><strong>Métricas Existen:</strong> {!!$simState.metrics}</p>
        <p><strong>Métricas por Proceso Existen:</strong> {!!$simState.metrics?.porProceso}</p>
        <p><strong>Cantidad Procesos:</strong> {$simState.metrics?.porProceso?.length || 0}</p>
        <details>
          <summary>Estado completo</summary>
          <pre style="font-size: 10px; max-height: 300px; overflow: auto;">{JSON.stringify($simState, null, 2)}</pre>
        </details>
      </div>
      
      {#if $simState.metrics && $simState.metrics.porProceso}
        <!-- Panel completo de métricas según consigna -->
        <StatsPanel 
          simState={$simState} 
          onDescargarEventos={handleDescargarEventos}
          onDescargarMetricas={handleDescargarMetricas}
        />
      {:else}
        <div class="section card">
          <h2>⚠️ Métricas no disponibles</h2>
          <p>Las métricas no están disponibles o no se pudieron calcular.</p>
        </div>
      {/if}
    {:else}
      <!-- Mostrar solo si no se ha completado la simulación -->
      <div class="section card" style="background: #f8f9fa;">
        <p>Ejecute una simulación para ver las métricas</p>
      </div>
    {/if}

    <!-- Panel de eventos -->
    <EventsPanel events={$simState.events || []} />
  {/if}

  <!-- 6) Advertencias -->
  {#if $simState.advertencias?.length > 0}
    <div class="section card">
      <h2>⚠️ Advertencias</h2>
      <ul>
        {#each $simState.advertencias as adv}
          <li>{adv}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
