<script lang="ts">
  import type { DatosSimulacionCompleta } from '$lib/application/simuladorLogic';
  
  export let datosSimulacion: DatosSimulacionCompleta;
  
  // Calcular datos derivados
  $: configuracion = datosSimulacion?.configuracion;
  $: resultados = datosSimulacion?.resultados;
  $: metrics = resultados?.metrics;
  
  // Datos de configuración
  $: algoritmo = configuracion?.policy || 'N/A';
  $: tip = configuracion?.tip || 0;
  $: tfp = configuracion?.tfp || 0;
  $: tcp = configuracion?.tcp || 0;
  $: quantum = configuracion?.quantum;
  
  // Datos de resultados
  $: tiempoTotalSimulacion = metrics?.tanda?.tiempoRetornoTanda || 0;
  $: numeroProcesos = datosSimulacion?.procesos?.length || 0;
  $: numeroEventos = resultados?.events?.length || 0;
  
  // Eficiencia CPU
  $: eficienciaCPU = metrics?.tanda?.porcentajeCpuProcesos || 0;
  $: utilizacionCPU = (100 - (metrics?.tanda?.porcentajeCpuOcioso || 0));
  
  // Tiempo promedio de respuesta
  $: tiempoPromedioRespuesta = calcularTiempoPromedioRespuesta();
  
  function calcularTiempoPromedioRespuesta(): number {
    if (!metrics?.porProceso || metrics.porProceso.length === 0) {
      return 0;
    }
    
    // Calcular el tiempo promedio desde los datos disponibles
    // Si no hay tiempo de respuesta específico, usar tiempo en listo como aproximación
    const totalTiempoEspera = metrics.porProceso.reduce((sum, proceso) => {
      return sum + (proceso.tiempoEnListo || 0);
    }, 0);
    
    return totalTiempoEspera / metrics.porProceso.length;
  }
  
  function formatearTiempo(tiempo: number): string {
    return tiempo.toFixed(2);
  }
  
  function formatearPorcentaje(valor: number): string {
    return `${valor.toFixed(1)}%`;
  }
  
  function obtenerNombreAlgoritmo(policy: string): string {
    const nombres: Record<string, string> = {
      'FCFS': 'First Come, First Served',
      'PRIORITY': 'Planificación por Prioridades',
      'RR': 'Round Robin',
      'SPN': 'Shortest Process Next',
      'SRTN': 'Shortest Remaining Time Next'
    };
    return nombres[policy] || policy;
  }
</script>

