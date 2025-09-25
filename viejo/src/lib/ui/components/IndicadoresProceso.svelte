<script lang="ts">
  import type { MetricsPerProcess } from '$lib/domain/types';
  
  export let metricasProcesos: MetricsPerProcess[] = [];
  
  // Función para formatear tiempos
  function formatearTiempo(tiempo: number): string {
    return tiempo.toFixed(2);
  }
  
  // Función para formatear números normalizados
  function formatearNormalizado(valor: number): string {
    return valor.toFixed(3);
  }
  
  // Función para determinar el color del TR normalizado
  function colorTRn(trn: number): string {
    if (trn <= 2) return 'excelente';
    if (trn <= 5) return 'bueno';
    if (trn <= 10) return 'regular';
    return 'malo';
  }
</script>

<div class="indicadores-proceso">
  <h3 class="titulo">Indicadores por Proceso</h3>
  
  {#if metricasProcesos.length === 0}
    <div class="estado-vacio">
      <p>No hay métricas de procesos disponibles</p>
      <small>Ejecuta una simulación para ver los indicadores</small>
    </div>
  {:else}
    <div class="tabla-container">
      <table class="tabla-metricas">
        <thead>
          <tr>
            <th class="col-proceso">Proceso</th>
            <th class="col-tiempo">
              <div class="header-info">
                <span>Tiempo de Retorno</span>
                <small>(TRp)</small>
              </div>
            </th>
            <th class="col-tiempo">
              <div class="header-info">
                <span>TR Normalizado</span>
                <small>(TRn)</small>
              </div>
            </th>
            <th class="col-tiempo">
              <div class="header-info">
                <span>Tiempo en Listo</span>
                <small>(Espera)</small>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each metricasProcesos as metrica, index}
            <tr class="fila-proceso" class:par={index % 2 === 0}>
              <td class="celda-proceso">
                <div class="proceso-info">
                  <span class="proceso-badge">{metrica.name}</span>
                </div>
              </td>
              <td class="celda-tiempo">
                <div class="tiempo-valor">
                  <span class="valor-principal">{formatearTiempo(metrica.tiempoRetorno)}</span>
                </div>
              </td>
              <td class="celda-tiempo">
                <div class="trn-container">
                  <span class="valor-trn {colorTRn(metrica.tiempoRetornoNormalizado)}">
                    {formatearNormalizado(metrica.tiempoRetornoNormalizado)}
                  </span>
                  <div class="trn-bar">
                    <div 
                      class="trn-fill {colorTRn(metrica.tiempoRetornoNormalizado)}"
                      style="width: {Math.min(metrica.tiempoRetornoNormalizado * 10, 100)}%"
                    ></div>
                  </div>
                </div>
              </td>
              <td class="celda-tiempo">
                <div class="tiempo-valor">
                  <span class="valor-principal">{formatearTiempo(metrica.tiempoEnListo)}</span>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      
      <!-- Resumen estadístico -->
      <div class="resumen-estadistico">
        <div class="estadistica">
          <span class="stat-label">Procesos analizados:</span>
          <span class="stat-valor">{metricasProcesos.length}</span>
        </div>
        <div class="estadistica">
          <span class="stat-label">TR promedio:</span>
          <span class="stat-valor">
            {formatearTiempo(metricasProcesos.reduce((sum, m) => sum + m.tiempoRetorno, 0) / metricasProcesos.length)} ut
          </span>
        </div>
        <div class="estadistica">
          <span class="stat-label">TRn promedio:</span>
          <span class="stat-valor">
            {formatearNormalizado(metricasProcesos.reduce((sum, m) => sum + m.tiempoRetornoNormalizado, 0) / metricasProcesos.length)}
          </span>
        </div>
        <div class="estadistica">
          <span class="stat-label">Espera promedio:</span>
          <span class="stat-valor">
            {formatearTiempo(metricasProcesos.reduce((sum, m) => sum + m.tiempoEnListo, 0) / metricasProcesos.length)} ut
          </span>
        </div>
      </div>
    </div>
    
    <!-- Leyenda -->
    <div class="leyenda">
      <div class="leyenda-items">
        <div class="leyenda-item">
          <strong>TRp (Tiempo de Retorno):</strong> Tiempo desde que arriba hasta que termina completamente
        </div>
        <div class="leyenda-item">
          <strong>TRn (TR Normalizado):</strong> TRp ÷ tiempo efectivo de CPU utilizado
          <div class="trn-escala">
            <span class="trn-ref excelente">≤ 2.0 Excelente</span>
            <span class="trn-ref bueno">≤ 5.0 Bueno</span>
            <span class="trn-ref regular">≤ 10.0 Regular</span>
            <span class="trn-ref malo">> 10.0 Deficiente</span>
          </div>
        </div>
        <div class="leyenda-item">
          <strong>Tiempo en Listo:</strong> Tiempo total esperando en la cola de listos
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .indicadores-proceso {
    background: var(--blanco-puro);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border: 1px solid var(--celeste-suave);
  }

  .titulo {
    margin: 0 0 24px 0;
    color: var(--gris-casi-negro);
    font-size: 1.4rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-align: center;
  }

  /* Estado vacío */
  .estado-vacio {
    text-align: center;
    padding: 48px 24px;
    color: var(--gris-medio);
  }

  .estado-vacio p {
    margin: 0 0 8px 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .estado-vacio small {
    font-size: 0.9rem;
    opacity: 0.8;
  }

  /* Tabla */
  .tabla-container {
    overflow-x: auto;
    border-radius: 12px;
    border: 1px solid var(--celeste-suave);
  }

  .tabla-metricas {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
  }

  .tabla-metricas thead {
    background: linear-gradient(135deg, var(--turquesa-intenso) 0%, var(--cian-profundo) 100%);
    color: var(--blanco-puro);
  }

  .tabla-metricas th {
    padding: 16px 12px;
    text-align: center;
    font-weight: 600;
    border-bottom: 2px solid var(--turquesa-intenso);
  }

  .header-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: center;
    text-align: center;
  }

  .header-info span {
    font-weight: 700;
  }

  .header-info small {
    font-size: 0.8rem;
    opacity: 0.9;
    font-weight: 400;
  }

  .fila-proceso {
    transition: background-color 0.2s ease;
  }

  .fila-proceso:hover {
    background: var(--marfil-claro);
  }

  .fila-proceso.par {
    background: var(--blanco-tiza);
  }

  .fila-proceso.par:hover {
    background: var(--marfil-claro);
  }

  .tabla-metricas td {
    padding: 16px 12px;
    border-bottom: 1px solid var(--celeste-suave);
    vertical-align: middle;
  }

  /* Columnas */
  .col-proceso {
    width: 10%;
    min-width: 100px;
    text-align: center;
  }

  .col-tiempo {
    width: 26.67%;
    min-width: 140px;
    text-align: center;
  }

  /* Celda proceso */
  .celda-proceso {
    font-weight: 600;
    text-align: center;
  }

  .proceso-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
  }

  .proceso-badge {
    background: var(--turquesa-intenso);
    color: var(--blanco-puro);
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
    display: inline-block;
    max-width: fit-content;
    text-align: center;
  }

  .proceso-indice {
    font-size: 0.8rem;
    color: var(--gris-medio);
    font-weight: 400;
    text-align: center;
  }

  /* Celda tiempo */
  .celda-tiempo {
    text-align: center;
  }

  .tiempo-valor {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 4px;
  }

  .valor-principal {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--gris-casi-negro);
  }

  .unidad {
    font-size: 0.8rem;
    color: var(--gris-medio);
    font-weight: 400;
  }

  /* TRn específico */
  .trn-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .valor-trn {
    font-size: 1.1rem;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 6px;
    color: var(--blanco-puro);
  }

  .valor-trn.excelente {
    background: var(--verde-esmeralda);
  }

  .valor-trn.bueno {
    background: var(--turquesa-intenso);
  }

  .valor-trn.regular {
    background: var(--amarillo-vibrante);
    color: var(--gris-casi-negro);
  }

  .valor-trn.malo {
    background: var(--coral-vibrante);
  }

  .trn-bar {
    width: 60px;
    height: 4px;
    background: var(--celeste-suave);
    border-radius: 2px;
    overflow: hidden;
  }

  .trn-fill {
    height: 100%;
    transition: width 0.8s ease;
    border-radius: 2px;
  }

  .trn-fill.excelente {
    background: var(--verde-esmeralda);
  }

  .trn-fill.bueno {
    background: var(--turquesa-intenso);
  }

  .trn-fill.regular {
    background: var(--amarillo-vibrante);
  }

  .trn-fill.malo {
    background: var(--coral-vibrante);
  }

  /* Resumen estadístico */
  .resumen-estadistico {
    background: var(--blanco-tiza);
    padding: 16px;
    margin-top: 16px;
    border-radius: 8px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .estadistica {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--blanco-puro);
    border-radius: 6px;
    border: 1px solid var(--turquesa-intenso);
  }

  .stat-label {
    font-weight: 600;
    color: var(--gris-casi-negro);
    font-size: 0.9rem;
  }

  .stat-valor {
    font-weight: 700;
    color: var(--turquesa-intenso);
    font-size: 0.95rem;
  }

  /* Leyenda */
  .leyenda {
    margin-top: 24px;
    padding: 20px;
    background: var(--marfil-claro);
    border-radius: 12px;
    border: 1px solid var(--celeste-suave);
    text-align: center;
  }

  .leyenda-titulo {
    margin: 0 0 16px 0;
    color: var(--gris-casi-negro);
    font-size: 1.1rem;
    font-weight: 600;
  }

  .leyenda-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: left;
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
  }

  .leyenda-item {
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .leyenda-item strong {
    color: var(--gris-casi-negro);
  }

  .trn-escala {
    display: flex;
    gap: 12px;
    margin-top: 6px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .trn-ref {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--blanco-puro);
  }

  .trn-ref.excelente {
    background: var(--verde-esmeralda);
  }

  .trn-ref.bueno {
    background: var(--turquesa-intenso);
  }

  .trn-ref.regular {
    background: var(--amarillo-vibrante);
    color: var(--gris-casi-negro);
  }

  .trn-ref.malo {
    background: var(--coral-vibrante);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .indicadores-proceso {
      padding: 16px;
    }

    .titulo {
      font-size: 1.2rem;
    }

    .tabla-metricas th,
    .tabla-metricas td {
      padding: 12px 8px;
    }

    .header-info {
      gap: 1px;
    }

    .header-info span {
      font-size: 0.85rem;
    }

    .header-info small {
      font-size: 0.7rem;
    }

    .resumen-estadistico {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .trn-escala {
      gap: 8px;
    }

    .trn-ref {
      font-size: 0.75rem;
      padding: 1px 6px;
    }
  }
</style>
