<script lang="ts">
  import { useSimulationUI } from '$lib/application/composables/useSimulationUI';
  import { useFileDownload } from '$lib/application/composables/useFileDownload';

  const {
    simState,
    configEstablecida,
    cargandoArchivo,
    ejecutando,
    tieneProcesos,
    necesitaQuantum,
    faltanCampos,
    cargarArchivoUI,
    establecerConfiguracion,
    ejecutarSimulacion,
    reiniciarTodo,
    limpiarResultadosPrevios
  } = useSimulationUI();

  const { descargarEventosUI, descargarMetricasUI } = useFileDownload();

  // Handlers de eventos del DOM
  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    simState.update(state => ({
      ...state,
      file: target.files?.[0] ?? null
    }));
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
    <div class="btn-row">
      <input
        type="file"
        accept=".json,.csv"
        on:change={handleFileChange}
      />
      <button 
        class="btn-primary" 
        on:click={cargarArchivoUI} 
        disabled={$cargandoArchivo || !$simState.file}
      >
        {$cargandoArchivo ? 'Cargando…' : 'Cargar archivo'}
      </button>
      <button class="btn-primary" on:click={reiniciarTodo}>Reiniciar</button>
    </div>

    {#if $simState.errors?.length > 0}
      <div class="error-box">
        <h4>❌ Errores</h4>
        <ul>
          {#each $simState.errors as err}
            <li>{err}</li>
          {/each}
        </ul>
      </div>
    {/if}
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

    {#if $simState.metrics}
      <div class="section card">
        <h2>📊 Métricas por Proceso</h2>
        {#if $simState.metrics.porProceso?.length > 0}
          <table>
            <thead>
              <tr>
                <th>Proceso</th>
                <th>Tiempo de Retorno (TR)</th>
                <th>Tiempo de Retorno Normalizado (TRn)</th>
                <th>Tiempo en Estado Listo</th>
              </tr>
            </thead>
            <tbody>
              {#each $simState.metrics.porProceso as proc}
                <tr>
                  <td><strong>{proc.name}</strong></td>
                  <td>{proc.tiempoRetorno?.toFixed(2) ?? '-'}</td>
                  <td>{proc.tiempoRetornoNormalizado?.toFixed(2) ?? '-'}</td>
                  <td>{proc.tiempoEnListo?.toFixed(2) ?? '-'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else}
          <p>No hay métricas por proceso disponibles.</p>
        {/if}
      </div>
    {/if}
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
