<script lang="ts">
  import { simulationConfig } from '$lib/stores/simulacion';
  
  $: cfg = $simulationConfig;
  $: costos = cfg.costos || { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 25 };
  
  function setCost(key: string, value: number) {
    const newValue = Math.max(0, value);
    simulationConfig.update(c => ({
      ...c,
      costos: { ...(c.costos || { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 25 }), [key]: newValue }
    }));
  }
  
  function incrementCost(key: string, currentValue: number) {
    setCost(key, currentValue + 1);
  }
  
  function decrementCost(key: string, currentValue: number) {
    setCost(key, Math.max(0, currentValue - 1));
  }
</script>

<div class="cost-config">
  <h3>Configuración de Costos</h3>
  
  <div class="costs-grid">
    <div class="form-group">
      <label for="tip">TIP (Tiempo Ingreso Proceso):</label>
      <div class="number-input-container">
        <input 
          id="tip"
          type="number" 
          min="0" 
          value={costos.TIP}
          on:input={(e) => setCost('TIP', +e.currentTarget.value)}
          placeholder="0"
        />
        <div class="number-controls">
          <button 
            type="button" 
            class="number-btn up" 
            aria-label="Incrementar TIP"
            on:click={() => incrementCost('TIP', costos.TIP || 0)}
          ></button>
          <button 
            type="button" 
            class="number-btn down" 
            aria-label="Decrementar TIP"
            on:click={() => decrementCost('TIP', costos.TIP || 0)}
          ></button>
        </div>
      </div>
      <small>Costo de crear un proceso nuevo <strong>(Por defecto: 0 ms)</strong></small>
    </div>

    <div class="form-group">
      <label for="tcp">TCP (Tiempo Cambio Proceso):</label>
      <div class="number-input-container">
        <input 
          id="tcp"
          type="number" 
          min="0" 
          value={costos.TCP}
          on:input={(e) => setCost('TCP', +e.currentTarget.value)}
          placeholder="0"
        />
        <div class="number-controls">
          <button 
            type="button" 
            class="number-btn up" 
            aria-label="Incrementar TCP"
            on:click={() => incrementCost('TCP', costos.TCP || 0)}
          ></button>
          <button 
            type="button" 
            class="number-btn down" 
            aria-label="Decrementar TCP"
            on:click={() => decrementCost('TCP', costos.TCP || 0)}
          ></button>
        </div>
      </div>
      <small>Costo de cambio de contexto <strong>(Por defecto: 0 ms)</strong></small>
    </div>

    <div class="form-group">
      <label for="tfp">TFP (Tiempo Fin Proceso):</label>
      <div class="number-input-container">
        <input 
          id="tfp"
          type="number" 
          min="0" 
          value={costos.TFP}
          on:input={(e) => setCost('TFP', +e.currentTarget.value)}
          placeholder="0"
        />
        <div class="number-controls">
          <button 
            type="button" 
            class="number-btn up" 
            aria-label="Incrementar TFP"
            on:click={() => incrementCost('TFP', costos.TFP || 0)}
          ></button>
          <button 
            type="button" 
            class="number-btn down" 
            aria-label="Decrementar TFP"
            on:click={() => decrementCost('TFP', costos.TFP || 0)}
          ></button>
        </div>
      </div>
      <small>Costo de finalizar un proceso <strong>(Por defecto: 0 ms)</strong></small>
    </div>

    <div class="form-group">
      <label for="bloqueoES">Bloqueo E/S (Fallback):</label>
      <div class="number-input-container">
        <input 
          id="bloqueoES"
          type="number" 
          min="0" 
          value={costos.bloqueoES}
          on:input={(e) => setCost('bloqueoES', +e.currentTarget.value)}
          placeholder="25"
        />
        <div class="number-controls">
          <button 
            type="button" 
            class="number-btn up" 
            aria-label="Incrementar Bloqueo E/S"
            on:click={() => incrementCost('bloqueoES', costos.bloqueoES || 25)}
          ></button>
          <button 
            type="button" 
            class="number-btn down" 
            aria-label="Decrementar Bloqueo E/S"
            on:click={() => decrementCost('bloqueoES', costos.bloqueoES || 25)}
          ></button>
        </div>
      </div>
      <small>Fallback cuando el proceso no especifica su propio tiempo de E/S <strong>(Por defecto: 25 ms)</strong></small>
    </div>
  </div>

  <div class="info-panel">
    <p><strong>Nota:</strong> Cada proceso puede especificar su propio tiempo de E/S en el JSON (campo 'duracion_rafaga_es'). El valor de Bloqueo E/S se usa como fallback cuando no se especifica.</p>
    <p><strong>Valores por defecto del simulador:</strong> Si ingresa 0 en cualquier campo, se usará el valor por defecto correspondiente.</p>
  </div>
</div>

<style>
  .cost-config {
    padding: 1.5rem;
    border: 2px solid #dde5b6;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    background: linear-gradient(135deg, white 0%, #f8f9fa 100%);
    box-shadow: 0 4px 16px rgba(63, 44, 80, 0.1);
    transition: all 0.3s ease;
  }

  .cost-config:hover {
    border-color: #c8d49a;
    box-shadow: 0 6px 24px rgba(63, 44, 80, 0.15);
  }

  .cost-config h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    color: #3f2c50;
    font-weight: bold;
    font-size: 1.2rem;
    text-align: center;
    padding-bottom: 0.75rem;
    border-bottom: 3px solid #dde5b6;
  }

  .costs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  .form-group label {
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: #3f2c50;
    font-size: 0.95rem;
  }

  .form-group input {
    padding: 0.75rem 2.5rem 0.75rem 1rem;
    border: 2px solid #e9ecef;
    border-radius: 8px;
    margin-bottom: 0.5rem;
    font-size: 0.95rem;
    transition: all 0.3s ease;
    background-color: white;
    color: #3f2c50;
    box-sizing: border-box;
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

  .form-group input:focus {
    outline: none;
    border-color: #dde5b6;
    box-shadow: 0 0 0 3px rgba(221, 229, 182, 0.3);
  }

  .form-group small {
    color: #6c757d;
    font-size: 0.825rem;
    font-style: italic;
    font-weight: 500;
  }

  .info-panel {
    background: linear-gradient(135deg, rgba(221, 229, 182, 0.1) 0%, rgba(200, 212, 154, 0.1) 100%);
    padding: 1.25rem;
    border-radius: 8px;
    border: 2px solid rgba(221, 229, 182, 0.3);
  }

  .info-panel p {
    margin: 0;
    color: #633f6e;
    font-weight: 500;
  }

  .info-panel strong {
    color: #3f2c50;
  }
</style>