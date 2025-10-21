<script lang="ts">
  import { procesos } from '$lib/stores/simulacion';
  import type { Proceso } from '$lib/model/proceso';
  
  $: procesosArray = $procesos;
  
  function addProcess() {
    const newPid = Math.max(0, ...procesosArray.map(p => p.pid)) + 1;
    const newProcess: Proceso = {
      pid: newPid,
      label: `P${newPid}`,
      arribo: 0,
      rafagasCPU: [1],
      prioridadBase: 10, 
      estado: 'N'
    };
    
    console.log('ProcessTableEditor: Agregando nuevo proceso:', newProcess);
    procesos.update(procs => {
      const updatedProcs = [...procs, newProcess];
      console.log('ProcessTableEditor: Lista de procesos actualizada:', updatedProcs);
      return updatedProcs;
    });
  }
  
  function removeProcess(index: number) {
    console.log(`ProcessTableEditor: Eliminando proceso en índice ${index}:`, procesosArray[index]);
    procesos.update(procs => {
      const updatedProcs = procs.filter((_, i) => i !== index);
      console.log('ProcessTableEditor: Lista de procesos actualizada:', updatedProcs);
      return updatedProcs;
    });
  }
  
  function updateProcess(index: number, field: keyof Proceso, value: any) {
    console.log(`ProcessTableEditor: Actualizando proceso ${procesosArray[index]?.pid} - ${field}:`, value);
    procesos.update(procs => {
      const updatedProcs = procs.map((p, i) => 
        i === index ? { ...p, [field]: value } : p
      );
      console.log('ProcessTableEditor: Lista de procesos actualizada:', updatedProcs);
      return updatedProcs;
    });
  }
  
  function updateRafagas(index: number, rafagasText: string) {
    const rafagas = rafagasText.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r) && r > 0);
    
    // Si hay ráfagas de 0, las convertimos a 1 automáticamente
    const originalRafagas = rafagasText.split(',').map(r => parseInt(r.trim()));
    const hadZeros = originalRafagas.some(r => r === 0);
    
    if (hadZeros) {
      // Reemplazar 0s por 1s
      const fixedRafagas = originalRafagas.map(r => isNaN(r) || r <= 0 ? 1 : r);
      console.log(`ProcessTableEditor: Ráfagas con 0 detectadas en proceso ${procesosArray[index]?.pid}, corrigiendo automáticamente:`, {
        original: originalRafagas,
        corregido: fixedRafagas
      });
      updateProcess(index, 'rafagasCPU', fixedRafagas);
      return;
    }
    
    console.log(`ProcessTableEditor: Actualizando ráfagas CPU del proceso ${procesosArray[index]?.pid}:`, rafagas);
    updateProcess(index, 'rafagasCPU', rafagas);
  }

  function updateRafagasES(index: number, rafagasESText: string) {
    const rafagasES = rafagasESText
      .split(',')
      .map(r => r.trim())
      .filter(r => r.length > 0)
      .map(r => Math.max(0, parseInt(r) || 0));
    console.log(`ProcessTableEditor: Actualizando ráfagas E/S del proceso ${procesosArray[index]?.pid}:`, rafagasES);
    updateProcess(index, 'rafagasES', rafagasES);
  }
  
  function validatePid(index: number, newPid: number) {
    const existing = procesosArray.find((p, i) => i !== index && p.pid === newPid);
    if (existing) {
      // Autoincrement para evitar duplicados
      const maxPid = Math.max(...procesosArray.map(p => p.pid));
      updateProcess(index, 'pid', maxPid + 1);
    } else {
      updateProcess(index, 'pid', newPid);
    }
  }
  
  function validatePrioridad(index: number, newPrioridad: number) {
    // Si ingresa 0, usar el valor por defecto del simulador (10)
    if (newPrioridad === 0) {
      console.log(`ProcessTableEditor: Prioridad 0 detectada en proceso ${procesosArray[index]?.pid}, usando valor por defecto (10)`);
      updateProcess(index, 'prioridadBase', 10);
    } else if (newPrioridad < 1 || newPrioridad > 10) {
      // Clamp entre 1 y 10
      const clampedValue = Math.max(1, Math.min(10, newPrioridad));
      console.log(`ProcessTableEditor: Prioridad fuera de rango en proceso ${procesosArray[index]?.pid}, ajustando a ${clampedValue}`);
      updateProcess(index, 'prioridadBase', clampedValue);
    } else {
      updateProcess(index, 'prioridadBase', newPrioridad);
    }
  }
