<script lang="ts">
  export let simState: any;
  export let onDescargarEventos: () => void;
  export let onDescargarMetricas: () => void;
</script>

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

  <!-- Botones de exportación -->
  <div class="section">
    <div class="btn-row">
      <button class="btn-primary" on:click={onDescargarEventos}>📄 Descargar Eventos (CSV)</button>
      <button class="btn-primary" on:click={onDescargarMetricas}>📊 Descargar Métricas (JSON)</button>
    </div>
  </div>
{/if}

<style>
  .section { margin-bottom: 1.5rem; }
  .card { border: 1px solid var(--border-color, #ddd); border-radius: 12px; padding: 1rem; background: var(--bg-card, #111); }
  .btn-row { display: flex; gap: .5rem; flex-wrap: wrap; }
  .btn-primary { padding: .6rem 1rem; border-radius: .75rem; border: 1px solid #444; cursor: pointer; }
  .success-card { border-left: 4px solid #28a745; background: #f8fff9; }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem; }
  .metric { background: #f8f9fa; padding: 1rem; border-radius: 8px; text-align: center; }
  .metric-label { display: block; }
  .cpu-bar { display: flex; height: 30px; border-radius: 4px; overflow: hidden; margin-bottom: 1rem; }
  .bar-segment { display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: white; }
  .bar-user { background-color: #28a745; }
  .bar-so { background-color: #ffc107; }
  .bar-idle { background-color: #6c757d; }
  .metrics-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  .metrics-table th, .metrics-table td { border: 1px solid #e1e5e9; padding: 0.75rem; text-align: center; }
  .metrics-table th { background: #f8f9fa; font-weight: 600; color: #495057; }
  .process-name { font-weight: 600; color: #007bff; }
  .batch-metrics { margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; }
</style>
