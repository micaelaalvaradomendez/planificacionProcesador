<script lang="ts">
  import { simulationConfig } from '$lib/stores/simulacion';
  
  // Usar derivación reactiva más explícita
  $: cfg = $simulationConfig;
  
  function updatePolicy(politica: string) {
    simulationConfig.update(c => ({ ...c, politica: politica as any }));
  }
  
  function updateQuantum(quantum: number) {
    simulationConfig.update(c => ({ ...c, quantum }));
  }
  
  function incrementQuantum() {
    const current = cfg.quantum || 2;
    updateQuantum(current + 1);
  }
  
  function decrementQuantum() {
    const current = cfg.quantum || 2;
    updateQuantum(Math.max(1, current - 1));
  }
  
  function updateAging(field: 'step' | 'quantum', value: number) {
    simulationConfig.update(c => ({
      ...c,
      aging: { ...(c.aging || { step: 1, quantum: 4 }), [field]: value }
    }));
  }
  
  function incrementAging(field: 'step' | 'quantum') {
    const current = field === 'step' ? (cfg.aging?.step || 1) : (cfg.aging?.quantum || 4);
    updateAging(field, current + 1);
  }
  
  function decrementAging(field: 'step' | 'quantum') {
    const current = field === 'step' ? (cfg.aging?.step || 1) : (cfg.aging?.quantum || 4);
    updateAging(field, Math.max(1, current - 1));
  }
</script>

