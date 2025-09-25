<script lang="ts">
  import type { BatchMetrics } from '$lib/domain/types';
  
  export let metricasTanda: BatchMetrics;
  export let cantidadProcesos: number = 0;
  
  // Función para formatear tiempos
  function formatearTiempo(tiempo: number): string {
    return tiempo.toFixed(2);
  }
  
  // Función para calcular throughput
  function calcularThroughput(): number {
    if (metricasTanda.tiempoRetornoTanda <= 0) return 0;
    return cantidadProcesos / metricasTanda.tiempoRetornoTanda;
  }
  
  // Función para determinar el color del indicador según performance
  function colorIndicador(valor: number, tipo: 'throughput' | 'tiempo'): string {
    if (tipo === 'throughput') {
      if (valor >= 0.5) return 'excelente';
      if (valor >= 0.3) return 'bueno';
      if (valor >= 0.1) return 'regular';
      return 'malo';
    } else { // tiempo
      if (valor <= 10) return 'excelente';
      if (valor <= 25) return 'bueno';
      if (valor <= 50) return 'regular';
      return 'malo';
    }
  }
</script>

<div class="indicadores-tanda">
  <h3 class="titulo">Indicadores de la Tanda Completa</h3>
  
  <div class="metricas-container">
    <!-- Métricas principales -->
    <div class="metricas-principales">
      <div class="metrica-card">
        <div class="metrica-header">
          <div class="metrica-info">
            <h4 class="metrica-titulo">Tiempo de Retorno de la Tanda</h4>
            <p class="metrica-descripcion">TRt - Desde el primer arribo hasta el último TFP</p>
          </div>
        </div>
        <div class="metrica-valor">
          <span class="valor-principal {colorIndicador(metricasTanda.tiempoRetornoTanda, 'tiempo')}">
            {formatearTiempo(metricasTanda.tiempoRetornoTanda)}
          </span>
        </div>
      </div>

      <div class="metrica-card">
        <div class="metrica-header">
          <div class="metrica-info">
            <h4 class="metrica-titulo">Tiempo Medio de Retorno</h4>
            <p class="metrica-descripcion">TMRt - Promedio de TR de todos los procesos</p>
          </div>
        </div>
        <div class="metrica-valor">
          <span class="valor-principal {colorIndicador(metricasTanda.tiempoMedioRetorno, 'tiempo')}">
            {formatearTiempo(metricasTanda.tiempoMedioRetorno)}
          </span>
        </div>
      </div>

      <div class="metrica-card">
        <div class="metrica-header">
          <div class="metrica-info">
            <h4 class="metrica-titulo">Throughput</h4>
            <p class="metrica-descripcion">Procesos completados por unidad de tiempo</p>
          </div>
        </div>
        <div class="metrica-valor">
          <span class="valor-principal {colorIndicador(calcularThroughput(), 'throughput')}">
            {calcularThroughput().toFixed(3)}
          </span>
        </div>
      </div>
    </div>

    <!-- Indicadores adicionales -->
    <div class="indicadores-secundarios">
      <div class="indicador-item">
        <span class="indicador-label">Procesos completados:</span>
        <span class="indicador-valor">{cantidadProcesos}</span>
      </div>
      <div class="indicador-item">
        <span class="indicador-label">Duración total:</span>
        <span class="indicador-valor">{formatearTiempo(metricasTanda.tiempoRetornoTanda)} ut</span>
      </div>
      <div class="indicador-item">
        <span class="indicador-label">Eficiencia temporal:</span>
        <span class="indicador-valor">
          {((cantidadProcesos / metricasTanda.tiempoRetornoTanda) * 100).toFixed(1)}%
        </span>
      </div>
    </div>

    <!-- Análisis de performance -->
    <div class="analisis-performance">
      <h4 class="analisis-titulo">Análisis de Performance</h4>
      <div class="analisis-items">
        <div class="analisis-item">
          <div class="analisis-indicador {colorIndicador(calcularThroughput(), 'throughput')}"></div>
          <div class="analisis-texto">
            <strong>Throughput:</strong>
            {#if calcularThroughput() >= 0.5}
              Excelente - Alta productividad del sistema
            {:else if calcularThroughput() >= 0.3}
              Bueno - Productividad adecuada
            {:else if calcularThroughput() >= 0.1}
              Regular - Productividad moderada
            {:else}
              Deficiente - Baja productividad del sistema
            {/if}
          </div>
        </div>
        
        <div class="analisis-item">
          <div class="analisis-indicador {colorIndicador(metricasTanda.tiempoMedioRetorno, 'tiempo')}"></div>
          <div class="analisis-texto">
            <strong>Tiempo Medio:</strong>
            {#if metricasTanda.tiempoMedioRetorno <= 10}
              Excelente - Respuesta muy rápida
            {:else if metricasTanda.tiempoMedioRetorno <= 25}
              Bueno - Respuesta adecuada
            {:else if metricasTanda.tiempoMedioRetorno <= 50}
              Regular - Respuesta moderada
            {:else}
              Deficiente - Respuesta lenta
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Leyenda -->
  <div class="leyenda">
    <div class="leyenda-items">
      <div class="leyenda-item">
        <strong>TRt (Tiempo de Retorno de Tanda):</strong> Tiempo total desde que llega el primer proceso hasta que termina el último
      </div>
      <div class="leyenda-item">
        <strong>TMRt (Tiempo Medio de Retorno):</strong> Promedio aritmético de los tiempos de retorno individuales
      </div>
      <div class="leyenda-item">
        <strong>Throughput:</strong> Medida de productividad del sistema - mayor valor indica mejor performance
      </div>
    </div>
  </div>
</div>

<style>
  .indicadores-tanda {
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

  .metricas-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  /* Métricas principales */
  .metricas-principales {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
  }

  .metrica-card {
    background: var(--blanco-tiza);
    border-radius: 12px;
    padding: 20px;
    border: 1px solid var(--celeste-suave);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .metrica-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  }

  .metrica-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .metrica-icono {
    font-size: 2rem;
    line-height: 1;
  }

  .metrica-info {
    flex: 1;
  }

  .metrica-titulo {
    margin: 0 0 4px 0;
    color: var(--gris-casi-negro);
    font-size: 1.1rem;
    font-weight: 600;
  }

  .metrica-descripcion {
    margin: 0;
    color: var(--gris-medio);
    font-size: 0.85rem;
    line-height: 1.3;
  }

  .metrica-valor {
    display: flex;
    align-items: baseline;
    gap: 8px;
    justify-content: center;
  }

  .valor-principal {
    font-size: 2rem;
    font-weight: 700;
    padding: 8px 16px;
    border-radius: 8px;
    color: var(--blanco-puro);
  }

  .valor-principal.excelente {
    background: var(--verde-esmeralda);
  }

  .valor-principal.bueno {
    background: var(--turquesa-intenso);
  }

  .valor-principal.regular {
    background: var(--amarillo-vibrante);
    color: var(--gris-casi-negro);
  }

  .valor-principal.malo {
    background: var(--coral-vibrante);
  }

  .unidad {
    font-size: 1rem;
    color: var(--gris-medio);
    font-weight: 500;
  }

  /* Indicadores secundarios */
  .indicadores-secundarios {
    background: var(--marfil-claro);
    border-radius: 12px;
    padding: 20px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .indicador-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--blanco-puro);
    border-radius: 8px;
    border: 1px solid var(--turquesa-intenso);
  }

  .indicador-label {
    font-weight: 600;
    color: var(--gris-casi-negro);
    font-size: 0.9rem;
  }

  .indicador-valor {
    font-weight: 700;
    color: var(--turquesa-intenso);
    font-size: 1rem;
  }

  /* Análisis de performance */
  .analisis-performance {
    background: var(--blanco-tiza);
    border-radius: 12px;
    padding: 20px;
    border: 1px solid var(--celeste-suave);
  }

  .analisis-titulo {
    margin: 0 0 16px 0;
    color: var(--gris-casi-negro);
    font-size: 1.1rem;
    font-weight: 600;
    text-align: center;
  }

  .analisis-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .analisis-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--blanco-puro);
    border-radius: 8px;
  }

  .analisis-indicador {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .analisis-indicador.excelente {
    background: var(--verde-esmeralda);
  }

  .analisis-indicador.bueno {
    background: var(--turquesa-intenso);
  }

  .analisis-indicador.regular {
    background: var(--amarillo-vibrante);
  }

  .analisis-indicador.malo {
    background: var(--coral-vibrante);
  }

  .analisis-texto {
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .analisis-texto strong {
    color: var(--gris-casi-negro);
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

  .leyenda-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: left;
    max-width: 800px;
    margin: 0 auto;
  }

  .leyenda-item {
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .leyenda-item strong {
    color: var(--gris-casi-negro);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .indicadores-tanda {
      padding: 16px;
    }

    .titulo {
      font-size: 1.2rem;
    }

    .metricas-principales {
      grid-template-columns: 1fr;
    }

    .indicadores-secundarios {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .valor-principal {
      font-size: 1.5rem;
      padding: 6px 12px;
    }

    .analisis-items {
      gap: 8px;
    }

    .analisis-item {
      padding: 10px;
    }
  }
</style>
