<script lang="ts">
  // Props con tipos explícitos para evitar errores TypeScript
  export let segmentos: any[] = [];
  export let tiempoTotal: number = 0;
  export let procesos: any[] = [];
  export let algoritmo: string = '';
  
  // Colores para cada tipo de evento
  const colores: {[key: string]: string} = {
    TIP: '#45B7D1',   // Azul - Tiempo Ingreso Proceso
    CPU: '#FF6B6B',   // Rojo - Ejecución en CPU
    TFP: '#96CEB4',   // Verde - Tiempo Finalización Proceso
    TCP: '#FECA57',   // Amarillo - Tiempo Cambio Proceso
    ES: '#4ECDC4'     // Turquesa - Entrada/Salida
  };

  // Ancho fijo por unidad de tiempo para mantener proporciones
  const PIXELS_POR_UNIDAD_TIEMPO = 25;

  // Función para generar las filas del Gantt (una por proceso)
  function generarFilasGantt(): any[] {
    const filas: any[] = [];
    
    procesos.forEach((proceso: any) => {
      const segmentosProceso = segmentos.filter((seg: any) => seg.process === proceso);
      
      filas.push({
        proceso: proceso,
        segmentos: segmentosProceso
      });
    });
    
    return filas;
  }

  $: filasGantt = generarFilasGantt();
  $: anchoTotal = tiempoTotal * PIXELS_POR_UNIDAD_TIEMPO;
  
  // Generar marcas de tiempo cada unidad
  function generarMarcasTiempo() {
    const marcas = [];
    for (let t = 0; t <= tiempoTotal; t++) {
      marcas.push(t);
    }
    return marcas;
  }

  $: marcasTiempo = generarMarcasTiempo();
</script>

