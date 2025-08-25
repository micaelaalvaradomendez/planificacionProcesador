<script lang="ts">
  import { analizarTandaJson, analizarTandaCsv } from '$lib/io/parseWorkload';
  import { exportarEventosCsv } from '$lib/io/exportEvents';
  import { exportarMetricasJson, conPorcentajes } from '$lib/io/exportMetrics';
  import { ejecutarSimulacionCompleta } from '$lib/application/usecases/runSimulation';
  import { construirDiagramaGantt } from '$lib/application/usecases/buildGantt';
  import { calcularEstadisticasExtendidas } from '$lib/application/usecases/computeStatistics';
  import type { Workload, SimEvent, Metrics, Policy, GanttSlice } from '$lib/model/types';
  import type { EstadisticasExtendidas } from '$lib/application/usecases/computeStatistics';

  let file: File | null = null;
  let mode: 'json' | 'csv' = 'json';

  // Config sólo necesario si usás CSV:
  let policy: Policy = 'FCFS';
  let tip = 0, tfp = 0, tcp = 0, quantum: number | undefined = undefined;

  let workload: Workload | null = null;
  let errors: string[] = [];
  let loaded = false;

  // Estado de simulación
  let simulacionEnCurso = false;
  let simulacionCompletada = false;
  let events: SimEvent[] = [];
  let metrics: Metrics = {
    porProceso: [],
    tanda: { tiempoRetornoTanda: 0, tiempoMedioRetorno: 0, cpuOcioso: 0, cpuSO: 0, cpuProcesos: 0 }
  };
  let ganttSlices: GanttSlice[] = [];
  let estadisticasExtendidas: EstadisticasExtendidas | null = null;
  let tiempoTotalSimulacion = 0;
  let advertencias: string[] = [];

  async function cargarArchivo() {
    console.log('🔄 Iniciando carga de archivo...');
    errors = [];
    workload = null;
    loaded = false;
    simulacionCompletada = false;
    
    if (!file) { 
      const error = 'Seleccioná un archivo';
      console.error('❌', error);
      errors.push(error); 
      return; 
    }

    console.log('📂 Archivo seleccionado:', file.name, 'Modo:', mode);

    try {
      if (mode === 'json') {
        console.log('📋 Analizando archivo JSON...');
        workload = await analizarTandaJson(file);
      } else {
        console.log('📋 Analizando archivo CSV...');
        workload = await analizarTandaCsv(file, { policy, tip, tfp, tcp, quantum });
      }
      loaded = true;
      console.log('✅ Archivo cargado exitosamente:', workload.workloadName);
      console.log('📊 Procesos cargados:', workload.processes.length);
    } catch (e) {
      const errorMsg = (e as Error).message;
      console.error('❌ Error al cargar archivo:', errorMsg);
      errors.push(errorMsg);
    }
  }

  async function ejecutarSimulacion() {
    if (!workload) {
      errors.push('Primero debés cargar una tanda de procesos');
      return;
    }

    console.log('🚀 Preparando simulación...');
    errors = [];
    simulacionEnCurso = true;
    simulacionCompletada = false;

    // Timeout para evitar que el navegador se cuelgue
    const timeoutMs = 30000; // 30 segundos máximo
    let timeoutId: number;

    try {
      console.log('🚀 Iniciando simulación con:', workload.workloadName);
      console.log('🔧 Configuración:', workload.config);
      console.log('📋 Procesos a simular:', workload.processes.map(p => p.name));
      
      // Crear una promesa con timeout
      const simulacionPromise = ejecutarSimulacionCompleta(workload);
      
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('La simulación tardó demasiado tiempo (más de 30 segundos). Puede haber un bucle infinito.'));
        }, timeoutMs);
      });
      
      // Ejecutar la simulación con timeout
      const resultado = await Promise.race([simulacionPromise, timeoutPromise]);
      clearTimeout(timeoutId);
      
      if (!resultado.exitoso) {
        const errorMsg = resultado.error || 'Error desconocido en la simulación';
        console.error('❌ Simulación falló:', errorMsg);
        errors.push(errorMsg);
        return;
      }

      // Guardar resultados
      events = resultado.eventos;
      metrics = resultado.metricas;
      tiempoTotalSimulacion = resultado.tiempoTotal;
      advertencias = resultado.advertencias || [];

      console.log('📊 Eventos generados:', events.length);
      console.log('⏱️ Tiempo total de simulación:', tiempoTotalSimulacion);

      // Construir diagrama de Gantt
      console.log('📈 Construyendo diagrama de Gantt...');
      const diagramaGantt = construirDiagramaGantt(events);
      ganttSlices = diagramaGantt.segmentos;

      // Calcular estadísticas extendidas
      console.log('📊 Calculando estadísticas extendidas...');
      estadisticasExtendidas = calcularEstadisticasExtendidas(
        metrics, 
        events, 
        tiempoTotalSimulacion
      );

      simulacionCompletada = true;
      console.log('✅ Simulación completada exitosamente');

    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      const errorMsg = `Error durante la simulación: ${error instanceof Error ? error.message : error}`;
      console.error('❌ Error en simulación:', error);
      errors.push(errorMsg);
    } finally {
      simulacionEnCurso = false;
    }
  }

  function descargarEventos() {
    const blob = exportarEventosCsv(events);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `eventos_${workload?.workloadName || 'simulacion'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function descargarMetricas() {
    const blob = exportarMetricasJson(conPorcentajes(metrics));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `metricas_${workload?.workloadName || 'simulacion'}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function reiniciarSimulacion() {
    simulacionCompletada = false;
    events = [];
    metrics = {
      porProceso: [],
      tanda: { tiempoRetornoTanda: 0, tiempoMedioRetorno: 0, cpuOcioso: 0, cpuSO: 0, cpuProcesos: 0 }
    };
    ganttSlices = [];
    estadisticasExtendidas = null;
    tiempoTotalSimulacion = 0;
    advertencias = [];
    errors = [];
  }
</script>

<div class="container p-4">
  <h1>Simulador de Planificación de Procesos — ETAPA 2 COMPLETA</h1>
  <p class="subtitle">Motor de simulación por eventos discretos integrado</p>

  <div class="card p-3 my-3">
    <h2>📂 Cargar Tanda de Procesos</h2>
    
    <label>
      <strong>Formato de entrada:</strong>
      <select bind:value={mode}>
        <option value="json">JSON (recomendado)</option>
        <option value="csv">CSV/TXT (configuración manual)</option>
      </select>
    </label>

    {#if mode === 'csv'}
      <div class="config-grid">
        <label>Política
          <select bind:value={policy}>
            <option>FCFS</option><option>PRIORITY</option><option>RR</option><option>SPN</option><option>SRTN</option>
          </select>
        </label>
        <label>TIP <input type="number" bind:value={tip} min="0"/></label>
        <label>TFP <input type="number" bind:value={tfp} min="0"/></label>
        <label>TCP <input type="number" bind:value={tcp} min="0"/></label>
        <label>Quantum <input type="number" bind:value={quantum} min="1" placeholder="solo RR"/></label>
      </div>
    {/if}

    <div class="file-controls">
      <input type="file" accept={mode === 'json' ? '.json,application/json' : '.csv,.txt,text/csv'} on:change={(e:any)=>{file=e.target.files?.[0]||null}} />
      <button on:click={cargarArchivo} class="btn-primary">Cargar Archivo</button>
    </div>

    {#if errors.length}
      <div class="error-box">
        <h4>❌ Errores:</h4>
        <ul>{#each errors as err}<li>{err}</li>{/each}</ul>
      </div>
    {/if}
  </div>

  {#if loaded && workload}
    <div class="card p-3 my-3">
      <h2>📋 Configuración Cargada</h2>
      <div class="config-summary">
        <p><strong>Tanda:</strong> {workload.workloadName || 'Sin nombre'}</p>
        <p><strong>Política:</strong> {workload.config.policy} | <strong>TIP:</strong> {workload.config.tip} | <strong>TFP:</strong> {workload.config.tfp} | <strong>TCP:</strong> {workload.config.tcp} {#if workload.config.quantum != null}| <strong>Quantum:</strong> {workload.config.quantum}{/if}</p>
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
          {#each workload.processes as p}
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
          on:click={ejecutarSimulacion} 
          disabled={simulacionEnCurso}
          class="btn-success"
        >
          {#if simulacionEnCurso}
            🔄 Ejecutando Simulación...
          {:else}
            🚀 Ejecutar Simulación
          {/if}
        </button>
        
        {#if simulacionCompletada}
          <button on:click={reiniciarSimulacion} class="btn-secondary">
            🔄 Nueva Simulación
          </button>
        {/if}
      </div>
    </div>
  {/if}

  {#if simulacionCompletada && estadisticasExtendidas}
    <!-- Resumen de Resultados -->
    <div class="card p-3 my-3 success-card">
      <h2>✅ Simulación Completada</h2>
      <div class="summary-grid">
        <div class="metric">
          <span class="metric-label">Tiempo Total:</span>
          <span class="metric-value">{tiempoTotalSimulacion.toFixed(2)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Procesos Terminados:</span>
          <span class="metric-value">{metrics.porProceso.length}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Eventos Generados:</span>
          <span class="metric-value">{events.length}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Eficiencia CPU:</span>
          <span class="metric-value">{estadisticasExtendidas.analisis.eficienciaCPU.toFixed(1)}%</span>
        </div>
      </div>
    </div>

    <!-- Métricas de CPU -->
    <div class="card p-3 my-3">
      <h2>💻 Uso de CPU</h2>
      <div class="cpu-metrics">
        <div class="cpu-bar">
          <div class="bar-segment bar-user" style="width: {metrics.tanda.porcentajeCpuProcesos || 0}%">
            Procesos ({(metrics.tanda.porcentajeCpuProcesos || 0).toFixed(1)}%)
          </div>
          <div class="bar-segment bar-so" style="width: {metrics.tanda.porcentajeCpuSO || 0}%">
            SO ({(metrics.tanda.porcentajeCpuSO || 0).toFixed(1)}%)
          </div>
          <div class="bar-segment bar-idle" style="width: {metrics.tanda.porcentajeCpuOcioso || 0}%">
            Ocioso ({(metrics.tanda.porcentajeCpuOcioso || 0).toFixed(1)}%)
          </div>
        </div>
        <div class="cpu-details">
          <p><strong>Procesos:</strong> {metrics.tanda.cpuProcesos.toFixed(2)} unidades</p>
          <p><strong>Sistema Operativo:</strong> {metrics.tanda.cpuSO.toFixed(2)} unidades</p>
          <p><strong>Ocioso:</strong> {metrics.tanda.cpuOcioso.toFixed(2)} unidades</p>
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
          {#each metrics.porProceso as proc}
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
        <p><strong>Tiempo Retorno Tanda:</strong> {metrics.tanda.tiempoRetornoTanda.toFixed(2)}</p>
        <p><strong>Tiempo Medio Retorno:</strong> {metrics.tanda.tiempoMedioRetorno.toFixed(2)}</p>
        <p><strong>Throughput:</strong> {estadisticasExtendidas.analisis.throughput.toFixed(3)} procesos/tiempo</p>
      </div>
    </div>

    <!-- Análisis de Rendimiento -->
    <div class="card p-3 my-3">
      <h2>🎯 Análisis de Rendimiento</h2>
      <div class="performance-grid">
        <div class="performance-item">
          <span class="performance-label">Balance de Carga:</span>
          <span class="performance-value badge badge-{estadisticasExtendidas.analisis.balanceCarga.toLowerCase()}">{estadisticasExtendidas.analisis.balanceCarga}</span>
        </div>
        <div class="performance-item">
          <span class="performance-label">Equidad:</span>
          <span class="performance-value badge badge-{estadisticasExtendidas.analisis.equidad.toLowerCase()}">{estadisticasExtendidas.analisis.equidad}</span>
        </div>
        <div class="performance-item">
          <span class="performance-label">Overhead:</span>
          <span class="performance-value">{estadisticasExtendidas.analisis.overhead.toFixed(1)}%</span>
        </div>
      </div>
    </div>

    <!-- Recomendaciones -->
    {#if estadisticasExtendidas.recomendaciones.length > 0}
      <div class="card p-3 my-3 recommendations-card">
        <h2>💡 Recomendaciones</h2>
        <ul class="recommendations">
          {#each estadisticasExtendidas.recomendaciones as rec}
            <li>{rec}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Advertencias -->
    {#if advertencias.length > 0}
      <div class="card p-3 my-3 warning-card">
        <h2>⚠️ Advertencias</h2>
        <ul class="warnings">
          {#each advertencias as adv}
            <li>{adv}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Descarga de Resultados -->
    <div class="card p-3 my-3">
      <h2>💾 Exportar Resultados</h2>
      <div class="export-controls">
        <button on:click={descargarEventos} class="btn-primary">
          📄 Descargar Eventos (CSV)
        </button>
        <button on:click={descargarMetricas} class="btn-primary">
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

