<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import IndicadoresProceso from '$lib/ui/components/IndicadoresProceso.svelte';
  import IndicadoresTanda from '$lib/ui/components/IndicadoresTanda.svelte';
  import UtilizacionCPU from '$lib/ui/components/UtilizacionCPU.svelte';
  import GanttFixed from '$lib/ui/components/GanttFixed.svelte';
  import TablaResumenComparativa from '$lib/ui/components/TablaResumenComparativa.svelte';
  import PanelExportacion from '$lib/ui/components/PanelExportacion.svelte';
  import EventosSimulacion from '$lib/ui/components/EventosSimulacion.svelte';
  
  import { 
    cargarDatosSimulacion, 
    limpiarDatosSimulacion,
    type DatosSimulacionCompleta 
  } from '$lib/application/simuladorLogic';
  
  let datosSimulacion: DatosSimulacionCompleta | null = null;
  let cargando = true;
  let error: string | null = null;
  
  onMount(() => {
    cargarDatos();
  });
  
  function cargarDatos() {
    try {
      cargando = true;
      error = null;
      
      const datos = cargarDatosSimulacion();
      
      if (!datos) {
        error = 'No se encontraron datos de simulación. Ejecuta una simulación primero.';
        return;
      }
      
      if (!datos.resultados || !datos.resultados.metrics) {
        error = 'Los datos de simulación están incompletos.';
        return;
      }
      
      datosSimulacion = datos;
      
    } catch (err) {
      console.error('❌ Error al cargar datos:', err);
      error = 'Error al cargar los datos de simulación.';
    } finally {
      cargando = false;
    }
  }
  
  function nuevaSimulacion() {
    limpiarDatosSimulacion();
    goto('/');
  }
  
  function recargarDatos() {
    cargarDatos();
  }
</script>

<svelte:head>
  <title>Resultados de Simulación - Simulador de Planificación</title>
  <meta name="description" content="Resultados detallados de la simulación de planificación de procesos" />
</svelte:head>

