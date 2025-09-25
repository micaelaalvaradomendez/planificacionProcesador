<script lang="ts">
  import type { BatchMetrics } from '$lib/domain/types';
  
  export let metricasTanda: BatchMetrics;
  
  // Calcular el tiempo total
  $: tiempoTotal = metricasTanda.cpuOcioso + metricasTanda.cpuSO + metricasTanda.cpuProcesos;
  
  // Calcular porcentajes
  $: porcentajeOcioso = tiempoTotal > 0 ? (metricasTanda.cpuOcioso / tiempoTotal) * 100 : 0;
  $: porcentajeSO = tiempoTotal > 0 ? (metricasTanda.cpuSO / tiempoTotal) * 100 : 0;
  $: porcentajeProcesos = tiempoTotal > 0 ? (metricasTanda.cpuProcesos / tiempoTotal) * 100 : 0;
  
  // Para el desglose del SO, los valores reales dependen de:
  // - TIP: numProcesos * tip_config
  // - TFP: numProcesos * tfp_config  
  // - TCP: numDespachos * tcp_config + TCP_adicionales_por_ES
  // Como no tenemos estos valores desagregados en BatchMetrics, mostramos proporciones ilustrativas
  $: tiempoTCP = metricasTanda.cpuSO * 0.6; // Mayor parte: context switches
  $: tiempoTIP = metricasTanda.cpuSO * 0.2; // Inicialización de procesos
  $: tiempoTFP = metricasTanda.cpuSO * 0.2; // Finalización de procesos
  
  // Función para formatear tiempos
  function formatearTiempo(tiempo: number): string {
    return tiempo.toFixed(2);
  }
  
  // Función para formatear porcentajes
  function formatearPorcentaje(porcentaje: number): string {
    return porcentaje.toFixed(1);
  }
  
  // Función para determinar color de eficiencia
  function colorEficiencia(porcentaje: number): string {
    if (porcentaje >= 70) return 'excelente';
    if (porcentaje >= 50) return 'bueno';
    if (porcentaje >= 30) return 'regular';
    return 'malo';
  }
  
  // Función para determinar color de overhead
  function colorOverhead(porcentaje: number): string {
    if (porcentaje <= 15) return 'excelente';
    if (porcentaje <= 25) return 'bueno';
    if (porcentaje <= 40) return 'regular';
    return 'malo';
  }
</script>