</script>

<div class="process-editor">
  <div class="header">
    <h3>Editor de Procesos</h3>
    <button on:click={addProcess} class="add-btn">➕ Agregar Proceso</button>
  </div>
  
  {#if procesosArray.length === 0}
    <div class="empty-state">
      <p>No hay procesos cargados. Agregue procesos manualmente o importe una tanda.</p>
    </div>
  {:else}
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>PID</th>
            <th>Nombre</th>
            <th>Arribo</th>
            <th>
              Ráfagas CPU
              <br><small class="column-help">Si se ingresa 0ms, se usa 1ms por defecto</small>
            </th>
            <th>
              Ráfagas E/S
              <br><small class="column-help">Opcional</small>
            </th>
            <th>
              Prioridad
              <br><small class="column-help">Si ingresa 0, se usa 10 por defecto</small>
            </th>
            <th> </th>
          </tr>
        </thead>
        <tbody>
          {#each procesosArray as proceso, index}
            <tr>
              <td>
                <div class="number-input-container">
                  <input 
                    type="number" 
                    min="1"
                    value={proceso.pid}
                    on:input={(e) => validatePid(index, +e.currentTarget.value)}
                    class:error={procesosArray.filter(p => p.pid === proceso.pid).length > 1}
                  />
                  <div class="number-controls">
                    <button 
                      type="button" 
                      class="number-btn up" 
                      aria-label="Incrementar PID"
                      on:click={() => validatePid(index, proceso.pid + 1)}
                    ></button>
                    <button 
                      type="button" 
                      class="number-btn down" 
                      aria-label="Decrementar PID"
                      on:click={() => validatePid(index, Math.max(1, proceso.pid - 1))}
                    ></button>
                  </div>
                </div>
              </td>
              <td>
                <input 
                  type="text" 
                  value={proceso.label}
                  on:input={(e) => updateProcess(index, 'label', e.currentTarget.value)}
                />
              </td>
              <td>
                <div class="number-input-container">
                  <input 
                    type="number" 
                    min="0"
                    value={proceso.arribo}
                    on:input={(e) => updateProcess(index, 'arribo', +e.currentTarget.value)}
                    class:error={proceso.arribo < 0}
                  />
                  <div class="number-controls">
                    <button 
                      type="button" 
                      class="number-btn up" 
                      aria-label="Incrementar tiempo de arribo"
                      on:click={() => updateProcess(index, 'arribo', proceso.arribo + 1)}
                    ></button>
                    <button 
                      type="button" 
                      class="number-btn down" 
                      aria-label="Decrementar tiempo de arribo"
                      on:click={() => updateProcess(index, 'arribo', Math.max(0, proceso.arribo - 1))}
                    ></button>
                  </div>
                </div>
              </td>
              <td>
                <input 
                  type="text" 
                  value={proceso.rafagasCPU.join(', ')}
                  on:input={(e) => updateRafagas(index, e.currentTarget.value)}
                  placeholder="ej: 5, 3, 2"
                  class:error={!proceso.rafagasCPU || proceso.rafagasCPU.length === 0}
                />
              </td>
              <td>
                <input 
                  type="text" 
                  value={(proceso.rafagasES || []).join(', ')}
                  on:input={(e) => updateRafagasES(index, e.currentTarget.value)}
                  placeholder="ej: 4, 3, 5"
                  title="Ráfagas de E/S entre CPU. Si hay menos que CPU-1, se usa bloqueoES como fallback"
                />
              </td>
              <td>
                <div class="number-input-container">
                  <input 
                    type="number" 
                    min="1"
                    max="10"
                    value={proceso.prioridadBase || 10}
                    on:input={(e) => validatePrioridad(index, +e.currentTarget.value)}
                    placeholder="10"
                  />
                  <div class="number-controls">
                    <button 
                      type="button" 
                      class="number-btn up" 
                      aria-label="Incrementar prioridad"
                      on:click={() => validatePrioridad(index, Math.min(10, (proceso.prioridadBase || 10) + 1))}
                    ></button>
                    <button 
                      type="button" 
                      class="number-btn down" 
                      aria-label="Decrementar prioridad"
                      on:click={() => validatePrioridad(index, Math.max(1, (proceso.prioridadBase || 10) - 1))}
                    ></button>
                  </div>
                </div>
              </td>
              <td>
                <button 
                  on:click={() => removeProcess(index)} 
                  class="remove-btn"
                  aria-label={`Eliminar proceso ${proceso.label || proceso.pid}`}
                  title="Eliminar proceso"
                >
                  🗑️
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
  
  <div class="validation-info">
    <h4>Validaciones:</h4>
    <ul>
      <li>PIDs deben ser únicos (se autoincrementa si hay duplicados)</li>
      <li>Arribos deben ser ≥ 0</li>
      <li><strong>Ráfagas CPU deben ser > 0</strong> - Si ingresa 0, se convierte automáticamente a 1ms</li>
      <li><strong>Prioridades: rango 1-10</strong> - Si ingresa 0, se usa 10 (prioridad más baja por defecto)</li>
    </ul>
    <div class="important-note">
      <p><strong>¿Por qué no se permite 0 en ráfagas CPU?</strong></p>
      <p>El simulador requiere que cada ráfaga de CPU tenga duración > 0 para funcionar correctamente. Una ráfaga de 0ms causaría problemas en los algoritmos de planificación y métricas.</p>
      
      <p><strong>¿Por qué prioridad 0 se cambia a 10?</strong></p>
      <p>En el simulador: menor número = mayor prioridad (0 sería la más alta, 10 la más baja). Para evitar procesos con prioridad máxima accidental, el valor 0 se cambia al valor por defecto (10).</p>
    </div>
  </div>
</div>

<style>
  .process-editor {
    padding: 1.5rem;
    border: 2px solid #dde5b6;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    background: linear-gradient(135deg, white 0%, #f8f9fa 100%);
    box-shadow: 0 4px 16px rgba(63, 44, 80, 0.1);
    transition: all 0.3s ease;
  }

  .process-editor:hover {
    border-color: #c8d49a;
    box-shadow: 0 6px 24px rgba(63, 44, 80, 0.15);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .header h3 {
    margin: 0;
    color: #3f2c50;
    font-weight: bold;
    font-size: 1.2rem;
    padding-bottom: 0.75rem;
    border-bottom: 3px solid #dde5b6;
    flex-grow: 1;
    margin-right: 1rem;
  }

  .add-btn {
    padding: 0.5rem 1rem;
    background-color: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .add-btn:hover {
    background-color: #45a049;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #666;
  }

  .table-container {
    overflow-x: auto;
    margin-bottom: 1rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 0.75rem 0.5rem;
    text-align: left;
    border-bottom: 1px solid #ddd;
    vertical-align: middle;
  }

  th {
    background-color: #f5f5f5;
    font-weight: bold;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .column-help {
    font-weight: normal;
    font-size: 0.75rem;
    color: #666;
    display: block;
    margin-top: 0.25rem;
    font-style: italic;
  }

  input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.9rem;
    box-sizing: border-box;
    vertical-align: middle;
  }

  /* Estilos especiales para inputs de número con controles más grandes */
  input[type="number"] {
    padding-right: 30px;
  }

  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
  }

  /* Crear controles personalizados más grandes */
  .number-input-container {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  .number-controls {
    position: absolute;
    right: 2px;
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

  input.error {
    border-color: #d32f2f;
    background-color: #ffebee;
  }

  .remove-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
  }

  .remove-btn:hover {
    opacity: 0.7;
  }

  .validation-info {
    background-color: #f9f9f9;
    padding: 1rem;
    border-radius: 4px;
    margin-top: 1rem;
  }

  .validation-info h4 {
    margin-top: 0;
    margin-bottom: 0.5rem;
  }

  .validation-info ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .validation-info li {
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
    color: #666;
  }

  .important-note {
    margin-top: 1rem;
    padding: 0.75rem;
    background-color: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
  }

  .important-note p {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
  }

  .important-note p:last-child {
    margin-bottom: 0;
  }

  .important-note strong {
    color: #856404;
  }
</style>