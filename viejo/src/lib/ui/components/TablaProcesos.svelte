<script lang="ts">
  import type { ProcesoSimple } from '$lib/application/simuladorLogic';
  
  export let procesos: ProcesoSimple[] = [];
</script>

<div class="tabla-procesos">
  <h3 class="titulo">Procesos Cargados</h3>
  
  {#if procesos.length === 0}
    <div class="estado-vacio">
      <p>No hay procesos cargados</p>
      <small>Selecciona un archivo para ver los procesos aquí</small>
    </div>
  {:else}
    <div class="tabla-container">
      <table class="tabla">
        <thead>
          <tr>
            <th>Proceso</th>
            <th>Llegada</th>
            <th>Ráfaga CPU</th>
            <th>Prioridad</th>
          </tr>
        </thead>
        <tbody>
          {#each procesos as proceso, index}
            <tr class="fila-proceso" class:par={index % 2 === 0}>
              <td class="nombre-proceso">
                <span class="proceso-badge">{proceso.nombre}</span>
              </td>
              <td class="tiempo">{proceso.llegada}</td>
              <td class="tiempo">{proceso.rafaga}</td>
              <td class="prioridad">
                <span class="prioridad-badge prioridad-{proceso.prioridad}">
                  {proceso.prioridad}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      
      <div class="resumen">
        <span class="contador">
          {procesos.length} proceso{procesos.length !== 1 ? 's' : ''} cargado{procesos.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  {/if}
</div>

<style>
  .tabla-procesos {
    background: var(--blanco-puro);
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid var(--celeste-suave);
  }

  .titulo {
    margin: 0 0 20px 0;
    color: var(--gris-casi-negro);
    font-size: 1.25rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .titulo::before {
    font-size: 1.2em;
  }

  /* Estado vacío */
  .estado-vacio {
    text-align: center;
    padding: 40px 20px;
    color: var(--gris-medio);
  }

  .estado-vacio p {
    margin: 0 0 8px 0;
    font-size: 1.1rem;
    font-weight: 500;
  }

  .estado-vacio small {
    font-size: 0.9rem;
    opacity: 0.8;
  }

  /* Tabla */
  .tabla-container {
    overflow-x: auto;
  }

  .tabla {
    width: 100%;
    border-collapse: collapse;
    border-radius: 8px;
    overflow: hidden;
  }

  .tabla thead {
    background: var(--cian-profundo);
    color: white;
  }

  .tabla th {
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tabla td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--celeste-suave);
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
    background: var(--crema-calido);
  }

  /* Celdas específicas */
  .nombre-proceso {
    font-weight: 600;
  }

  .proceso-badge {
    background: var(--turquesa-intenso);
    color: white;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .tiempo {
    font-family: 'Courier New', monospace;
    color: var(--gris-casi-negro);
    font-weight: 500;
  }

  .prioridad-badge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    color: white;
  }

  /* Colores de prioridad */
  .prioridad-1 { background: var(--rojo-elegante); }
  .prioridad-2 { background: var(--coral-vibrante); }
  .prioridad-3 { background: var(--salmon-pastel); }
  .prioridad-4 { background: var(--aqua-pastel); }
  .prioridad-5 { background: var(--cian-profundo); }

  /* Prioridades altas (1-2) en rojos, medias (3) en naranjas, bajas (4-5) en verdes/azules */

  /* Resumen */
  .resumen {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--celeste-suave);
    text-align: center;
  }

  .contador {
    background: var(--durazno-claro);
    color: var(--gris-casi-negro);
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .tabla-procesos {
      padding: 16px;
    }

    .tabla th,
    .tabla td {
      padding: 8px 12px;
      font-size: 0.85rem;
    }

    .proceso-badge {
      font-size: 0.75rem;
      padding: 2px 6px;
    }
  }
</style>
