<!-- src/lib/components/MetricsTable.svelte -->
<script lang="ts">
  import type { SimulationResult } from '$lib/stores/simulacion';
  
  export let metricas: SimulationResult['metricas'] | null = null;
  
  $: porProceso = metricas?.porProceso ?? [];
  $: global = metricas?.global;
  
  function formatNumber(num: number, decimals = 2): string {
    return num.toFixed(decimals);
  }
</script>

<div class="metrics-container">
  <h3>📈 Métricas de Rendimiento</h3>
  
  {#if !metricas}
    <div class="empty-state">
      <p>No hay métricas disponibles. Ejecute una simulación primero.</p>
    </div>
  {:else}
    <!-- Métricas por Proceso -->
    <div class="metrics-section">
      <h4>Métricas por Proceso</h4>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>PID</th>
              <th>Arribo</th>
              <th>Fin</th>
              <th>Servicio CPU</th>
              <th>Tiempo Respuesta (TRp)</th>
              <th>Tiempo Espera (TE)</th>
              <th>TRp Normalizado (TRn)</th>
            </tr>
          </thead>
          <tbody>
            {#each porProceso as metrica}
              <tr>
                <td class="pid-cell">P{metrica.pid}</td>
                <td>{metrica.arribo}</td>
                <td>{metrica.fin}</td>
                <td>{metrica.servicioCPU}</td>
                <td class="highlight">{formatNumber(metrica.TRp)}</td>
                <td>{formatNumber(metrica.TE)}</td>
                <td class="trn-cell">{formatNumber(metrica.TRn)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Métricas Globales -->
    {#if global}
      <div class="metrics-section">
        <h4>Métricas Globales del Sistema</h4>
        <div class="global-metrics">
          <div class="metric-card">
            <div class="metric-value">{formatNumber(global.TRpPromedio)}</div>
            <div class="metric-label">TRp Promedio</div>
            <div class="metric-description">Tiempo de respuesta promedio</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">{formatNumber(global.TEPromedio)}</div>
            <div class="metric-label">TE Promedio</div>
            <div class="metric-description">Tiempo de espera promedio</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">{formatNumber(global.TRnPromedio)}</div>
            <div class="metric-label">TRn Promedio</div>
            <div class="metric-description">TRp normalizado promedio</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">{formatNumber(global.throughput, 4)}</div>
            <div class="metric-label">Throughput</div>
            <div class="metric-description">Procesos por unidad de tiempo</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">{global.cambiosDeContexto}</div>
            <div class="metric-label">Cambios de Contexto</div>
            <div class="metric-description">Total de cambios de proceso</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">{global.expropiaciones}</div>
            <div class="metric-label">Expropiaciones</div>
            <div class="metric-description">Desalojos por política</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-value">{global.tiempoTotalSimulacion}</div>
            <div class="metric-label">Tiempo Total</div>
            <div class="metric-description">Duración de la simulación</div>
          </div>
        </div>
      </div>
    {/if}
    
    <!-- Interpretación -->
    <div class="interpretation">
      <h4>💡 Interpretación</h4>
      <ul>
        <li><strong>TRp (Tiempo Respuesta):</strong> Tiempo desde arribo hasta finalización</li>
        <li><strong>TE (Tiempo Espera):</strong> Tiempo esperando en colas (TRp - Servicio CPU)</li>
        <li><strong>TRn Normalizado:</strong> TRp / Servicio CPU (mayor = menos eficiente)</li>
        <li><strong>Throughput:</strong> Procesos finalizados por unidad de tiempo</li>
        <li><strong>Cambios de Contexto:</strong> Incluye costos TIP, TCP, TFP</li>
        <li><strong>Expropiaciones:</strong> Solo desalojos por política (RR, SRTN, PRIORITY)</li>
      </ul>
    </div>
  {/if}
</div>

<style>
  .metrics-container {
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .metrics-container h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #333;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #666;
    background-color: white;
    border-radius: 4px;
  }

  .metrics-section {
    margin-bottom: 2rem;
  }

  .metrics-section h4 {
    margin: 0 0 1rem 0;
    color: #555;
    border-bottom: 2px solid #eee;
    padding-bottom: 0.5rem;
  }

  .table-container {
    overflow-x: auto;
    background-color: white;
    border-radius: 4px;
    border: 1px solid #eee;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 0.75rem;
    text-align: center;
    border-bottom: 1px solid #eee;
  }

  th {
    background-color: #f8f9fa;
    font-weight: bold;
    color: #495057;
    font-size: 0.875rem;
  }

  .pid-cell {
    font-weight: bold;
    background-color: #e3f2fd;
  }

  .highlight {
    background-color: #fff3e0;
    font-weight: bold;
  }

  .trn-cell {
    font-family: monospace;
  }

  .global-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }

  .metric-card {
    background-color: white;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #eee;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }

  .metric-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #2196f3;
    margin-bottom: 0.25rem;
  }

  .metric-label {
    font-weight: bold;
    color: #333;
    margin-bottom: 0.25rem;
  }

  .metric-description {
    font-size: 0.75rem;
    color: #666;
  }

  .interpretation {
    background-color: #f0f8ff;
    padding: 1rem;
    border-radius: 4px;
    border-left: 4px solid #2196f3;
  }

  .interpretation h4 {
    margin: 0 0 0.5rem 0;
    color: #1565c0;
  }

  .interpretation ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .interpretation li {
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    color: #1976d2;
  }
</style>