<div class="utilizacion-cpu">
  <h3 class="titulo"> Utilización de la CPU</h3>
  
  <div class="utilizacion-container">
    <!-- Gráfico de barras de utilización -->
    <div class="grafico-utilizacion">
      <h4 class="grafico-titulo">Distribución del Tiempo de CPU</h4>
      <div class="barra-utilizacion">
        <div 
          class="segmento procesos" 
          style="width: {formatearPorcentaje(porcentajeProcesos)}%"
          title="CPU utilizada por procesos: {formatearPorcentaje(porcentajeProcesos)}%"
        ></div>
        <div 
          class="segmento so" 
          style="width: {formatearPorcentaje(porcentajeSO)}%"
          title="CPU utilizada por SO: {formatearPorcentaje(porcentajeSO)}%"
        ></div>
        <div 
          class="segmento ocioso" 
          style="width: {formatearPorcentaje(porcentajeOcioso)}%"
          title="CPU desocupada: {formatearPorcentaje(porcentajeOcioso)}%"
        ></div>
      </div>
      <div class="leyenda-barra">
        <div class="leyenda-item-barra">
          <div class="color-muestra procesos"></div>
          <span>Procesos ({formatearPorcentaje(porcentajeProcesos)}%)</span>
        </div>
        <div class="leyenda-item-barra">
          <div class="color-muestra so"></div>
          <span>Sistema Operativo ({formatearPorcentaje(porcentajeSO)}%)</span>
        </div>
        <div class="leyenda-item-barra">
          <div class="color-muestra ocioso"></div>
          <span>Desocupada ({formatearPorcentaje(porcentajeOcioso)}%)</span>
        </div>
      </div>
    </div>

    <!-- Métricas principales -->
    <div class="metricas-cpu">
      <div class="metrica-cpu-card destacada">
        <div class="metrica-header">
          <h4 class="metrica-titulo">Eficiencia Total</h4>
        </div>
        <div class="metrica-valor-grande">
          <span class="valor-eficiencia {colorEficiencia(porcentajeProcesos)}">
            {formatearPorcentaje(porcentajeProcesos)}%
          </span>
        </div>
        <p class="metrica-descripcion">CPU utilizada productivamente</p>
      </div>

      <div class="metrica-cpu-card">
        <div class="metrica-header">
          <h4 class="metrica-titulo">Overhead del SO</h4>
        </div>
        <div class="metrica-valor-grande">
          <span class="valor-overhead {colorOverhead(porcentajeSO)}">
            {formatearPorcentaje(porcentajeSO)}%
          </span>
        </div>
        <p class="metrica-descripcion">Tiempo gastado en administración</p>
      </div>

      <div class="metrica-cpu-card">
        <div class="metrica-header">
          <h4 class="metrica-titulo">Tiempo Idle</h4>
        </div>
        <div class="metrica-valor-grande">
          <span class="valor-idle">
            {formatearPorcentaje(porcentajeOcioso)}%
          </span>
        </div>
        <p class="metrica-descripcion">CPU sin trabajo que procesar</p>
      </div>
    </div>

    <!-- Tiempos absolutos -->
    <div class="tiempos-absolutos">
      <h4 class="seccion-titulo">Tiempos Absolutos</h4>
      <div class="tiempos-grid">
        <div class="tiempo-item">
          <span class="tiempo-label">Tiempo Total de Simulación:</span>
          <span class="tiempo-valor total">{formatearTiempo(tiempoTotal)}</span>
        </div>
        <div class="tiempo-item">
          <span class="tiempo-label">CPU Utilizada por Procesos:</span>
          <span class="tiempo-valor procesos">{formatearTiempo(metricasTanda.cpuProcesos)} ut</span>
        </div>
        <div class="tiempo-item">
          <span class="tiempo-label">CPU Utilizada por SO:</span>
          <span class="tiempo-valor so">{formatearTiempo(metricasTanda.cpuSO)}</span>
        </div>
        <div class="tiempo-item">
          <span class="tiempo-label">CPU Desocupada:</span>
          <span class="tiempo-valor ocioso">{formatearTiempo(metricasTanda.cpuOcioso)}</span>
        </div>
      </div>
    </div>

    <!-- Desglose del Sistema Operativo -->
    <div class="desglose-so">
      <h4 class="seccion-titulo">Desglose del Tiempo del SO</h4>
      <div class="desglose-grid">
        <div class="desglose-item">
          <div class="desglose-info">
            <span class="desglose-label">Cambios de Contexto (TCP)</span>
            <div class="desglose-valores">
              <span class="desglose-valor">{formatearTiempo(tiempoTCP)} ut</span>
              <span class="desglose-porcentaje">~{formatearPorcentaje((tiempoTCP/tiempoTotal)*100)}%</span>
            </div>
          </div>
        </div>
        <div class="desglose-item">
          <div class="desglose-info">
            <span class="desglose-label">Admisión de Procesos (TIP)</span>
            <div class="desglose-valores">
              <span class="desglose-valor">{formatearTiempo(tiempoTIP)} ut</span>
              <span class="desglose-porcentaje">~{formatearPorcentaje((tiempoTIP/tiempoTotal)*100)}%</span>
            </div>
          </div>
        </div>
        <div class="desglose-item">
          <div class="desglose-info">
            <span class="desglose-label">Finalización de Procesos (TFP)</span>
            <div class="desglose-valores">
              <span class="desglose-valor">{formatearTiempo(tiempoTFP)} ut</span>
              <span class="desglose-porcentaje">~{formatearPorcentaje((tiempoTFP/tiempoTotal)*100)}%</span>
            </div>
          </div>
        </div>
      </div>
      <p class="desglose-nota">
        * Los valores del desglose son proporciones ilustrativas. El tiempo real del SO incluye:<br>
        TIP (por cada proceso admitido) + TFP (por cada proceso finalizado) + TCP (por cada despacho y transición E/S)
      </p>
    </div>
  </div>
</div>

