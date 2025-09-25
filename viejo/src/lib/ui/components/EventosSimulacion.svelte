<script lang="ts">
  import type { DatosSimulacionCompleta } from '$lib/application/simuladorLogic';
  import type { SimEvent } from '$lib/domain/types';
  import { TipoEvento } from '$lib/domain/types';
  
  export let datosSimulacion: DatosSimulacionCompleta;
  
  let filtroTipo: string = 'todos';
  let filtroProceso: string = 'todos';
  let busqueda: string = '';
  let mostrarSoloTransiciones: boolean = false;
  let expandirDetalles: boolean = false;
  
  // Tipos de eventos según la consigna
  const EVENTOS_PRINCIPALES = [
    TipoEvento.JOB_LLEGA,                    // Arribo de trabajo
    TipoEvento.NUEVO_A_LISTO,               // Incorporación al sistema (tras TIP)
    TipoEvento.FIN_RAFAGA_CPU,              // Fin de ráfaga
    TipoEvento.QUANTUM_EXPIRES,             // Agotamiento quantum
    TipoEvento.IO_COMPLETA,                 // Fin de E/S
    TipoEvento.IO_INTERRUPCION_ATENDIDA,    // Atención interrupción
    TipoEvento.PROCESO_TERMINA              // Terminación proceso
  ];
  
  const TRANSICIONES_ESTADO = [
    TipoEvento.CORRIENDO_A_TERMINADO,
    TipoEvento.CORRIENDO_A_BLOQUEADO,
    TipoEvento.CORRIENDO_A_LISTO,
    TipoEvento.BLOQUEADO_A_LISTO,
    TipoEvento.NUEVO_A_LISTO,
    TipoEvento.LISTO_A_CORRIENDO
  ];
  
  // Orden de procesamiento según la consigna
  const ORDEN_PROCESAMIENTO = [
    TipoEvento.CORRIENDO_A_TERMINADO,     // 1. Corriendo a Terminado
    TipoEvento.CORRIENDO_A_BLOQUEADO,     // 2. Corriendo a Bloqueado
    TipoEvento.CORRIENDO_A_LISTO,         // 3. Corriendo a Listo
    TipoEvento.BLOQUEADO_A_LISTO,         // 4. Bloqueado a Listo
    TipoEvento.NUEVO_A_LISTO,             // 5. Nuevo a Listo
    TipoEvento.LISTO_A_CORRIENDO          // 6. Finalmente el despacho de Listo a Corriendo
  ];
  
  $: eventos = datosSimulacion?.resultados?.events || [];
  $: procesosUnicos = [...new Set(eventos.map(e => e.proceso))].sort();
  $: tiposEventosUnicos = [...new Set(eventos.map(e => e.tipo))].sort();
  
  // Función para describir eventos según la teoría
  function describirEvento(evento: SimEvent): string {
    const tipo = evento.tipo;
    const proceso = evento.proceso;
    const extra = evento.extra || '';
    
    switch (tipo) {
      case TipoEvento.JOB_LLEGA:
        return `Proceso ${proceso} arriba al sistema`;
      case TipoEvento.NUEVO_A_LISTO:
        return `Proceso ${proceso} se incorpora al sistema (NUEVO → LISTO) ${extra}`;
      case TipoEvento.DISPATCH:
        return `Dispatcher asigna CPU a proceso ${proceso} ${extra}`;
      case TipoEvento.FIN_RAFAGA_CPU:
        return `Proceso ${proceso} completa ráfaga de CPU ${extra}`;
      case TipoEvento.QUANTUM_EXPIRES:
        return `Quantum agotado para proceso ${proceso} (Round Robin) ${extra}`;
      case TipoEvento.IO_COMPLETA:
        return `Proceso ${proceso} termina operación de E/S ${extra}`;
      case TipoEvento.IO_INTERRUPCION_ATENDIDA:
        return `Atendida interrupción de E/S para proceso ${proceso} ${extra}`;
      case TipoEvento.PROCESO_TERMINA:
        return `Proceso ${proceso} termina completamente ${extra}`;
      
      // Transiciones de estado según teoría de SO
      case TipoEvento.CORRIENDO_A_TERMINADO:
        return `🔴 TRANSICIÓN: ${proceso} CORRIENDO → TERMINADO ${extra}`;
      case TipoEvento.CORRIENDO_A_BLOQUEADO:
        return `🟡 TRANSICIÓN: ${proceso} CORRIENDO → BLOQUEADO (por E/S) ${extra}`;
      case TipoEvento.CORRIENDO_A_LISTO:
        return `🟠 TRANSICIÓN: ${proceso} CORRIENDO → LISTO (expropiación) ${extra}`;
      case TipoEvento.BLOQUEADO_A_LISTO:
        return `🟢 TRANSICIÓN: ${proceso} BLOQUEADO → LISTO (fin E/S) ${extra}`;
      case TipoEvento.NUEVO_A_LISTO:
        return `🟦 TRANSICIÓN: ${proceso} NUEVO → LISTO (admisión) ${extra}`;
      case TipoEvento.LISTO_A_CORRIENDO:
        return `🟣 TRANSICIÓN: ${proceso} LISTO → CORRIENDO (dispatch) ${extra}`;
      
      default:
        return `${tipo}: Proceso ${proceso} ${extra}`;
    }
  }
  
  function obtenerIconoEvento(tipo: string): string {
    if (TRANSICIONES_ESTADO.includes(tipo as TipoEvento)) {
      switch (tipo) {
        case TipoEvento.CORRIENDO_A_TERMINADO: return '🔴';
        case TipoEvento.CORRIENDO_A_BLOQUEADO: return '🟡';
        case TipoEvento.CORRIENDO_A_LISTO: return '🟠';
        case TipoEvento.BLOQUEADO_A_LISTO: return '🟢';
        case TipoEvento.NUEVO_A_LISTO: return '🟦';
        case TipoEvento.LISTO_A_CORRIENDO: return '🟣';
        default: return 'NULL';
      }
    }
    
    switch (tipo) {
      case TipoEvento.JOB_LLEGA: return '📩';
      case TipoEvento.NUEVO_A_LISTO: return '   ';
      case TipoEvento.DISPATCH: return '🎯';
      case TipoEvento.FIN_RAFAGA_CPU: return '⚡';
      case TipoEvento.QUANTUM_EXPIRES: return '⏰';
      case TipoEvento.IO_COMPLETA: return ' ';
      case TipoEvento.IO_INTERRUPCION_ATENDIDA: return '📨';
      case TipoEvento.PROCESO_TERMINA: return '🏁';
      default: return '📝';
    }
  }
  
  function obtenerCategoriaEvento(tipo: string): string {
    if (TRANSICIONES_ESTADO.includes(tipo as TipoEvento)) {
      return 'transicion';
    }
    if (EVENTOS_PRINCIPALES.includes(tipo as TipoEvento)) {
      return 'principal';
    }
    return 'sistema';
  }
  
  function obtenerPrioridadOrden(tipo: string): number {
    const index = ORDEN_PROCESAMIENTO.indexOf(tipo as TipoEvento);
    return index !== -1 ? index : 999;
  }
  
  // Filtrar y ordenar eventos
  $: eventosFiltrados = eventos
    .filter(evento => {
      // Filtro por tipo
      if (filtroTipo !== 'todos') {
        if (filtroTipo === 'transiciones' && !TRANSICIONES_ESTADO.includes(evento.tipo as TipoEvento)) {
          return false;
        }
        if (filtroTipo === 'principales' && !EVENTOS_PRINCIPALES.includes(evento.tipo as TipoEvento)) {
          return false;
        }
        if (filtroTipo !== 'transiciones' && filtroTipo !== 'principales' && evento.tipo !== filtroTipo) {
          return false;
        }
      }
      
      // Filtro por proceso
      if (filtroProceso !== 'todos' && evento.proceso !== filtroProceso) {
        return false;
      }
      
      // Filtro de búsqueda
      if (busqueda && !describirEvento(evento).toLowerCase().includes(busqueda.toLowerCase())) {
        return false;
      }
      
      // Mostrar solo transiciones
      if (mostrarSoloTransiciones && !TRANSICIONES_ESTADO.includes(evento.tipo as TipoEvento)) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Primero por tiempo
      if (a.tiempo !== b.tiempo) {
        return a.tiempo - b.tiempo;
      }
      // Luego por orden de procesamiento según la consigna
      return obtenerPrioridadOrden(a.tipo) - obtenerPrioridadOrden(b.tipo);
    });
  
  // Agrupar eventos por tiempo
  $: eventosAgrupados = eventosFiltrados.reduce((grupos, evento) => {
    const tiempo = evento.tiempo;
    if (!grupos[tiempo]) {
      grupos[tiempo] = [];
    }
    grupos[tiempo].push(evento);
    return grupos;
  }, {} as Record<number, SimEvent[]>);
  
  $: tiempos = Object.keys(eventosAgrupados).map(Number).sort((a, b) => a - b);
