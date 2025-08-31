<link rel="stylesheet" href="/src/lib/io/ui/styles/style.css">
<script lang="ts">
  import { cargarArchivo } from '$lib/application/usecases/parseInput';
  import { runSimulationWithTimeout } from '$lib/application/usecases/simulationRunner';
  import { descargarEventos, descargarMetricas } from '$lib/application/usecases/exportResults';
  import type { SimulationState } from '$lib/application/usecases/simulationState';
  import { getInitialSimulationState, resetSimulationState } from '$lib/application/usecases/simulationState';
  import type { Metrics } from '$lib/application/usecases/simulationState';

  let simState: SimulationState = getInitialSimulationState();
  let configEstablecida = false;
  let puedeEstablecer = true;

  async function cargarArchivoUI() {
  const result = await cargarArchivo(simState.file, simState.mode, simState.policy, simState.tip, simState.tfp, simState.tcp, simState.quantum);
  simState.errors = result.errors;
  simState.workload = result.workload;
  simState.loaded = result.loaded;
  simState.simulacionCompletada = false;
  configEstablecida = false; // Resetear config al cargar nuevo archivo
  }

  async function ejecutarSimulacionUI() {
    if (!simState.workload) {
      simState.errors.push('Primero debés cargar una tanda de procesos');
      return;
    }
    simState.workload.config.policy = simState.policy;
    simState.workload.config.tip = simState.tip;
    simState.workload.config.tfp = simState.tfp;
    simState.workload.config.tcp = simState.tcp;
    simState.workload.config.quantum = simState.quantum;
    simState.errors = [];
    // Limpiar resultados previos
    simState.simulacionCompletada = false;
    simState.simulacionEnCurso = false;
    simState.events = [];
    simState.metrics = {} as Metrics;
    simState.ganttSlices = [];
    simState.estadisticasExtendidas = null;
    simState.tiempoTotalSimulacion = 0;
    simState.advertencias = [];
    const result = await runSimulationWithTimeout(simState.workload);
    simState.simulacionEnCurso = result.simulacionEnCurso;
    simState.simulacionCompletada = result.simulacionCompletada;
    simState.events = result.events;
    simState.metrics = result.metrics;
    simState.ganttSlices = result.ganttSlices;
    simState.estadisticasExtendidas = result.estadisticasExtendidas;
    simState.tiempoTotalSimulacion = result.tiempoTotalSimulacion;
    simState.advertencias = result.advertencias;
    simState.errors = result.errors;
  }

  function descargarEventosUI() {
    descargarEventos(simState.events, simState.workload?.workloadName);
  }

  function descargarMetricasUI() {
    descargarMetricas(simState.metrics, simState.workload?.workloadName);
  }

  function reiniciarSimulacion() {
    resetSimulationState(simState);
    configEstablecida = false;
  }
</script>

