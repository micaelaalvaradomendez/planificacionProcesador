<script lang="ts">
  import { cargarArchivo } from '$lib/application/usecases/parseInput';
  import { runSimulationWithTimeout } from '$lib/application/usecases/simulationRunner';
  import { descargarEventos, descargarMetricas } from '$lib/application/usecases/exportResults';
  import type { SimulationState } from '$lib/application/usecases/simulationState';
  import { getInitialSimulationState, resetSimulationState } from '$lib/application/usecases/simulationState';

  let simState: SimulationState = getInitialSimulationState();

  async function cargarArchivoUI() {
    const result = await cargarArchivo(simState.file, simState.mode, simState.policy, simState.tip, simState.tfp, simState.tcp, simState.quantum);
    simState.errors = result.errors;
    simState.workload = result.workload;
    simState.loaded = result.loaded;
    simState.simulacionCompletada = false;
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

    {#if simState.mode === 'csv' || (simState.mode === 'json' && simState.loaded && simState.workload)}
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
    {/if}

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
    <div class="card p-3 my-3">
      <h2>📋 Configuración Cargada</h2>
      <div class="config-summary">
        <p><strong>Tanda:</strong> {simState.workload.workloadName || 'Sin nombre'}</p>
        <p><strong>Política:</strong> {simState.workload.config.policy} | <strong>TIP:</strong> {simState.workload.config.tip} | <strong>TFP:</strong> {simState.workload.config.tfp} | <strong>TCP:</strong> {simState.workload.config.tcp} {#if simState.workload.config.quantum != null}| <strong>Quantum:</strong> {simState.workload.config.quantum}{/if}</p>
      </div>
      
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
    </div>
  {/if}

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

<style>
  .container { 
    max-width: 1200px; 
    margin: 0 auto; 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .subtitle {
    color: #666;
    font-size: 1.1rem;
    margin-bottom: 2rem;
  }
  
  .card { 
    border: 1px solid #e1e5e9; 
    border-radius: 12px; 
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
  }
  
  .success-card {
    border-left: 4px solid #28a745;
    background: #f8fff9;
  }
  
  .warning-card {
    border-left: 4px solid #ffc107;
    background: #fffbf0;
  }
  
  .recommendations-card {
    border-left: 4px solid #17a2b8;
    background: #f0faff;
  }
  
  .error-box {
    background: #fff5f5;
    border: 1px solid #fed7d7;
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1rem;
    color: #c53030;
  }
  
  .config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }
  
  .file-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-top: 1rem;
  }
  
  .simulation-controls {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    align-items: center;
  }
  
  .process-table, .metrics-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
  }
  
  .process-table th, .process-table td,
  .metrics-table th, .metrics-table td {
    border: 1px solid #e1e5e9;
    padding: 0.75rem;
    text-align: center;
  }
  
  .process-table th, .metrics-table th {
    background: #f8f9fa;
    font-weight: 600;
    color: #495057;
  }
  
  .process-name {
    font-weight: 600;
    color: #007bff;
  }
  
  .config-summary {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }
  
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .metric {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
  }
  
  .metric-label {
    display: block;
    font-size: 0.9rem;
    color: #6c757d;
    margin-bottom: 0.5rem;
  }
  
  .metric-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: #007bff;
  }
  
  .cpu-metrics {
    margin-top: 1rem;
  }
  
  .cpu-bar {
    display: flex;
    height: 40px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e1e5e9;
    margin-bottom: 1rem;
  }
  
  .bar-segment {
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  }
  
  .bar-user { background: #28a745; }
  .bar-so { background: #ffc107; color: #212529; text-shadow: none; }
  .bar-idle { background: #6c757d; }
  
  .cpu-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .cpu-details p {
    margin: 0;
    padding: 0.5rem;
    background: #f8f9fa;
    border-radius: 4px;
  }
  
  .batch-metrics {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e1e5e9;
  }
  
  .batch-metrics h3 {
    margin-bottom: 1rem;
    color: #495057;
  }
  
  .performance-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .performance-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
  }
  
  .performance-label {
    font-weight: 600;
    color: #495057;
  }
  
  .performance-value {
    font-weight: 600;
  }
  
  .badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .badge-excelente { background: #28a745; color: white; }
  .badge-bueno { background: #007bff; color: white; }
  .badge-regular { background: #ffc107; color: #212529; }
  .badge-deficiente { background: #dc3545; color: white; }
  .badge-alta { background: #28a745; color: white; }
  .badge-media { background: #ffc107; color: #212529; }
  .badge-baja { background: #dc3545; color: white; }
  
  .recommendations, .warnings {
    list-style: none;
    padding: 0;
    margin: 1rem 0;
  }
  
  .recommendations li, .warnings li {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    background: rgba(255,255,255,0.7);
    border-radius: 8px;
    border-left: 3px solid #17a2b8;
  }
  
  .warnings li {
    border-left-color: #ffc107;
  }
  
  .export-controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .export-note {
    font-size: 0.9rem;
    color: #6c757d;
    margin: 0;
  }
  
  /* Botones */
  button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.95rem;
  }
  
  .btn-primary {
    background: #007bff;
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: #0056b3;
    transform: translateY(-1px);
  }
  
  .btn-success {
    background: #28a745;
    color: white;
  }
  
  .btn-success:hover:not(:disabled) {
    background: #1e7e34;
    transform: translateY(-1px);
  }
  
  .btn-secondary {
    background: #6c757d;
    color: white;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background: #545b62;
    transform: translateY(-1px);
  }
  
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  /* Inputs */
  input, select {
    padding: 0.5rem;
    border: 1px solid #e1e5e9;
    border-radius: 4px;
    font-size: 0.95rem;
  }
  
  input:focus, select:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #495057;
  }
  
  h1 {
    color: #212529;
    margin-bottom: 0.5rem;
  }
  
  h2 {
    color: #495057;
    margin-bottom: 1rem;
    font-size: 1.25rem;
  }
  
  h3 {
    color: #495057;
    font-size: 1.1rem;
  }
  
  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }
    
    .config-grid {
      grid-template-columns: 1fr;
    }
    
    .summary-grid {
      grid-template-columns: 1fr;
    }
    
    .performance-grid {
      grid-template-columns: 1fr;
    }
    
    .cpu-details {
      grid-template-columns: 1fr;
    }
    
    .export-controls {
      flex-direction: column;
    }
    
    .simulation-controls {
      flex-direction: column;
      align-items: stretch;
    }
    
    .file-controls {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>