</script>

<div class="panel-eventos">
  <div class="header-eventos">
    <div class="header-content">
      <h3>Eventos de la Simulación</h3>
      <p>Cronología de eventos según la teoría de Sistemas Operativos</p>
    </div>
    <div class="header-stats">
      <span class="stat-item">
        <strong>{eventos.length}</strong> eventos totales
      </span>
      <span class="stat-item">
        <strong>{eventosFiltrados.length}</strong> mostrados
      </span>
    </div>
  </div>

  <!-- Controles de filtrado -->
  <div class="controles-filtrado">
    <div class="filtros-principales">
      <div class="filtro-grupo">
        <label for="filtro-tipo">Tipo de evento:</label>
        <select id="filtro-tipo" bind:value={filtroTipo}>
          <option value="todos">Todos los eventos</option>
          <option value="transiciones">Solo transiciones de estado</option>
          <option value="principales">Eventos principales</option>
          <optgroup label="Eventos específicos">
            {#each tiposEventosUnicos as tipo}
              <option value={tipo}>{obtenerIconoEvento(tipo)} {tipo}</option>
            {/each}
          </optgroup>
        </select>
      </div>
      
      <div class="filtro-grupo">
        <label for="filtro-proceso">Proceso:</label>
        <select id="filtro-proceso" bind:value={filtroProceso}>
          <option value="todos">Todos los procesos</option>
          {#each procesosUnicos as proceso}
            <option value={proceso}>{proceso}</option>
          {/each}
        </select>
      </div>
      
      <div class="filtro-grupo">
        <label for="input-busqueda">Buscar:</label>
        <input 
          id="input-busqueda"
          type="text" 
          bind:value={busqueda} 
          placeholder="Buscar en descripciones..."
          class="input-busqueda"
        />
      </div>
    </div>
    
    <div class="opciones-vista">
      <label class="checkbox-option">
        <input type="checkbox" bind:checked={mostrarSoloTransiciones} />
        <span>Solo transiciones de estado</span>
      </label>
      <label class="checkbox-option">
        <input type="checkbox" bind:checked={expandirDetalles} />
        <span>Expandir detalles</span>
      </label>
    </div>
  </div>

  <!-- Información del orden de procesamiento -->
  <div class="info-orden">
    <h4>📚 Orden de Procesamiento de Eventos (según consigna):</h4>
    <div class="orden-lista">
      <span class="orden-item">1. 🔴 Corriendo → Terminado</span>
      <span class="orden-item">2. 🟡 Corriendo → Bloqueado</span>
      <span class="orden-item">3. 🟠 Corriendo → Listo</span>
      <span class="orden-item">4. 🟢 Bloqueado → Listo</span>
      <span class="orden-item">5. 🟦 Nuevo → Listo</span>
      <span class="orden-item">6. 🟣 Listo → Corriendo (despacho)</span>
    </div>
  </div>

  <!-- Lista de eventos -->
  <div class="contenedor-eventos">
    {#if eventosFiltrados.length === 0}
      <div class="sin-eventos">
        <h3>No hay eventos que mostrar</h3>
        <p>Ajusta los filtros para ver más eventos</p>
      </div>
    {:else}
      {#each tiempos as tiempo}
        <div class="grupo-tiempo">
          <div class="tiempo-header">
            <div class="tiempo-valor">Tiempo {tiempo}</div>
            <div class="tiempo-eventos">{eventosAgrupados[tiempo].length} evento(s)</div>
          </div>
          
          <div class="eventos-lista">
            {#each eventosAgrupados[tiempo] as evento, index}
              <div class="evento-item categoria-{obtenerCategoriaEvento(evento.tipo)}">
                <div class="evento-tiempo">
                  <span class="tiempo">{evento.tiempo}</span>
                  {#if eventosAgrupados[tiempo].length > 1}
                    <span class="orden">{index + 1}</span>
                  {/if}
                </div>
                
                <div class="evento-contenido">
                  <div class="evento-header">
                    <span class="evento-icono">{obtenerIconoEvento(evento.tipo)}</span>
                    <span class="evento-proceso">{evento.proceso}</span>
                    <span class="evento-tipo {obtenerCategoriaEvento(evento.tipo)}">{evento.tipo}</span>
                  </div>
                  
                  <div class="evento-descripcion">
                    {describirEvento(evento)}
                  </div>
                  
                  {#if expandirDetalles && evento.extra}
                    <div class="evento-detalles">
                      <strong>Detalles:</strong> {evento.extra}
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .panel-eventos {
    background: var(--blanco-puro);
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .header-eventos {
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

  .header-stats {
    display: flex;
    gap: 16px;
    flex-direction: column;
    align-items: flex-end;
  }

  .stat-item {
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .controles-filtrado {
    padding: 20px 24px;
    background: var(--blanco-tiza);
    border-bottom: 1px solid var(--gris-claro);
  }

  .filtros-principales {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }

  .filtro-grupo {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .filtro-grupo label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--gris-oscuro);
  }

  select, .input-busqueda {
    padding: 8px 12px;
    border: 1px solid var(--gris-claro);
    border-radius: 6px;
    background: var(--blanco-puro);
    font-size: 0.9rem;
    cursor: pointer;
    transition: border-color 0.3s ease;
  }

  select:focus, .input-busqueda:focus {
    outline: none;
    border-color: var(--turquesa-intenso);
    box-shadow: 0 0 0 3px rgba(44, 206, 187, 0.1);
  }

  .opciones-vista {
    display: flex;
    gap: 24px;
    margin-top: 12px;
  }

  .checkbox-option {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: var(--gris-oscuro);
    cursor: pointer;
  }

  .checkbox-option input[type="checkbox"] {
    margin: 0;
    width: 16px;
    height: 16px;
  }

  .info-orden {
    padding: 16px 24px;
    background: rgba(44, 206, 187, 0.05);
    border-bottom: 1px solid rgba(44, 206, 187, 0.2);
  }

  .info-orden h4 {
    margin: 0 0 12px 0;
    font-size: 1rem;
    color: var(--gris-oscuro);
  }

  .orden-lista {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .orden-item {
    font-size: 0.85rem;
    padding: 4px 8px;
    background: rgba(44, 206, 187, 0.1);
    border-radius: 4px;
    color: var(--gris-oscuro);
  }

  .contenedor-eventos {
    max-height: 600px;
    overflow-y: auto;
    padding: 0;
  }

  .sin-eventos {
    text-align: center;
    padding: 60px 24px;
    color: var(--gris-medio);
  }

  .sin-eventos-icono {
    font-size: 3rem;
    margin-bottom: 16px;
  }

  .sin-eventos h3 {
    margin: 0 0 8px 0;
    color: var(--gris-oscuro);
  }

  .grupo-tiempo {
    border-bottom: 1px solid var(--gris-claro);
  }

  .tiempo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 24px;
    background: rgba(44, 206, 187, 0.05);
    border-bottom: 1px solid rgba(44, 206, 187, 0.1);
    font-weight: 600;
  }

  .tiempo-valor {
    color: var(--turquesa-intenso);
    font-size: 1.1rem;
  }

  .tiempo-eventos {
    font-size: 0.9rem;
    color: var(--gris-medio);
  }

  .eventos-lista {
    padding: 0;
  }

  .evento-item {
    display: flex;
    padding: 16px 24px;
    border-bottom: 1px solid var(--gris-claro);
    transition: background-color 0.2s ease;
  }

  .evento-item:hover {
    background: rgba(44, 206, 187, 0.02);
  }

  .evento-item:last-child {
    border-bottom: none;
  }

  .evento-tiempo {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 60px;
    margin-right: 16px;
  }

  .evento-tiempo .tiempo {
    font-weight: 600;
    color: var(--turquesa-intenso);
    font-size: 0.9rem;
  }

  .evento-tiempo .orden {
    font-size: 0.75rem;
    color: var(--gris-medio);
    background: var(--gris-claro);
    padding: 2px 6px;
    border-radius: 8px;
    margin-top: 4px;
  }

  .evento-contenido {
    flex: 1;
  }

  .evento-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .evento-icono {
    font-size: 1.2rem;
  }

  .evento-proceso {
    font-weight: 600;
    color: var(--gris-oscuro);
    background: var(--gris-claro);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .evento-tipo {
    font-size: 0.8rem;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500;
  }

  .evento-tipo.transicion {
    background: rgba(255, 193, 7, 0.2);
    color: #e65100;
  }

  .evento-tipo.principal {
    background: rgba(76, 175, 80, 0.2);
    color: #2e7d32;
  }

  .evento-tipo.sistema {
    background: rgba(158, 158, 158, 0.2);
    color: #424242;
  }

  .evento-descripcion {
    color: var(--gris-oscuro);
    line-height: 1.4;
    font-size: 0.95rem;
  }

  .evento-detalles {
    margin-top: 8px;
    padding: 8px 12px;
    background: rgba(44, 206, 187, 0.05);
    border-radius: 6px;
    font-size: 0.85rem;
    color: var(--gris-medio);
  }

  .categoria-transicion {
    border-left: 4px solid #ff9800;
  }

  .categoria-principal {
    border-left: 4px solid #4caf50;
  }

  .categoria-sistema {
    border-left: 4px solid #9e9e9e;
  }

  @media (max-width: 768px) {
    .header-eventos {
      flex-direction: column;
      text-align: center;
      gap: 16px;
    }
    
    .filtros-principales {
      grid-template-columns: 1fr;
      gap: 12px;
    }
    
    .opciones-vista {
      flex-direction: column;
      gap: 12px;
    }
    
    .orden-lista {
      flex-direction: column;
      gap: 8px;
    }
    
    .evento-item {
      flex-direction: column;
      gap: 12px;
    }
    
    .evento-tiempo {
      flex-direction: row;
      justify-content: flex-start;
      gap: 12px;
      min-width: auto;
      margin-right: 0;
    }
    
    .evento-header {
      flex-wrap: wrap;
      gap: 8px;
    }
  }
</style>
