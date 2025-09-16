<script lang="ts">
  import { descargarTexto, descargarGanttJSON, descargarMetricas } from '$lib/infrastructure/io/fileDownloader';
  import { exportarEventosComoCSV, exportarEventosComoTXT, type ConfiguracionExportacion, DEFAULT_EXPORT_CONFIG } from '$lib/infrastructure/io/exportEvents';
  import { exportarMetricasCSV } from '$lib/infrastructure/io/exportMetrics';
  import { exportarGanttSVG, exportarGanttASCII } from '$lib/infrastructure/io/ganttExporter';
  import type { DatosSimulacionCompleta } from '$lib/application/simuladorLogic';
  
  export let datosSimulacion: DatosSimulacionCompleta;
  
  let exportando = false;
  let formatoEventos: 'CSV' | 'TXT' | 'JSON' = 'CSV';
  let formatoMetricas: 'CSV' | 'JSON' = 'CSV';
  let formatoGantt: 'JSON' | 'SVG' | 'ASCII' = 'JSON';
  let incluirHeader = true;
  let separadorCSV = ';';

  $: nombreBase = `simulacion_${datosSimulacion.configuracion.policy}_${new Date(datosSimulacion.timestamp).toISOString().slice(0, 10)}`;

  async function exportarEventos() {
    try {
      exportando = true;
      const eventos = datosSimulacion.resultados.events;
      const config: ConfiguracionExportacion = {
        ...DEFAULT_EXPORT_CONFIG,
        formato: formatoEventos,
        incluirHeader,
        separadorCSV
      };

      switch (formatoEventos) {
        case 'CSV':
          const blobCSV = exportarEventosComoCSV(eventos, config);
          descargarBlob(blobCSV, `${nombreBase}_eventos.csv`);
          break;
        case 'TXT':
          const blobTXT = exportarEventosComoTXT(eventos, config);
          descargarBlob(blobTXT, `${nombreBase}_eventos.txt`);
          break;
        case 'JSON':
          const json = JSON.stringify(eventos, null, 2);
          descargarTexto(json, `${nombreBase}_eventos.json`);
          break;
      }
    } catch (error) {
      console.error('Error al exportar eventos:', error);
      alert('Error al exportar eventos. Revisa la consola para más detalles.');
    } finally {
      exportando = false;
    }
  }

  async function exportarMetricas() {
    try {
      exportando = true;
      const metricas = datosSimulacion.resultados.metrics;

      switch (formatoMetricas) {
        case 'CSV':
          const csvContent = exportarMetricasCSV(metricas);
          descargarTexto(csvContent, `${nombreBase}_metricas.csv`);
          break;
        case 'JSON':
          descargarMetricas(metricas, nombreBase);
          break;
      }
    } catch (error) {
      console.error('Error al exportar métricas:', error);
      alert('Error al exportar métricas. Revisa la consola para más detalles.');
    } finally {
      exportando = false;
    }
  }

  async function exportarGantt() {
    try {
      exportando = true;
      const gantt = datosSimulacion.resultados.gantt;
      
      if (!gantt) {
        alert('No hay datos de diagrama de Gantt para exportar.');
        return;
      }

      switch (formatoGantt) {
        case 'JSON':
          descargarGanttJSON(gantt, nombreBase);
          break;
        case 'SVG':
          const svg = exportarGanttSVG(gantt);
          descargarTexto(svg, `${nombreBase}_gantt.svg`);
          break;
        case 'ASCII':
          const ascii = exportarGanttASCII(gantt);
          descargarTexto(ascii, `${nombreBase}_gantt.txt`);
          break;
      }
    } catch (error) {
      console.error('Error al exportar Gantt:', error);
      alert('Error al exportar diagrama de Gantt. Revisa la consola para más detalles.');
    } finally {
      exportando = false;
    }
  }

  async function exportarTodo() {
    exportando = true;
    try {
      await exportarEventos();
      await new Promise(resolve => setTimeout(resolve, 500)); // Pequeña pausa
      await exportarMetricas();
      await new Promise(resolve => setTimeout(resolve, 500));
      await exportarGantt();
      alert('✅ Exportación completa realizada con éxito');
    } catch (error) {
      console.error('Error en exportación completa:', error);
      alert('❌ Error durante la exportación completa');
    } finally {
      exportando = false;
    }
  }

  function descargarBlob(blob: Blob, nombreArchivo: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(a.href);
  }
</script>