<div class="policy-selector">
  <div class="form-group">
    <label for="politica">Política de Planificación:</label>
    <select 
      id="politica" 
      value={cfg.politica}
      on:change={(e) => updatePolicy(e.currentTarget.value)}
    >
      <option value="FCFS">FCFS (First Come First Served)</option>
      <option value="RR">RR (Round Robin)</option>
      <option value="SPN">SPN (Shortest Process Next)</option>
      <option value="SRTN">SRTN (Shortest Remaining Time Next)</option>
      <option value="PRIORITY">PRIORITY (con Aging)</option>
    </select>
  </div>

  <!-- Descripción de la política seleccionada -->
  <div class="policy-description">
    {#if cfg.politica === 'FCFS'}
      <p><strong>FCFS (First Come First Served)</strong></p>
      <p>Los procesos se ejecutan en orden de llegada. No hay expropiación, cada proceso se ejecuta hasta completarse o bloquearse por E/S. Simple y justo por orden de llegada.</p>
    {:else if cfg.politica === 'RR'}
      <p><strong>RR (Round Robin)</strong></p>
      <p>Cada proceso recibe un quantum fijo de tiempo de CPU. Si no termina en ese tiempo, es expropiado y va al final de la cola. Ideal para sistemas interactivos y tiempo compartido.</p>
    {:else if cfg.politica === 'SPN'}
      <p><strong>SPN (Shortest Process Next)</strong></p>
      <p>El siguiente proceso a ejecutar es el que tenga el menor tiempo de CPU restante total. No hay expropiación. Minimiza el tiempo de espera promedio.</p>
    {:else if cfg.politica === 'SRTN'}
      <p><strong>SRTN (Shortest Remaining Time Next)</strong></p>
      <p>Versión preemptiva de SPN. Si llega un proceso con menos tiempo restante que el proceso actual, se produce expropiación inmediata. Óptimo para tiempo de respuesta.</p>
    {:else if cfg.politica === 'PRIORITY'}
      <p><strong>PRIORITY (con Aging)</strong></p>
      <p>Los procesos se ejecutan según su prioridad (menor número = mayor prioridad). Incluye aging para evitar inanición: la prioridad mejora con el tiempo de espera.</p>
    {/if}
  </div>

  {#if cfg.politica === 'RR'}
    <div class="form-group">
      <label for="quantum">Quantum <small>(Por defecto: 2)</small>:</label>
      <div class="number-input-container">
        <input 
          id="quantum"
          type="number" 
          min="1" 
          value={cfg.quantum || 2}
          on:input={(e) => updateQuantum(+e.currentTarget.value)}
          placeholder="2"
        />
        <div class="number-controls">
          <button 
            type="button" 
            class="number-btn up" 
            aria-label="Incrementar quantum"
            on:click={incrementQuantum}
          ></button>
          <button 
            type="button" 
            class="number-btn down" 
            aria-label="Decrementar quantum"
            on:click={decrementQuantum}
          ></button>
        </div>
      </div>
      {#if !cfg.quantum || cfg.quantum <= 0}
        <span class="error">RR requiere quantum > 0</span>
      {/if}
    </div>
  {/if}

  {#if cfg.politica === 'PRIORITY'}
    <div class="priority-info">
      <p><strong>Regla:</strong> Menor número = Mayor prioridad</p>
      <div class="form-group">
        <label for="aging-step">Aging Step <small>(Por defecto: 1)</small>:</label>
        <div class="number-input-container">
          <input 
            id="aging-step"
            type="number" 
            min="1" 
            value={cfg.aging?.step ?? 1}
            on:input={(e) => updateAging('step', +e.currentTarget.value)}
            placeholder="1"
          />
          <div class="number-controls">
            <button 
              type="button" 
              class="number-btn up" 
              aria-label="Incrementar aging step"
              on:click={() => incrementAging('step')}
            ></button>
            <button 
              type="button" 
              class="number-btn down" 
              aria-label="Decrementar aging step"
              on:click={() => decrementAging('step')}
            ></button>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label for="aging-quantum">Aging Quantum <small>(Por defecto: 4)</small>:</label>
        <div class="number-input-container">
          <input 
            id="aging-quantum"
            type="number" 
            min="1" 
            value={cfg.aging?.quantum ?? 4}
            on:input={(e) => updateAging('quantum', +e.currentTarget.value)}
            placeholder="4"
          />
          <div class="number-controls">
            <button 
              type="button" 
              class="number-btn up" 
              aria-label="Incrementar aging quantum"
              on:click={() => incrementAging('quantum')}
            ></button>
            <button 
              type="button" 
              class="number-btn down" 
              aria-label="Decrementar aging quantum"
              on:click={() => decrementAging('quantum')}
            ></button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .policy-selector {
    padding: 1.5rem;
    border: 2px solid #dde5b6;
    border-radius: 12px;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, white 0%, #f8f9fa 100%);
    box-shadow: 0 4px 16px rgba(63, 44, 80, 0.1);
    transition: all 0.3s ease;
  }

  .policy-selector:hover {
    border-color: #c8d49a;
    box-shadow: 0 6px 24px rgba(63, 44, 80, 0.15);
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.75rem;
    font-weight: 600;
    color: #3f2c50;
    font-size: 0.95rem;
  }

  .form-group input, .form-group select {
    width: 100%;
    padding: 0.75rem 2.5rem 0.75rem 1rem;
    border: 2px solid #e9ecef;
    border-radius: 8px;
    font-size: 0.95rem;
    transition: all 0.3s ease;
    background-color: white;
    color: #3f2c50;
    box-sizing: border-box;
  }

  .form-group select {
    padding: 0.75rem 1rem;
    cursor: pointer;
    background: linear-gradient(135deg, white 0%, #f8f9fa 100%);
  }

  .form-group input[type="number"]::-webkit-outer-spin-button,
  .form-group input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .form-group input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .number-input-container {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  .number-controls {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .number-btn {
    width: 20px;
    height: 14px;
    border: 1px solid #ccc;
    background: linear-gradient(to bottom, #f9f9f9, #e9e9e9);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    color: #555;
    user-select: none;
    border-radius: 2px;
    transition: all 0.1s ease;
  }

  .number-btn:hover {
    background: linear-gradient(to bottom, #e9e9e9, #d9d9d9);
    border-color: #999;
  }

  .number-btn:active {
    background: linear-gradient(to bottom, #d9d9d9, #c9c9c9);
    transform: scale(0.95);
  }

  .number-btn.up::before {
    content: "▲";
  }

  .number-btn.down::before {
    content: "▼";
  }

  .form-group select {
    padding: 0.75rem 1rem;
    cursor: pointer;
    background: linear-gradient(135deg, white 0%, #f8f9fa 100%);
  }

  .form-group input:focus, .form-group select:focus {
    outline: none;
    border-color: #dde5b6;
    box-shadow: 0 0 0 3px rgba(221, 229, 182, 0.3);
  }

  .error {
    color: #d32f2f;
    font-size: 0.875rem;
    margin-top: 0.5rem;
    display: block;
    font-weight: 500;
    padding: 0.5rem;
    background-color: rgba(244, 67, 54, 0.1);
    border-radius: 6px;
    border-left: 3px solid #d32f2f;
  }

  .priority-info {
    background: linear-gradient(135deg, rgba(221, 229, 182, 0.1) 0%, rgba(200, 212, 154, 0.1) 100%);
    padding: 1.25rem;
    border-radius: 8px;
    margin-top: 1rem;
    border: 1px solid rgba(221, 229, 182, 0.3);
  }

  .priority-info p {
    margin: 0 0 1rem 0;
    color: #633f6e;
    font-weight: 500;
  }

  .priority-info strong {
    color: #3f2c50;
  }

  .policy-description {
    background: linear-gradient(135deg, rgba(221, 229, 182, 0.15) 0%, rgba(200, 212, 154, 0.15) 100%);
    padding: 1.25rem;
    border-radius: 8px;
    margin-top: 1rem;
    border: 1px solid rgba(221, 229, 182, 0.4);
    border-left: 4px solid #dde5b6;
  }

  .policy-description p:first-child {
    margin: 0 0 0.75rem 0;
    color: #3f2c50;
    font-weight: 600;
    font-size: 1rem;
  }

  .policy-description p:last-child {
    margin: 0;
    color: #633f6e;
    font-weight: 500;
    line-height: 1.4;
    font-size: 0.9rem;
  }
</style>