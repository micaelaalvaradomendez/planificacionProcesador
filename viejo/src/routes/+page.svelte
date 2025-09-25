<script lang="ts">
  import { goto } from '$app/navigation';
  import CargaArchivo from '$lib/ui/components/CargaArchivo.svelte';
  import TablaProcesos from '$lib/ui/components/TablaProcesos.svelte';
  import ConfiguracionPanel from '$lib/ui/components/ConfiguracionPanel.svelte';
  
  // Importar tipos y funciones desde simuladorLogic
  import { 
    cargarArchivoProcesos, 
    validarConfiguracion, 
    ejecutarSimulacion,
    guardarDatosSimulacion 
  } from '$lib/application/simuladorLogic';
  
  import type { 
    ProcesoSimple, 
    ConfiguracionSimulacion,
    DatosSimulacionCompleta 
  } from '$lib/application/simuladorLogic';
  
  // Estado de la aplicación
  let procesos: ProcesoSimple[] = [];
  let configuracion: ConfiguracionSimulacion = {
    policy: 'FCFS',
    tip: 1,
    tfp: 1,
    tcp: 1,
    quantum: undefined
  };
  
  // Estados de UI
  let cargandoArchivo = false;
  let errorArchivo: string | null = null;
  let ejecutandoSimulacion = false;
  let errorSimulacion: string | null = null;
  
  // Validación reactiva
  $: validacionConfig = validarConfiguracion(configuracion);
  $: puedeEjecutar = procesos.length > 0 && validacionConfig.valida && !ejecutandoSimulacion;
  
  // Manejar carga de archivo
  async function onArchivoSeleccionado(event: CustomEvent) {
    cargandoArchivo = true;
    errorArchivo = null;
    
    try {
      const file = event.detail.file;
      console.log('Archivo seleccionado:', file.name);
      
      const resultado = await cargarArchivoProcesos(file);
      
      if (resultado.error) {
        errorArchivo = resultado.error;
        procesos = [];
      } else {
        procesos = resultado.procesos;
        console.log('Procesos cargados:', procesos.length);
      }
    } catch (error) {
      console.error('Error al cargar archivo:', error);
      errorArchivo = `Error inesperado: ${error}`;
      procesos = [];
    } finally {
      cargandoArchivo = false;
    }
  }
  
  // Manejar remoción de archivo
  function onArchivoRemovido() {
    procesos = [];
    errorArchivo = null;
  }
  
  // Manejar cambios en configuración
  function onConfiguracionChange(nuevaConfig: ConfiguracionSimulacion) {
    configuracion = { ...nuevaConfig };
  }
  
  // Ejecutar simulación
  async function ejecutar() {
    if (!puedeEjecutar) return;
    
    ejecutandoSimulacion = true;
    errorSimulacion = null;
    
    try {
      console.log('Iniciando simulación...');
      console.log('Procesos:', procesos);
      console.log('Configuración:', configuracion);
      
      const resultado = await ejecutarSimulacion(procesos, configuracion);
      
      // Crear datos completos para guardar
      const datosCompletos: DatosSimulacionCompleta = {
        procesos,
        configuracion,
        resultados: resultado,
        timestamp: new Date().toISOString()
      };
      
      // Guardar en localStorage
      guardarDatosSimulacion(datosCompletos);
      
      console.log('Simulación completada, navegando a resultados...');
      
      // Navegar a página de resultados
      await goto('/resultados');
      
    } catch (error) {
      console.error('Error en simulación:', error);
      errorSimulacion = `Error al ejecutar simulación: ${error}`;
    } finally {
      ejecutandoSimulacion = false;
    }
  }
</script>

<svelte:head>
  <title>Simulador de Planificación de Procesos</title>
  <meta name="description" content="Simulador de algoritmos de planificación de procesos del sistema operativo" />
</svelte:head>