<div class="tabla-resumen">
  <div class="header-tabla">
    <h3 class="titulo-seccion">📋 Tabla Resumen Comparativa</h3>
    <p class="descripcion-seccion">
      Resumen ejecutivo de la configuración utilizada y principales resultados obtenidos
    </p>
  </div>
  
  <div class="contenido-tabla">
    <!-- Sección: Configuración utilizada -->
    <div class="seccion-tabla">
      <h4 class="subtitulo-seccion">⚙️ Configuración Utilizada</h4>
      <div class="tabla-datos">
        <div class="fila-dato">
          <span class="etiqueta">Algoritmo de planificación:</span>
          <span class="valor destacado">{algoritmo}</span>
          <span class="valor-secundario">({obtenerNombreAlgoritmo(algoritmo)})</span>
        </div>
        
        <div class="fila-dato">
          <span class="etiqueta">Tiempos del Sistema Operativo:</span>
          <span class="valor">TIP: {tip}, TFP: {tfp}, TCP: {tcp}</span>
        </div>
        
        {#if quantum !== undefined}
          <div class="fila-dato">
            <span class="etiqueta">Quantum (Round Robin):</span>
            <span class="valor quantum">{quantum} unidades</span>
          </div>
        {/if}
        
        <div class="fila-dato">
          <span class="etiqueta">Número de procesos:</span>
          <span class="valor">{numeroProcesos} procesos</span>
        </div>
      </div>
    </div>
    
    <!-- Sección: Resumen de resultados -->
    <div class="seccion-tabla">
      <h4 class="subtitulo-seccion">📊 Resumen de Resultados</h4>
      <div class="tabla-datos">
        <div class="fila-dato destacada">
          <span class="etiqueta">Tiempo total de simulación:</span>
          <span class="valor tiempo-total">{formatearTiempo(tiempoTotalSimulacion)} unidades</span>
        </div>
        
        <div class="fila-dato">
          <span class="etiqueta">Número total de eventos:</span>
          <span class="valor">{numeroEventos.toLocaleString('es-AR')} eventos</span>
        </div>
        
        <div class="fila-dato destacada">
          <span class="etiqueta">Eficiencia de la CPU:</span>
          <span class="valor eficiencia">{formatearPorcentaje(eficienciaCPU)}</span>
          <span class="indicador-eficiencia" class:buena={eficienciaCPU >= 70} class:media={eficienciaCPU >= 50 && eficienciaCPU < 70} class:baja={eficienciaCPU < 50}>
            {#if eficienciaCPU >= 70}
              ✅ Buena
            {:else if eficienciaCPU >= 50}
              ⚠️ Media
            {:else}
              ❌ Baja
            {/if}
          </span>
        </div>
        
        <div class="fila-dato">
          <span class="etiqueta">Utilización de CPU:</span>
          <span class="valor">{formatearPorcentaje(utilizacionCPU)}</span>
        </div>
        
        <div class="fila-dato">
          <span class="etiqueta">Tiempo promedio de respuesta:</span>
          <span class="valor">{formatearTiempo(tiempoPromedioRespuesta)} unidades</span>
        </div>
        
        <div class="fila-dato">
          <span class="etiqueta">Tiempo medio de retorno:</span>
          <span class="valor">{formatearTiempo(metrics?.tanda?.tiempoMedioRetorno || 0)} unidades</span>
        </div>
      </div>
    </div>
    
    <!-- Sección: Análisis rápido -->
    <div class="seccion-tabla">
      <h4 class="subtitulo-seccion">🔍 Análisis Rápido</h4>
      <div class="analisis-rapido">
        <div class="metrica-analisis">
          <span class="icono-metrica">⏱️</span>
          <div class="texto-metrica">
            <strong>Rendimiento temporal:</strong>
            {#if tiempoTotalSimulacion / numeroProcesos < 10}
              Excelente velocidad de procesamiento
            {:else if tiempoTotalSimulacion / numeroProcesos < 20}
              Velocidad de procesamiento aceptable
            {:else}
              Procesamiento lento, considere optimizar
            {/if}
          </div>
        </div>
        
        <div class="metrica-analisis">
          <span class="icono-metrica">🎯</span>
          <div class="texto-metrica">
            <strong>Eficiencia del algoritmo:</strong>
            {#if algoritmo === 'FCFS'}
              Simple pero puede sufrir efecto convoy
            {:else if algoritmo === 'SPN'}
              Óptimo para tiempo de retorno, riesgo de inanición
            {:else if algoritmo === 'SRTN'}
              Mejor tiempo de respuesta, mayor overhead
            {:else if algoritmo === 'RR'}
              Equitativo, adecuado para sistemas interactivos
            {:else if algoritmo === 'PRIORITY'}
              Ideal para procesos críticos, controle inanición
            {:else}
              Algoritmo de planificación configurado
            {/if}
          </div>
        </div>
        
        <div class="metrica-analisis">
          <span class="icono-metrica">📈</span>
          <div class="texto-metrica">
            <strong>Overhead del sistema:</strong>
            {#if (metrics?.tanda?.porcentajeCpuSO || 0) < 20}
              Bajo overhead, configuración eficiente
            {:else if (metrics?.tanda?.porcentajeCpuSO || 0) < 40}
              Overhead moderado
            {:else}
              Alto overhead, considere reducir TIP/TFP/TCP
            {/if}
            ({formatearPorcentaje(metrics?.tanda?.porcentajeCpuSO || 0)})
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .tabla-resumen {
    background: var(--blanco-puro);
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    overflow: hidden;
  }

  .header-tabla {
    background: linear-gradient(135deg, var(--turquesa-intenso) 0%, var(--cian-profundo) 100%);
    color: var(--blanco-puro);
    padding: 24px;
    text-align: center;
  }

  .titulo-seccion {
    margin: 0 0 8px 0;
    font-size: 1.5rem;
    font-weight: 700;
  }

  .descripcion-seccion {
    margin: 0;
    opacity: 0.9;
    font-size: 0.95rem;
    line-height: 1.4;
  }

  .contenido-tabla {
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .seccion-tabla {
    border-left: 4px solid var(--celeste-suave);
    padding-left: 20px;
  }

  .subtitulo-seccion {
    margin: 0 0 16px 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--gris-casi-negro);
  }

  .tabla-datos {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .fila-dato {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--marfil-claro);
    border-radius: 8px;
    transition: all 0.3s ease;
  }

  .fila-dato:hover {
    background: var(--celeste-suave);
    transform: translateX(4px);
  }

  .fila-dato.destacada {
    background: linear-gradient(135deg, var(--celeste-suave) 0%, var(--marfil-claro) 100%);
    border: 1px solid var(--turquesa-intenso);
  }

  .etiqueta {
    flex: 1;
    font-weight: 500;
    color: var(--gris-medio);
    min-width: 200px;
  }

  .valor {
    font-weight: 600;
    color: var(--gris-casi-negro);
    font-family: 'Courier New', monospace;
  }

  .valor.destacado {
    color: var(--turquesa-intenso);
    font-size: 1.1rem;
  }

  .valor.tiempo-total {
    color: var(--coral-vibrante);
    font-size: 1.1rem;
  }

  .valor.eficiencia {
    color: var(--verde-exitoso);
    font-size: 1.1rem;
  }

  .valor.quantum {
    color: var(--magenta-vibrante);
  }

  .valor-secundario {
    color: var(--gris-medio);
    font-style: italic;
    font-size: 0.9rem;
  }

  .indicador-eficiencia {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .indicador-eficiencia.buena {
    background: rgba(76, 175, 80, 0.1);
    color: var(--verde-exitoso);
  }

  .indicador-eficiencia.media {
    background: rgba(255, 152, 0, 0.1);
    color: #FF9800;
  }

  .indicador-eficiencia.baja {
    background: rgba(244, 67, 54, 0.1);
    color: var(--coral-vibrante);
  }

  .analisis-rapido {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .metrica-analisis {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: var(--marfil-claro);
    border-radius: 12px;
    border-left: 4px solid var(--turquesa-intenso);
  }

  .icono-metrica {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .texto-metrica {
    flex: 1;
    line-height: 1.5;
  }

  .texto-metrica strong {
    color: var(--turquesa-intenso);
    display: block;
    margin-bottom: 4px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .contenido-tabla {
      padding: 24px 16px;
    }

    .fila-dato {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .etiqueta {
      min-width: auto;
      font-size: 0.9rem;
    }

    .valor {
      font-size: 1rem;
    }

    .metrica-analisis {
      padding: 12px;
    }

    .icono-metrica {
      font-size: 1.3rem;
    }
  }

  @media (max-width: 480px) {
    .header-tabla {
      padding: 16px;
    }

    .titulo-seccion {
      font-size: 1.3rem;
    }

    .descripcion-seccion {
      font-size: 0.9rem;
    }

    .contenido-tabla {
      padding: 16px;
      gap: 24px;
    }

    .subtitulo-seccion {
      font-size: 1.1rem;
    }
  }
</style>
