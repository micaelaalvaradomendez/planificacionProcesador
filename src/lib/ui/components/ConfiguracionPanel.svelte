<script lang="ts">
  import type { ConfiguracionSimulacion } from '$lib/application/simuladorLogic';
  
  export let configuracion: ConfiguracionSimulacion;
  export let onConfiguracionChange: (config: ConfiguracionSimulacion) => void = () => {};
  
  // Opciones de políticas
  const politicas = [
    { 
      value: 'FCFS', 
      label: 'First Come First Served (FCFS)',
      descripcion: 'Atiende procesos en orden de llegada',
      expropiativo: false
    },
    { 
      value: 'SPN', 
      label: 'Shortest Process Next (SPN)',
      descripcion: 'Prioriza procesos con menor tiempo de CPU',
      expropiativo: false
    },
    { 
      value: 'SRTN', 
      label: 'Shortest Remaining Time Next (SRTN)',
      descripcion: 'Prioriza proceso con menor tiempo restante',
      expropiativo: true
    },
    { 
      value: 'RR', 
      label: 'Round Robin (RR)',
      descripcion: 'Reparte tiempo de CPU equitativamente',
      expropiativo: true
    },
    { 
      value: 'PRIORITY', 
      label: 'Priority Scheduling',
      descripcion: 'Atiende procesos por prioridad externa',
      expropiativo: true
    }
  ];
  
  // Reactivo: actualizar configuración cuando cambian los valores
  $: {
    onConfiguracionChange(configuracion);
  }
  
  // Validaciones
  $: errores = validarConfiguracion(configuracion);
  
  function validarConfiguracion(config: ConfiguracionSimulacion): string[] {
    const errores: string[] = [];
    
    if (config.tip < 0) errores.push('TIP no puede ser negativo');
    if (config.tfp < 0) errores.push('TFP no puede ser negativo');
    if (config.tcp < 0) errores.push('TCP no puede ser negativo');
    if (config.policy === 'RR' && (!config.quantum || config.quantum < 1)) {
      errores.push('Quantum debe ser mayor a 0 para Round Robin');
    }
    
    return errores;
  }
</script>