<style>
  .utilizacion-cpu {
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
    text-align: center;
  }

  .utilizacion-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  /* Gráfico de utilización */
  .grafico-utilizacion {
    background: var(--blanco-tiza);
    border-radius: 12px;
    padding: 20px;
    border: 1px solid var(--celeste-suave);
  }

  .grafico-titulo {
    margin: 0 0 16px 0;
    color: var(--gris-casi-negro);
    font-size: 1.1rem;
    font-weight: 600;
    text-align: center;
  }

  .barra-utilizacion {
    height: 40px;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 16px;
  }

  .segmento {
    height: 100%;
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .segmento:hover {
    filter: brightness(1.1);
  }

  .segmento.procesos {
    background: var(--verde-esmeralda);
  }

  .segmento.so {
    background: var(--amarillo-vibrante);
  }

  .segmento.ocioso {
    background: var(--coral-vibrante);
  }

  .leyenda-barra {
    display: flex;
    justify-content: center;
    gap: 24px;
    flex-wrap: wrap;
  }

  .leyenda-item-barra {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .color-muestra {
    width: 16px;
    height: 16px;
    border-radius: 4px;
  }

  .color-muestra.procesos {
    background: var(--verde-esmeralda);
  }

  .color-muestra.so {
    background: var(--amarillo-vibrante);
  }

  .color-muestra.ocioso {
    background: var(--coral-vibrante);
  }

  /* Métricas CPU */
  .metricas-cpu {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
  }

  .metrica-cpu-card {
    background: var(--blanco-tiza);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
    border: 1px solid var(--celeste-suave);
    transition: transform 0.2s ease;
  }

  .metrica-cpu-card:hover {
    transform: translateY(-2px);
  }

  .metrica-cpu-card.destacada {
    border: 2px solid var(--turquesa-intenso);
    background: var(--marfil-claro);
  }

  .metrica-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .metrica-icono {
    font-size: 2rem;
  }

  .metrica-titulo {
    margin: 0;
    color: var(--gris-casi-negro);
    font-size: 1rem;
    font-weight: 600;
  }

  .metrica-valor-grande {
    margin-bottom: 8px;
  }

  .valor-eficiencia,
  .valor-overhead,
  .valor-idle {
    font-size: 2.5rem;
    font-weight: 700;
    padding: 8px 16px;
    border-radius: 8px;
    color: var(--blanco-puro);
  }

  .valor-eficiencia.excelente {
    background: var(--verde-esmeralda);
  }

  .valor-eficiencia.bueno {
    background: var(--turquesa-intenso);
  }

  .valor-eficiencia.regular {
    background: var(--amarillo-vibrante);
    color: var(--gris-casi-negro);
  }

  .valor-eficiencia.malo {
    background: var(--coral-vibrante);
  }

  .valor-overhead.excelente {
    background: var(--verde-esmeralda);
  }

  .valor-overhead.bueno {
    background: var(--turquesa-intenso);
  }

  .valor-overhead.regular {
    background: var(--amarillo-vibrante);
    color: var(--gris-casi-negro);
  }

  .valor-overhead.malo {
    background: var(--coral-vibrante);
  }

  .valor-idle {
    background: var(--gris-medio);
  }

  .metrica-descripcion {
    margin: 0;
    color: var(--gris-medio);
    font-size: 0.85rem;
  }

  /* Tiempos absolutos */
  .tiempos-absolutos {
    background: var(--marfil-claro);
    border-radius: 12px;
    padding: 20px;
  }

  .seccion-titulo {
    margin: 0 0 16px 0;
    color: var(--gris-casi-negro);
    font-size: 1.1rem;
    font-weight: 600;
    text-align: center;
  }

  .tiempos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 12px;
  }

  .tiempo-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--blanco-puro);
    border-radius: 8px;
    border: 1px solid var(--turquesa-intenso);
    text-align: center;
  }

  .tiempo-label {
    font-weight: 600;
    color: var(--gris-casi-negro);
    font-size: 0.9rem;
  }

  .tiempo-valor {
    font-weight: 700;
    font-size: 1rem;
  }

  .tiempo-valor.total {
    color: var(--gris-casi-negro);
  }

  .tiempo-valor.procesos {
    color: var(--verde-esmeralda);
  }

  .tiempo-valor.so {
    color: var(--amarillo-vibrante);
  }

  .tiempo-valor.ocioso {
    color: var(--coral-vibrante);
  }

  /* Desglose SO */
  .desglose-so {
    background: var(--blanco-tiza);
    border-radius: 12px;
    padding: 20px;
    border: 1px solid var(--celeste-suave);
  }

  .desglose-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }

  .desglose-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: var(--blanco-puro);
    border-radius: 8px;
    border: 1px solid var(--celeste-suave);
    text-align: center;
  }

  .desglose-icono {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .desglose-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .desglose-valores {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .desglose-label {
    font-weight: 600;
    color: var(--gris-casi-negro);
    font-size: 0.9rem;
    text-align: left;
  }

  .desglose-valor {
    font-weight: 700;
    color: var(--turquesa-intenso);
    font-size: 1.1rem;
  }

  .desglose-porcentaje {
    font-size: 0.8rem;
    color: var(--gris-medio);
    font-style: italic;
    font-weight: 500;
  }

  .desglose-nota {
    margin: 0;
    color: var(--gris-medio);
    font-size: 0.8rem;
    font-style: italic;
    text-align: center;
    line-height: 1.4;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .utilizacion-cpu {
      padding: 16px;
    }

    .titulo {
      font-size: 1.2rem;
    }

    .metricas-cpu {
      grid-template-columns: 1fr;
    }

    .tiempos-grid {
      grid-template-columns: 1fr;
    }

    .desglose-grid {
      grid-template-columns: 1fr;
    }

    .leyenda-barra {
      gap: 16px;
    }

    .valor-eficiencia,
    .valor-overhead,
    .valor-idle {
      font-size: 2rem;
    }

    .barra-utilizacion {
      height: 32px;
    }
  }
</style>