<div class="gantt-simple">
  <h3>Diagrama de Gantt - {algoritmo}</h3>
  
  {#if segmentos.length > 0 && tiempoTotal > 0}
    <!-- Leyenda de colores -->
    <div class="leyenda">
      <h4>Leyenda:</h4>
      <div class="leyenda-items">
        <div class="leyenda-item">
          <div class="color-box" style="background: {colores.TIP}"></div>
          <span>TIP - Tiempo Ingreso Proceso</span>
        </div>
        <div class="leyenda-item">
          <div class="color-box" style="background: {colores.CPU}"></div>
          <span>CPU - Ejecución en CPU</span>
        </div>
        <div class="leyenda-item">
          <div class="color-box" style="background: {colores.TFP}"></div>
          <span>TFP - Tiempo Finalización Proceso</span>
        </div>
        <div class="leyenda-item">
          <div class="color-box" style="background: {colores.TCP}"></div>
          <span>TCP - Tiempo Cambio Proceso</span>
        </div>
        <div class="leyenda-item">
          <div class="color-box" style="background: {colores.ES}"></div>
          <span>ES - Entrada/Salida</span>
        </div>
      </div>
    </div>
    
    <!-- Contenedor con scroll horizontal -->
    <div class="gantt-scroll-container">
      <!-- Diagrama de Gantt con ancho fijo -->
      <div class="gantt-container" style="width: {anchoTotal + 120}px;">
        
        <!-- Encabezado con marcas de tiempo -->
        <div class="gantt-header">
          <div class="proceso-header">Proceso</div>
          <div class="timeline-header" style="width: {anchoTotal}px;">
            {#each marcasTiempo as tiempo}
              <div 
                class="tiempo-marca" 
                style="left: {tiempo * PIXELS_POR_UNIDAD_TIEMPO}px; width: {PIXELS_POR_UNIDAD_TIEMPO}px;"
              >
                {tiempo}
              </div>
            {/each}
          </div>
        </div>
        
        <!-- Filas de procesos -->
        {#each filasGantt as fila}
          <div class="gantt-row">
            <!-- Etiqueta del proceso -->
            <div class="proceso-label">{fila.proceso}</div>
            
            <!-- Línea de tiempo del proceso -->
            <div class="proceso-timeline" style="width: {anchoTotal}px;">
              <!-- Grid de tiempo -->
              {#each marcasTiempo.slice(0, -1) as tiempo}
                <div 
                  class="grid-line" 
                  style="left: {tiempo * PIXELS_POR_UNIDAD_TIEMPO}px;"
                ></div>
              {/each}
              
              <!-- Segmentos del proceso -->
              {#each fila.segmentos as segmento}
                {@const anchoSegmento = (segmento.tEnd - segmento.tStart) * PIXELS_POR_UNIDAD_TIEMPO}
                {@const posicionIzquierda = segmento.tStart * PIXELS_POR_UNIDAD_TIEMPO}
                {@const color = colores[segmento.kind] || '#ddd'}
                
                <div 
                  class="segmento-gantt"
                  style="
                    position: absolute;
                    left: {posicionIzquierda}px;
                    width: {anchoSegmento}px;
                    height: 30px;
                    top: 10px;
                    background: {color};
                    border: 1px solid #333;
                    border-radius: 3px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    color: #333;
                    font-weight: bold;
                    box-sizing: border-box;
                    transition: all 0.2s ease;
                  "
                  title="{segmento.process} [{segmento.tStart}-{segmento.tEnd}] ({segmento.kind})"
                >
                  <span class="segmento-texto">{segmento.kind}</span>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
    
    <!-- Lista detallada de segmentos -->
    <div class="segmentos-lista">
      <h4>Detalle de Segmentos:</h4>
      <div class="segmentos-grid">
        {#each segmentos as segmento, i}
          <div class="segmento-item" style="border-left-color: {colores[segmento.kind]}">
            <strong>{segmento.process}</strong>
            <span class="tiempo">[{segmento.tStart}-{segmento.tEnd}]</span>
            <span class="tipo" style="background: {colores[segmento.kind]}">{segmento.kind}</span>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="no-datos">
      <h4>No hay datos para mostrar</h4>
      <p>No se encontraron segmentos de simulación para generar el diagrama.</p>
    </div>
  {/if}
</div>

<style>
  .gantt-simple {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin: 16px 0;
  }
  
  .leyenda {
    margin: 16px 0;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #dee2e6;
  }
  
  .leyenda h4 {
    margin: 0 0 12px 0;
    font-size: 1rem;
    color: #495057;
  }
  
  .leyenda-items {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .leyenda-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
  }
  
  .color-box {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    border: 1px solid #333;
  }
  
  /* Contenedor con scroll horizontal */
  .gantt-scroll-container {
    overflow-x: auto;
    overflow-y: hidden;
    border: 2px solid #dee2e6;
    border-radius: 8px;
    background: white;
    margin: 20px 0;
  }
  
  /* Contenedor principal del Gantt con ancho fijo */
  .gantt-container {
    min-width: 100%;
    background: white;
  }
  
  /* Encabezado con timeline */
  .gantt-header {
    display: flex;
    background: #f8f9fa;
    border-bottom: 2px solid #dee2e6;
    height: 40px;
    position: sticky;
    top: 0;
    z-index: 2;
  }
  
  .proceso-header {
    width: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    background: #e9ecef;
    border-right: 2px solid #dee2e6;
    font-size: 0.9rem;
    position: sticky;
    left: 0;
    z-index: 3;
  }
  
  .timeline-header {
    position: relative;
    background: #f8f9fa;
    height: 100%;
  }
  
  .tiempo-marca {
    position: absolute;
    top: 0;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 500;
    color: #6c757d;
    border-right: 1px solid #dee2e6;
    box-sizing: border-box;
  }
  
  /* Filas de procesos */
  .gantt-row {
    display: flex;
    border-bottom: 1px solid #dee2e6;
    min-height: 50px;
  }
  
  .gantt-row:last-child {
    border-bottom: none;
  }
  
  .proceso-label {
    width: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    background: #f8f9fa;
    border-right: 2px solid #dee2e6;
    font-size: 0.9rem;
    color: #495057;
    position: sticky;
    left: 0;
    z-index: 1;
  }
  
  .proceso-timeline {
    position: relative;
    background: white;
    min-height: 50px;
    border-right: 1px solid #f0f0f0;
  }
  
  .grid-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: #e9ecef;
    z-index: 0;
  }
  
  /* Segmentos individuales */
  .segmento-gantt:hover {
    opacity: 0.8;
    cursor: pointer;
    transform: scale(1.05);
    z-index: 10;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }
  
  .segmento-texto {
    text-shadow: 0 1px 2px rgba(255,255,255,0.7);
    font-size: 9px;
    white-space: nowrap;
    overflow: hidden;
  }
  
  /* Lista de segmentos mejorada */
  .segmentos-lista {
    margin-top: 20px;
    background: #f8f9fa;
    border-radius: 6px;
    padding: 16px;
    border: 1px solid #dee2e6;
  }
  
  .segmentos-lista h4 {
    margin: 0 0 12px 0;
    font-size: 1rem;
    color: #495057;
  }
  
  .segmentos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 8px;
  }
  
  .segmento-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: white;
    border-radius: 4px;
    border-left: 4px solid #007bff;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    transition: background-color 0.2s ease;
  }
  
  .segmento-item:hover {
    background: #e9ecef;
  }
  
  .segmento-item .tiempo {
    color: #6c757d;
  }
  
  .segmento-item .tipo {
    padding: 2px 6px;
    border-radius: 3px;
    color: #333;
    font-weight: bold;
    font-size: 9px;
  }
  
  /* Estado sin datos */
  .no-datos {
    padding: 20px;
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    color: #721c24;
    text-align: center;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .leyenda-items {
      flex-direction: column;
      gap: 8px;
    }
    
    .gantt-simple {
      padding: 12px;
    }
    
    .proceso-header,
    .proceso-label {
      width: 80px;
      font-size: 0.8rem;
    }
    
    .tiempo-marca {
      font-size: 8px;
    }
    
    .gantt-row {
      min-height: 40px;
    }
    
    .proceso-timeline {
      min-height: 40px;
    }
    
    .segmentos-grid {
      grid-template-columns: 1fr;
    }
    
    .segmento-item {
      font-size: 10px;
      padding: 4px 8px;
    }
  }
</style>