<div class="panel-configuracion">
  <h3 class="titulo">Configuración de Simulación</h3>
  
  <!-- Selector de Política -->
  <div class="seccion">
    <h4 class="subtitulo">Algoritmo de Planificación</h4>
    <div class="politicas-grid">
      {#each politicas as politica}
        <label class="politica-card" class:seleccionada={configuracion.policy === politica.value}>
          <input 
            type="radio" 
            bind:group={configuracion.policy} 
            value={politica.value}
            class="radio-oculto"
          />
          <div class="card-header">
            <span class="politica-nombre">{politica.label}</span>
            <span class="tipo-badge" class:expropiativo={politica.expropiativo}>
              {politica.expropiativo ? 'Expropiativo' : 'No Expropiativo'}
            </span>
          </div>
          <p class="politica-descripcion">{politica.descripcion}</p>
        </label>
      {/each}
    </div>
  </div>
  
  <!-- Parámetros de Tiempo -->
  <div class="seccion">
    <h4 class="subtitulo">Parámetros de Tiempo del Sistema</h4>
    <div class="parametros-grid">
      <div class="campo">
        <label for="tip" class="label">
          TIP
        </label>
        <input 
          id="tip"
          type="number" 
          min="0" 
          step="1"
          bind:value={configuracion.tip}
          class="input-numero"
          placeholder="0"
        />
        <small class="descripcion">Tiempo de admisión al sistema</small>
      </div>
      
      <div class="campo">
        <label for="tfp" class="label">
          TFP
        </label>
        <input 
          id="tfp"
          type="number" 
          min="0" 
          step="1"
          bind:value={configuracion.tfp}
          class="input-numero"
          placeholder="0"
        />
        <small class="descripcion">Tiempo de finalización</small>
      </div>
      
      <div class="campo">
        <label for="tcp" class="label">
          TCP
        </label>
        <input 
          id="tcp"
          type="number" 
          min="0" 
          step="1"
          bind:value={configuracion.tcp}
          class="input-numero"
          placeholder="0"
        />
        <small class="descripcion">Tiempo de cambio de contexto</small>
      </div>
      
      {#if configuracion.policy === 'RR'}
        <div class="campo quantum-campo">
          <label for="quantum" class="label">
            Quantum
          </label>
          <input 
            id="quantum"
            type="number" 
            min="1" 
            step="1"
            bind:value={configuracion.quantum}
            class="input-numero quantum-input"
            placeholder="4"
            required
          />
          <small class="descripcion">requerido para RR</small>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Errores de validación -->
  {#if errores.length > 0}
    <div class="errores">
      <h4 class="errores-titulo">Errores de Configuración</h4>
      <ul class="errores-lista">
        {#each errores as error}
          <li>{error}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .panel-configuracion {
    background: var(--blanco-puro);
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid var(--celeste-suave);
  }

  .titulo {
    margin: 0 0 24px 0;
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

  .seccion {
    margin-bottom: 32px;
  }

  .seccion:last-child {
    margin-bottom: 0;
  }

  .subtitulo {
    margin: 0 0 16px 0;
    color: var(--gris-casi-negro);
    font-size: 1rem;
    font-weight: 600;
  }

  /* Políticas */
  .politicas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
  }

  .politica-card {
    border: 2px solid var(--celeste-suave);
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--blanco-tiza);
  }

  .politica-card:hover {
    border-color: var(--cian-profundo);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .politica-card.seleccionada {
    border-color: var(--turquesa-intenso);
    background: var(--marfil-claro);
  }

  .radio-oculto {
    display: none;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
    gap: 12px;
  }

  .politica-nombre {
    font-weight: 600;
    color: var(--gris-casi-negro);
    font-size: 0.95rem;
  }

  .tipo-badge {
    background: var(--aqua-pastel);
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
  }

  .tipo-badge.expropiativo {
    background: var(--coral-vibrante);
  }

  .politica-descripcion {
    margin: 0;
    color: var(--gris-medio);
    font-size: 0.85rem;
    line-height: 1.4;
  }

  /* Parámetros */
  .parametros-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
  }

  .campo {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .quantum-campo {
    grid-column: 1 / -1;
    background: var(--durazno-claro);
    padding: 16px;
    border-radius: 8px;
    border: 2px dashed var(--salmon-pastel);
  }

  .label {
    font-weight: 600;
    color: var(--gris-casi-negro);
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .input-numero {
    padding: 10px 12px;
    border: 2px solid var(--celeste-suave);
    border-radius: 6px;
    font-size: 0.9rem;
    transition: border-color 0.2s ease;
    background: var(--blanco-puro);
  }

  .input-numero:focus {
    outline: none;
    border-color: var(--turquesa-intenso);
    box-shadow: 0 0 0 3px rgba(0, 175, 15, 0.1);
  }

  .quantum-input {
    background: var(--blanco-puro);
    border-color: var(--salmon-pastel);
  }

  .quantum-input:focus {
    border-color: var(--coral-vibrante);
  }

  .descripcion {
    color: var(--gris-medio);
    font-size: 0.8rem;
    margin: 0;
  }

  /* Errores */
  .errores {
    background: var(--durazno-claro);
    border: 1px solid var(--coral-vibrante);
    border-radius: 8px;
    padding: 16px;
    margin-top: 24px;
  }

  .errores-titulo {
    margin: 0 0 12px 0;
    color: var(--rojo-elegante);
    font-size: 0.95rem;
    font-weight: 600;
  }

  .errores-lista {
    margin: 0;
    padding-left: 20px;
    color: var(--rojo-elegante);
  }

  .errores-lista li {
    margin-bottom: 4px;
    font-size: 0.9rem;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .panel-configuracion {
      padding: 16px;
    }

    .politicas-grid {
      grid-template-columns: 1fr;
    }

    .parametros-grid {
      grid-template-columns: 1fr;
    }

    .card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
  }
</style>