<main class="contenedor-principal">
 
  <!-- Contenido principal -->
  <div class="contenido">
    <!-- Sección 1: Carga de archivo -->
    <section class="seccion">
      <CargaArchivo 
        cargando={cargandoArchivo}
        error={errorArchivo}
        on:archivoSeleccionado={onArchivoSeleccionado}
        on:archivoRemovido={onArchivoRemovido}
      />
    </section>
    
    <!-- Sección 2: Tabla de procesos (solo si hay procesos) -->
    {#if procesos.length > 0}
      <section class="seccion">
        <TablaProcesos {procesos} />
      </section>
    {/if}
    
    <!-- Sección 3: Configuración (solo si hay procesos) -->
    {#if procesos.length > 0}
      <section class="seccion">
        <ConfiguracionPanel 
          {configuracion}
          onConfiguracionChange={onConfiguracionChange}
        />
      </section>
      
      <!-- Sección 4: Botón de ejecución -->
      <section class="seccion-ejecutar">
        <div class="panel-ejecutar">
          <!-- Resumen -->
          <div class="resumen-simulacion">
            <h3 class="resumen-titulo">Resumen de Simulación</h3>
            <div class="resumen-items">
              <div class="resumen-item">
                <span class="resumen-label">Procesos:</span>
                <span class="resumen-valor">{procesos.length}</span>
              </div>
              <div class="resumen-item">
                <span class="resumen-label">Algoritmo:</span>
                <span class="resumen-valor">{configuracion.policy}</span>
              </div>
              <div class="resumen-item">
                <span class="resumen-label">TIP:</span>
                <span class="resumen-valor">{configuracion.tip}</span>
              </div>
              <div class="resumen-item">
                <span class="resumen-label">TFP:</span>
                <span class="resumen-valor">{configuracion.tfp}</span>
              </div>
              <div class="resumen-item">
                <span class="resumen-label">TCP:</span>
                <span class="resumen-valor">{configuracion.tcp}</span>
              </div>
              {#if configuracion.policy === 'RR' && configuracion.quantum}
                <div class="resumen-item">
                  <span class="resumen-label">Quantum:</span>
                  <span class="resumen-valor">{configuracion.quantum}</span>
                </div>
              {/if}
            </div>
          </div>
          
          <!-- Errores de validación -->
          {#if !validacionConfig.valida}
            <div class="errores-validacion">
              <h4 class="errores-titulo">Corrige estos errores antes de continuar:</h4>
              <ul class="errores-lista">
                {#each validacionConfig.errores as error}
                  <li>{error}</li>
                {/each}
              </ul>
            </div>
          {/if}
          
          <!-- Error de simulación -->
          {#if errorSimulacion}
            <div class="error-simulacion">
              <span class="error-mensaje">{errorSimulacion}</span>
            </div>
          {/if}
          
          <!-- Botón de ejecución -->
          <button 
            class="boton-ejecutar"
            class:deshabilitado={!puedeEjecutar}
            class:cargando={ejecutandoSimulacion}
            on:click={ejecutar}
            disabled={!puedeEjecutar}
          >
            {#if ejecutandoSimulacion}
              <span class="spinner-boton"></span>
              Ejecutando Simulación...
            {:else}
              Iniciar Simulación
            {/if}
          </button>
        </div>
      </section>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    background: linear-gradient(135deg, var(--crema-calido), var(--blanco-tiza));
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .contenedor-principal {
    min-height: 100vh;
    padding: 0;
  }

  /* Contenido */
  .contenido {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px;
    display: grid;
    gap: 32px;
  }

  .seccion {
    width: 100%;
  }

  /* Sección de ejecución */
  .seccion-ejecutar {
    position: sticky;
    top: 24px;
    z-index: 10;
  }

  .panel-ejecutar {
    background: var(--blanco-puro);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border: 2px solid var(--turquesa-intenso);
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.95);
  }

  /* Resumen */
  .resumen-simulacion {
    margin-bottom: 20px;
  }

  .resumen-titulo {
    margin: 0 0 16px 0;
    color: var(--gris-casi-negro);
    font-size: 1.1rem;
    font-weight: 600;
  }

  .resumen-items {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }

  .resumen-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--marfil-claro);
    padding: 8px 12px;
    border-radius: 6px;
  }

  .resumen-label {
    font-weight: 600;
    color: var(--gris-casi-negro);
    font-size: 0.9rem;
  }

  .resumen-valor {
    background: var(--turquesa-intenso);
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  /* Errores de validación */
  .errores-validacion {
    background: var(--durazno-claro);
    border: 2px solid var(--coral-vibrante);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
  }

  .errores-titulo {
    margin: 0 0 12px 0;
    color: var(--rojo-elegante);
    font-size: 1rem;
    font-weight: 600;
  }

  .errores-lista {
    margin: 0;
    padding-left: 20px;
    color: var(--rojo-elegante);
  }

  .errores-lista li {
    margin-bottom: 6px;
    font-size: 0.9rem;
  }

  /* Error de simulación */
  .error-simulacion {
    background: var(--durazno-claro);
    border: 1px solid var(--coral-vibrante);
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .error-mensaje {
    color: var(--rojo-elegante);
    font-size: 0.9rem;
    font-weight: 500;
  }

  /* Botón de ejecución */
  .boton-ejecutar {
    width: 100%;
    background: linear-gradient(135deg, var(--turquesa-intenso), var(--cian-profundo));
    color: white;
    border: none;
    border-radius: 12px;
    padding: 16px 24px;
    font-size: 1.2rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    box-shadow: 0 4px 12px rgba(0, 175, 15, 0.3);
  }

  .boton-ejecutar:hover:not(.deshabilitado) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 175, 15, 0.4);
  }

  .boton-ejecutar:active:not(.deshabilitado) {
    transform: translateY(0);
  }

  .boton-ejecutar.deshabilitado {
    background: var(--gris-medio);
    cursor: not-allowed;
    box-shadow: none;
  }

  .boton-ejecutar.cargando {
    background: var(--aqua-pastel);
    cursor: wait;
  }

  .spinner-boton {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Responsive */
  @media (max-width: 768px) {

    .contenido {
      padding: 24px 16px;
      gap: 24px;
    }

    .panel-ejecutar {
      padding: 20px;
    }

    .resumen-items {
      grid-template-columns: 1fr;
    }

    .boton-ejecutar {
      font-size: 1.1rem;
      padding: 14px 20px;
    }
  }

  @media (max-width: 480px) {
    .contenido {
      padding: 20px 12px;
    }
  }
</style>