<main class="contenedor-resultados">
  <!-- Header -->
  <header class="header-resultados">
    <div class="header-content">
      <div class="header-info">
        <h1 class="titulo-pagina">📊 Resultados de Simulación</h1>
        {#if datosSimulacion}
          <div class="info-simulacion">
            <span class="info-item">
              <strong>Algoritmo:</strong> {datosSimulacion.configuracion.policy}
            </span>
            <span class="info-item">
              <strong>Procesos:</strong> {datosSimulacion.procesos.length}
            </span>
            <span class="info-item">
              <strong>Ejecutado:</strong> {new Date(datosSimulacion.timestamp).toLocaleString('es-AR')}
            </span>
          </div>
        {/if}
      </div>
      <div class="header-actions">

        <button class="btn-primario" on:click={nuevaSimulacion}>
          ➕ Nueva Simulación
        </button>
      </div>
    </div>
  </header>

  <!-- Contenido principal -->
  <div class="contenido-resultados">
    {#if cargando}
      <div class="estado-cargando">
        <div class="spinner"></div>
        <p>Cargando resultados de simulación...</p>
      </div>
    {:else if error}
      <div class="estado-error">
        <div class="error-icono">❌</div>
        <h3>Error al cargar resultados</h3>
        <p>{error}</p>
        <div class="error-actions">
          <button class="btn-primario" on:click={nuevaSimulacion}>
            🏠 Ir al inicio
          </button>
        </div>
      </div>
    {:else if datosSimulacion}
      <!-- Sección 1: Indicadores por Proceso -->
      <section class="seccion-resultados">
        <IndicadoresProceso 
          metricasProcesos={datosSimulacion.resultados.metrics.porProceso}
        />
      </section>
      
      <!-- Sección 2: Métricas de la Tanda Completa -->
      <section class="seccion-resultados">
        <IndicadoresTanda 
          metricasTanda={datosSimulacion.resultados.metrics.tanda}
          cantidadProcesos={datosSimulacion.procesos.length}
        />
      </section>
      
      <!-- Sección 3: Utilización de CPU -->
      <section class="seccion-resultados">
        <UtilizacionCPU 
          metricasTanda={datosSimulacion.resultados.metrics.tanda}
        />
      </section>
      
      <!-- Sección 4: Tabla Resumen Comparativa -->
      <section class="seccion-resultados">
        <TablaResumenComparativa {datosSimulacion} />
      </section>
      
      <!-- Sección 5: Panel de Exportación -->
      <section class="seccion-resultados">
        <PanelExportacion {datosSimulacion} />
      </section>
      
      <!-- Sección 6: Diagrama de Gantt -->
      <section class="seccion-resultados">
        {#if datosSimulacion.resultados.gantt}
          <!-- @ts-ignore -->
          <GanttFixed
            segmentos={datosSimulacion.resultados.gantt.segmentos || []}
            tiempoTotal={datosSimulacion.resultados.gantt.tiempoTotal || 0}
            procesos={datosSimulacion.resultados.gantt.procesos || []}
            algoritmo={datosSimulacion.configuracion.policy || 'FCFS'}
          />
        {:else}
          <div class="componente-placeholder">
            <h3>📈 Diagrama de Gantt</h3>
            <p>No se generaron datos de cronograma en esta simulación</p>
          </div>
        {/if}
      </section>
      
      <!-- Sección 7: Eventos de Simulación -->
      <section class="seccion-resultados">
        <EventosSimulacion {datosSimulacion} />
      </section>
    {/if}
  </div>
</main>

<style>
  .contenedor-resultados {
    min-height: 100vh;
    background: var(--blanco-tiza);
    padding: 0;
  }

  /* Header */
  .header-resultados {
    background: linear-gradient(135deg, var(--cian-profundo) 0%, var(--turquesa-intenso) 100%);
    color: var(--blanco-puro);
    padding: 32px 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
  }

  .header-info {
    flex: 1;
  }

  .titulo-pagina {
    margin: 0 0 12px 0;
    font-size: 2rem;
    font-weight: 700;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .info-simulacion {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
  }

  .info-item {
    font-size: 0.95rem;
    opacity: 0.9;
  }

  .info-item strong {
    font-weight: 600;
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }

  .btn-primario {
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.9rem;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn-primario {
    background: var(--blanco-puro);
    color: var(--turquesa-intenso);
  }

  .btn-primario:hover {
    background: var(--marfil-claro);
    transform: translateY(-1px);
  }

  /* Contenido */
  .contenido-resultados {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .seccion-resultados {
    width: 100%;
  }

  /* Estados */
  .estado-cargando,
  .estado-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 32px;
    text-align: center;
    background: var(--blanco-puro);
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--celeste-suave);
    border-left: 4px solid var(--turquesa-intenso);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .estado-cargando p {
    margin: 0;
    color: var(--gris-medio);
    font-size: 1.1rem;
  }

  .error-icono {
    font-size: 3rem;
    margin-bottom: 16px;
  }

  .estado-error h3 {
    margin: 0 0 8px 0;
    color: var(--coral-vibrante);
    font-size: 1.3rem;
  }

  .estado-error p {
    margin: 0 0 24px 0;
    color: var(--gris-medio);
    font-size: 1rem;
    max-width: 500px;
    line-height: 1.5;
  }

  .error-actions {
    display: flex;
    gap: 12px;
  }

  .error-actions .btn-primario {
    background: var(--turquesa-intenso);
    color: var(--blanco-puro);
  }

  .error-actions .btn-primario:hover{
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  /* Placeholder para futuros componentes */
  .componente-placeholder {
    background: var(--blanco-puro);
    border-radius: 16px;
    padding: 48px 24px;
    text-align: center;
    border: 2px dashed var(--celeste-suave);
    color: var(--gris-medio);
  }

  .componente-placeholder h3 {
    margin: 0 0 8px 0;
    color: var(--gris-casi-negro);
    font-size: 1.2rem;
  }

  .componente-placeholder p {
    margin: 0;
    font-style: italic;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      text-align: center;
      gap: 16px;
    }

    .titulo-pagina {
      font-size: 1.6rem;
    }

    .info-simulacion {
      justify-content: center;
      gap: 16px;
    }

    .header-actions {
      width: 100%;
      justify-content: center;
    }

    .contenido-resultados {
      padding: 24px 16px;
      gap: 24px;
    }

    .estado-cargando,
    .estado-error {
      padding: 48px 24px;
    }

    .error-actions {
      flex-direction: column;
      width: 100%;
      max-width: 300px;
    }
  }
</style>