<div class="panel-exportacion">
  <div class="header-exportacion">
    <div class="header-content">
      <h3>💾 Exportación de Datos</h3>
      <p>Descarga los resultados de la simulación en diferentes formatos</p>
    </div>
    <button 
      class="btn-export-all"
      on:click={exportarTodo}
      disabled={exportando}
    >
      📦 Exportar Todo
    </button>
  </div>

  <div class="opciones-exportacion">
    <!-- Eventos -->
    <div class="grupo-exportacion">
      <div class="grupo-header">
        <h4>📋 Archivo de Eventos</h4>
        <p>Cronología completa de eventos durante la simulación</p>
      </div>
      
      <div class="configuracion-export">
        <div class="formato-selector">
          <label>
            <span>Formato:</span>
            <select bind:value={formatoEventos}>
              <option value="CSV">CSV - Datos tabulares</option>
              <option value="TXT">TXT - Texto legible</option>
              <option value="JSON">JSON - Estructura completa</option>
            </select>
          </label>
        </div>

        {#if formatoEventos === 'CSV'}
          <div class="opciones-csv">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={incluirHeader} />
              <span>Incluir encabezados</span>
            </label>
            <label>
              <span>Separador:</span>
              <select bind:value={separadorCSV}>
                <option value=";">Punto y coma (;)</option>
                <option value=",">Coma (,)</option>
                <option value="\t">Tabulación</option>
              </select>
            </label>
          </div>
        {/if}

        <button 
          class="btn-exportar"
          on:click={exportarEventos}
          disabled={exportando}
        >
          📄 Exportar Eventos
        </button>
      </div>
    </div>

    <!-- Métricas -->
    <div class="grupo-exportacion">
      <div class="grupo-header">
        <h4>📊 Tabla de Métricas</h4>
        <p>Estadísticas y métricas calculadas de la simulación</p>
      </div>
      
      <div class="configuracion-export">
        <div class="formato-selector">
          <label>
            <span>Formato:</span>
            <select bind:value={formatoMetricas}>
              <option value="CSV">CSV - Para análisis</option>
              <option value="JSON">JSON - Datos completos</option>
            </select>
          </label>
        </div>

        <button 
          class="btn-exportar"
          on:click={exportarMetricas}
          disabled={exportando}
        >
          📈 Exportar Métricas
        </button>
      </div>
    </div>

    <!-- Diagrama de Gantt -->
    <div class="grupo-exportacion">
      <div class="grupo-header">
        <h4>📅 Diagrama de Gantt</h4>
        <p>Cronograma visual de la ejecución de procesos</p>
      </div>
      
      <div class="configuracion-export">
        <div class="formato-selector">
          <label>
            <span>Formato:</span>
            <select bind:value={formatoGantt}>
              <option value="JSON">JSON - Datos estructurados</option>
              <option value="SVG">SVG - Imagen vectorial</option>
              <option value="ASCII">ASCII - Texto visual</option>
            </select>
          </label>
        </div>

        <button 
          class="btn-exportar"
          on:click={exportarGantt}
          disabled={exportando || !datosSimulacion.resultados.gantt}
        >
          📅 Exportar Gantt
        </button>
      </div>
    </div>
  </div>

  {#if exportando}
    <div class="estado-exportacion">
      <div class="spinner-export"></div>
      <span>Generando archivo...</span>
    </div>
  {/if}
</div>

<style>
  .panel-exportacion {
    background: var(--blanco-puro);
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .header-exportacion {
    background: linear-gradient(135deg, var(--turquesa-intenso) 0%, var(--cian-profundo) 100%);
    color: var(--blanco-puro);
    padding: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
  }

  .header-content h3 {
    margin: 0 0 8px 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .header-content p {
    margin: 0;
    opacity: 0.9;
    font-size: 0.95rem;
  }

  .btn-export-all {
    background: rgba(255, 255, 255, 0.2);
    color: var(--blanco-puro);
    border: 2px solid rgba(255, 255, 255, 0.3);
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-export-all:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
  }

  .btn-export-all:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .opciones-exportacion {
    padding: 24px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 24px;
  }

  .grupo-exportacion {
    border: 1px solid var(--gris-claro);
    border-radius: 12px;
    padding: 20px;
    background: var(--blanco-tiza);
    transition: all 0.3s ease;
  }

  .grupo-exportacion:hover {
    border-color: var(--turquesa-intenso);
    box-shadow: 0 4px 12px rgba(44, 206, 187, 0.1);
  }

  .grupo-header h4 {
    margin: 0 0 8px 0;
    color: var(--gris-oscuro);
    font-size: 1.1rem;
    font-weight: 600;
  }

  .grupo-header p {
    margin: 0 0 16px 0;
    color: var(--gris-medio);
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .configuracion-export {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .formato-selector label,
  .opciones-csv label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.9rem;
    color: var(--gris-oscuro);
    font-weight: 500;
  }

  .opciones-csv {
    display: flex;
    gap: 16px;
    padding: 12px;
    background: rgba(44, 206, 187, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(44, 206, 187, 0.2);
  }

  .checkbox-label {
    flex-direction: row !important;
    align-items: center;
    gap: 8px !important;
  }

  .checkbox-label input[type="checkbox"] {
    margin: 0;
    width: 16px;
    height: 16px;
  }

  select {
    padding: 8px 12px;
    border: 1px solid var(--gris-claro);
    border-radius: 6px;
    background: var(--blanco-puro);
    font-size: 0.9rem;
    cursor: pointer;
    transition: border-color 0.3s ease;
  }

  select:focus {
    outline: none;
    border-color: var(--turquesa-intenso);
    box-shadow: 0 0 0 3px rgba(44, 206, 187, 0.1);
  }

  .btn-exportar {
    background: var(--turquesa-intenso);
    color: var(--blanco-puro);
    border: none;
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    align-self: flex-start;
  }

  .btn-exportar:hover:not(:disabled) {
    background: var(--cian-profundo);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(44, 206, 187, 0.3);
  }

  .btn-exportar:disabled {
    background: var(--gris-claro);
    color: var(--gris-medio);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .estado-exportacion {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 16px;
    background: rgba(44, 206, 187, 0.1);
    border-top: 1px solid rgba(44, 206, 187, 0.2);
    color: var(--turquesa-intenso);
    font-weight: 600;
  }

  .spinner-export {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(44, 206, 187, 0.3);
    border-top: 2px solid var(--turquesa-intenso);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .header-exportacion {
      flex-direction: column;
      text-align: center;
      gap: 16px;
    }
    
    .opciones-exportacion {
      grid-template-columns: 1fr;
      padding: 16px;
    }
    
    .opciones-csv {
      flex-direction: column;
      gap: 12px;
    }
  }
</style>
