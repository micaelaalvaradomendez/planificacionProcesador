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
  <h3>Métricas de Rendimiento</h3>
  
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
              <th>Tiempo E/S</th>
              <th>Tiempo Espera</th>
              <th>Overheads</th>
              <th>TRp (Retorno)</th>
              <th>TE (Espera)</th>
              <th>TRn (Normalizada)</th>
            </tr>
          </thead>
          <tbody>
            {#each porProceso as metrica}
              <tr>
                <td class="pid-cell">P{metrica.pid}</td>
                <td>{metrica.arribo}</td>
                <td>{metrica.fin}</td>
                <td>{metrica.servicioCPU}</td>
                <td>{metrica.tiempoES || 0}</td>
                <td>{metrica.tiempoEspera || 0}</td>
                <td>{formatNumber(metrica.overheads || 0)}</td>
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
            <div class="metric-description">Tiempo de retorno promedio</div>
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

          <div class="metric-card cpu-idle">
            <div class="metric-value">{formatNumber(global.cpuOciosa || 0)}</div>
            <div class="metric-label">CPU Ociosa</div>
            <div class="metric-description">{formatNumber(global.cpuOciosaPorc || 0)}% del tiempo total</div>
          </div>

          <div class="metric-card cpu-util">
            <div class="metric-value">{formatNumber(global.utilizacionCPU || 0)}%</div>
            <div class="metric-label">Utilización CPU</div>
            <div class="metric-description">Incluye CPU + overheads</div>
          </div>

          <div class="metric-card cpu-busy">
            <div class="metric-value">{formatNumber(global.utilizacionCPUBusy || 0)}%</div>
            <div class="metric-label">CPU Solo Trabajo</div>
            <div class="metric-description">Sin contar overheads</div>
          </div>
        </div>
      </div>
    {/if}
    
    <!-- Interpretación -->
    <div class="interpretation">
      <h4>📋 Interpretación de Métricas</h4>
      <div class="interpretation-grid">
        <div class="interpretation-section">
          <h5>Por Proceso</h5>
          <ul>
            <li><strong>Servicio CPU:</strong> Tiempo real de ejecución (solo ráfagas)</li>
            <li><strong>Tiempo E/S:</strong> Tiempo bloqueado en entrada/salida</li>
            <li><strong>Tiempo Espera:</strong> Tiempo en estado Listo esperando CPU</li>
            <li><strong>Overheads:</strong> Suma de TIP + TCP + TFP del proceso</li>
          </ul>
        </div>
        <div class="interpretation-section">
          <h5>Métricas Clásicas</h5>
          <ul>
            <li><strong>TRp (Tiempo de Retorno):</strong> Fin - Arribo (incluye todo)</li>
            <li><strong>TE (Tiempo de Espera):</strong> Solo tiempo en estado Listo</li>
            <li><strong>TRn (Normalizada):</strong> TRp / Servicio (eficiencia)</li>
            <li><strong>Throughput:</strong> Procesos / tiempo total</li>
          </ul>
        </div>
        <div class="interpretation-section">
          <h5>Sistema</h5>
          <ul>
            <li><strong>CPU Ociosa:</strong> Tiempo sin procesos ejecutando</li>
            <li><strong>Utilización:</strong> % CPU ocupada (trabajo + overhead)</li>
            <li><strong>CPU Solo Trabajo:</strong> % solo ráfagas (sin TIP/TCP/TFP)</li>
            <li><strong>Expropiaciones:</strong> Solo por política (quantum/preempt)</li>
          </ul>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .metrics-container {
    padding: 1.5rem;
    border: 2px solid #dde5b6;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    background: linear-gradient(135deg, white 0%, #f8f9fa 100%);
    box-shadow: 0 4px 16px rgba(63, 44, 80, 0.1);
  }

  .metrics-container h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    color: #3f2c50;
    font-weight: bold;
    font-size: 1.25rem;
    text-align: center;
    padding-bottom: 0.75rem;
    border-bottom: 3px solid #dde5b6;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #633f6e;
    background: linear-gradient(135deg, white 0%, #f8f9fa 100%);
    border-radius: 12px;
    border: 2px solid #dde5b6;
    font-weight: 500;
  }

  .metrics-section {
    margin-bottom: 2.5rem;
  }

  .metrics-section h4 {
    margin: 0 0 1.5rem 0;
    color: #3f2c50;
    border-bottom: 3px solid #dde5b6;
    padding-bottom: 0.75rem;
    font-weight: bold;
    font-size: 1.1rem;
  }

  .table-container {
    overflow-x: auto;
    background-color: white;
    border-radius: 12px;
    border: 2px solid #e9ecef;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 1rem 0.75rem;
    text-align: center;
    border-bottom: 1px solid #e9ecef;
  }

  th {
    background: #633f6e;
    font-weight: bold;
    color: #dde5b6;
    font-size: 0.9rem;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  }

  tbody tr:hover {
    background: linear-gradient(135deg, rgba(221, 229, 182, 0.1) 0%, rgba(200, 212, 154, 0.1) 100%);
  }

  .pid-cell {
    font-weight: bold;
    background: linear-gradient(135deg, rgba(221, 229, 182, 0.3) 0%, rgba(200, 212, 154, 0.3) 100%);
    color: #3f2c50;
  }

  .highlight {
    background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
    font-weight: bold;
    color: #3f2c50;
  }

  .trn-cell {
    font-family: 'Monaco', 'Menlo', monospace;
    font-weight: 500;
  }

  .global-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .metric-card {
    background: linear-gradient(135deg, white 0%, #f8f9fa 100%);
    padding: 1.5rem;
    border-radius: 12px;
    border: 2px solid #dde5b6;
    box-shadow: 0 4px 16px rgba(63, 44, 80, 0.1);
    text-align: center;
    transition: all 0.3s ease;
  }

  .metric-card:hover {
    border-color: #c8d49a;
    box-shadow: 0 6px 24px rgba(63, 44, 80, 0.15);
    transform: translateY(-2px);
  }

  .metric-value {
    font-size: 1.75rem;
    font-weight: bold;
    color: #3f2c50;
    margin-bottom: 0.5rem;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
  }

  .metric-label {
    font-weight: bold;
    color: #633f6e;
    margin-bottom: 0.5rem;
    font-size: 0.95rem;
  }

  .metric-description {
    font-size: 0.8rem;
    color: #6c757d;
    font-style: italic;
  }

  .interpretation {
    background: linear-gradient(135deg, rgba(221, 229, 182, 0.1) 0%, rgba(200, 212, 154, 0.1) 100%);
    padding: 1.5rem;
    border-radius: 12px;
    border: 2px solid rgba(221, 229, 182, 0.3);
    margin-top: 1.5rem;
  }

  .interpretation h4 {
    margin: 0 0 1rem 0;
    color: #3f2c50;
    font-weight: bold;
  }

  .interpretation ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .interpretation li {
    margin-bottom: 0.5rem;
    color: #633f6e;
    font-weight: 500;
  }

  .interpretation li {
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    color: #1976d2;
  }

  /* Estilos para las nuevas métricas de CPU */
  .cpu-idle {
    border-color: #9e9e9e;
    background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);
  }

  .cpu-util {
    border-color: #4caf50;
    background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
  }

  .cpu-busy {
    border-color: #2196f3;
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  }

  .interpretation-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .interpretation-section h5 {
    margin: 0 0 0.75rem 0;
    color: #3f2c50;
    font-weight: bold;
    border-bottom: 2px solid #dde5b6;
    padding-bottom: 0.5rem;
  }

  .interpretation-section ul {
    margin: 0;
    padding-left: 1.25rem;
  }
</style>