<div class="container p-4">
  <h1>Simulador de Planificación de Procesos — ETAPA 2 COMPLETA</h1>
  <p class="subtitle">Motor de simulación por eventos discretos integrado</p>

  <div class="card p-3 my-3">
    <h2>📂 Cargar Tanda de Procesos</h2>
    
    <label>
      <strong>Formato de entrada:</strong>
      <select bind:value={simState.mode}>
        <option value="json">JSON (recomendado)</option>
        <option value="csv">CSV/TXT (configuración manual)</option>
      </select>
    </label>

    

    <div class="file-controls">
      <input type="file" accept={simState.mode === 'json' ? '.json,application/json' : '.csv,.txt,text/csv'} on:change={(e:any)=>{simState.file=e.target.files?.[0]||null}} />
  <button on:click={cargarArchivoUI} class="btn-primary">Cargar Archivo</button>
    </div>

    {#if simState.errors.length}
      <div class="error-box">
        <h4>❌ Errores:</h4>
        <ul>{#each simState.errors as err}<li>{err}</li>{/each}</ul>
      </div>
    {/if}
  </div>
 

  {#if simState.loaded && simState.workload}
    <!-- Tabla de procesos -->
    <div class="card p-3 my-3">
      <h2>📋 Procesos cargados</h2>
      <table class="process-table">
        <thead>
          <tr>
            <th>Proceso</th>
            <th>Tiempo Arribo</th>
            <th>Ráfagas CPU</th>
            <th>Duración CPU</th>
            <th>Duración E/S</th>
            <th>Prioridad</th>
          </tr>
        </thead>
        <tbody>
          {#each simState.workload.processes as p}
            <tr>
              <td class="process-name">{p.name}</td>
              <td>{p.tiempoArribo}</td>
              <td>{p.rafagasCPU}</td>
              <td>{p.duracionRafagaCPU}</td>
              <td>{p.duracionRafagaES}</td>
              <td>{p.prioridad}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Controles de configuración -->
    <div class="config-grid">
      <label>Política
        <select bind:value={simState.policy}>
          <option>FCFS</option>
          <option>PRIORITY</option>
          <option>RR</option>
          <option>SPN</option>
          <option>SRTN</option>
        </select>
      </label>
      <label>TIP <input type="number" bind:value={simState.tip} min="0"/></label>
      <label>TFP <input type="number" bind:value={simState.tfp} min="0"/></label>
      <label>TCP <input type="number" bind:value={simState.tcp} min="0"/></label>
      <label>Quantum <input type="number" bind:value={simState.quantum} min="1" placeholder="solo RR"/></label>
    </div>

    <!-- Botón para establecer configuración -->
    <div class="config-confirm">
      <button class="btn-primary" 
        on:click={() => configEstablecida = true}
        disabled={!simState.policy || simState.tip === null || simState.tfp === null || simState.tcp === null || (simState.policy === 'RR' && !simState.quantum)}>
        Establecer configuración
      </button>
      {#if !simState.policy || simState.tip === null || simState.tfp === null || simState.tcp === null || (simState.policy === 'RR' && !simState.quantum)}
        <span class="config-warning">Completa todos los campos antes de continuar.</span>
      {/if}
    </div>
  {/if}

  {#if simState.loaded && simState.workload && configEstablecida}
    <!-- Configuración cargada y controles de simulación -->
    <div class="card p-3 my-3">
      <h2>📋 Configuración Cargada</h2>
      <div class="config-summary">
        <p><strong>Tanda:</strong> {simState.workload.workloadName || 'Sin nombre'}</p>
        <p><strong>Política:</strong> {simState.workload.config.policy} | <strong>TIP:</strong> {simState.workload.config.tip} | <strong>TFP:</strong> {simState.workload.config.tfp} | <strong>TCP:</strong> {simState.workload.config.tcp} {#if simState.workload.config.quantum != null}| <strong>Quantum:</strong> {simState.workload.config.quantum}{/if}</p>
      </div>

      <div class="simulation-controls">
        <button 
          on:click={ejecutarSimulacionUI} 
          disabled={simState.simulacionEnCurso}
          class="btn-success"
        >
          {#if simState.simulacionEnCurso}
            🔄 Ejecutando Simulación...
          {:else}
            🚀 Ejecutar Simulación
          {/if}
    </button>
    {#if simState.simulacionCompletada}
      <button on:click={reiniciarSimulacion} class="btn-secondary">
        🔄 Nueva Simulación
      </button>
    {/if}
  </div>


  {#if simState.simulacionCompletada && simState.estadisticasExtendidas}
    <!-- Resumen de Resultados -->
    <div class="card p-3 my-3 success-card">
      <h2>✅ Simulación Completada</h2>
      <div class="summary-grid">
        <div class="metric">
          <span class="metric-label">Tiempo Total:</span>
          <span class="metric-value">{simState.tiempoTotalSimulacion.toFixed(2)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Procesos Terminados:</span>
          <span class="metric-value">{simState.metrics.porProceso.length}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Eventos Generados:</span>
          <span class="metric-value">{simState.events.length}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Eficiencia CPU:</span>
          <span class="metric-value">{simState.estadisticasExtendidas.analisis.eficienciaCPU.toFixed(1)}%</span>
        </div>
      </div>
    </div>

    <!-- Métricas de CPU -->
    <div class="card p-3 my-3">
      <h2>💻 Uso de CPU</h2>
      <div class="cpu-metrics">
        <div class="cpu-bar">
          <div class="bar-segment bar-user" style="width: {simState.metrics.tanda.porcentajeCpuProcesos || 0}%">
            Procesos ({(simState.metrics.tanda.porcentajeCpuProcesos || 0).toFixed(1)}%)
          </div>
          <div class="bar-segment bar-so" style="width: {simState.metrics.tanda.porcentajeCpuSO || 0}%">
            SO ({(simState.metrics.tanda.porcentajeCpuSO || 0).toFixed(1)}%)
          </div>
          <div class="bar-segment bar-idle" style="width: {simState.metrics.tanda.porcentajeCpuOcioso || 0}%">
            Ocioso ({(simState.metrics.tanda.porcentajeCpuOcioso || 0).toFixed(1)}%)
          </div>
        </div>
        <div class="cpu-details">
          <p><strong>Procesos:</strong> {simState.metrics.tanda.cpuProcesos.toFixed(2)} unidades</p>
          <p><strong>Sistema Operativo:</strong> {simState.metrics.tanda.cpuSO.toFixed(2)} unidades</p>
          <p><strong>Ocioso:</strong> {simState.metrics.tanda.cpuOcioso.toFixed(2)} unidades</p>
        </div>
      </div>
    </div>

    <!-- Métricas por Proceso -->
    <div class="card p-3 my-3">
      <h2>📊 Métricas por Proceso</h2>
      <table class="metrics-table">
        <thead>
          <tr>
            <th>Proceso</th>
            <th>Tiempo Retorno (TR)</th>
            <th>TR Normalizado (TRn)</th>
            <th>Tiempo en Listo</th>
          </tr>
        </thead>
        <tbody>
          {#each simState.metrics.porProceso as proc}
            <tr>
              <td class="process-name">{proc.name}</td>
              <td>{proc.tiempoRetorno.toFixed(2)}</td>
              <td>{proc.tiempoRetornoNormalizado.toFixed(2)}</td>
              <td>{proc.tiempoEnListo.toFixed(2)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      
      <div class="batch-metrics">
        <h3>Métricas de Tanda</h3>
        <p><strong>Tiempo Retorno Tanda:</strong> {simState.metrics.tanda.tiempoRetornoTanda.toFixed(2)}</p>
        <p><strong>Tiempo Medio Retorno:</strong> {simState.metrics.tanda.tiempoMedioRetorno.toFixed(2)}</p>
        <p><strong>Throughput:</strong> {simState.estadisticasExtendidas.analisis.throughput.toFixed(3)} procesos/tiempo</p>
      </div>
    </div>

    <!-- Análisis de Rendimiento -->
    <div class="card p-3 my-3">
      <h2>🎯 Análisis de Rendimiento</h2>
      <div class="performance-grid">
        <div class="performance-item">
          <span class="performance-label">Balance de Carga:</span>
          <span class="performance-value badge badge-{simState.estadisticasExtendidas.analisis.balanceCarga.toLowerCase()}">{simState.estadisticasExtendidas.analisis.balanceCarga}</span>
        </div>
        <div class="performance-item">
          <span class="performance-label">Equidad:</span>
          <span class="performance-value badge badge-{simState.estadisticasExtendidas.analisis.equidad.toLowerCase()}">{simState.estadisticasExtendidas.analisis.equidad}</span>
        </div>
        <div class="performance-item">
          <span class="performance-label">Overhead:</span>
          <span class="performance-value">{simState.estadisticasExtendidas.analisis.overhead.toFixed(1)}%</span>
        </div>
      </div>
    </div>

    <!-- Recomendaciones -->
    {#if simState.estadisticasExtendidas.recomendaciones.length > 0}
      <div class="card p-3 my-3 recommendations-card">
        <h2>💡 Recomendaciones</h2>
        <ul class="recommendations">
          {#each simState.estadisticasExtendidas.recomendaciones as rec}
            <li>{rec}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Advertencias -->
    {#if simState.advertencias.length > 0}
      <div class="card p-3 my-3 warning-card">
        <h2>⚠️ Advertencias</h2>
        <ul class="warnings">
          {#each simState.advertencias as adv}
            <li>{adv}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Descarga de Resultados -->
    <div class="card p-3 my-3">
      <h2>💾 Exportar Resultados</h2>
      <div class="export-controls">
        <button on:click={descargarEventosUI} class="btn-primary">
          📄 Descargar Eventos (CSV)
        </button>
        <button on:click={descargarMetricasUI} class="btn-primary">
          📊 Descargar Métricas (JSON)
        </button>
      </div>
      <p class="export-note">
        Los archivos incluyen todos los eventos de la simulación y métricas completas con porcentajes de uso de CPU.
      </p>
    </div>
  {/if}
</div>


