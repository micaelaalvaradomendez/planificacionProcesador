<!-- src/lib/components/ProcessTableEditor.svelte -->
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
      estado: 'N'
    };
    
    procesos.update(procs => [...procs, newProcess]);
  }
  
  function removeProcess(index: number) {
    procesos.update(procs => procs.filter((_, i) => i !== index));
  }
  
  function updateProcess(index: number, field: keyof Proceso, value: any) {
    procesos.update(procs => 
      procs.map((p, i) => 
        i === index ? { ...p, [field]: value } : p
      )
    );
  }
  
  function updateRafagas(index: number, rafagasText: string) {
    const rafagas = rafagasText.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r) && r > 0);
    updateProcess(index, 'rafagasCPU', rafagas);
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
            <th>Ráfagas CPU</th>
            <th>Prioridad</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {#each procesosArray as proceso, index}
            <tr>
              <td>
                <input 
                  type="number" 
                  min="1"
                  value={proceso.pid}
                  on:input={(e) => validatePid(index, +e.currentTarget.value)}
                  class:error={procesosArray.filter(p => p.pid === proceso.pid).length > 1}
                />
              </td>
              <td>
                <input 
                  type="text" 
                  value={proceso.label}
                  on:input={(e) => updateProcess(index, 'label', e.currentTarget.value)}
                />
              </td>
              <td>
                <input 
                  type="number" 
                  min="0"
                  value={proceso.arribo}
                  on:input={(e) => updateProcess(index, 'arribo', +e.currentTarget.value)}
                  class:error={proceso.arribo < 0}
                />
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
                  type="number" 
                  min="1"
                  value={proceso.prioridadBase || 1}
                  on:input={(e) => updateProcess(index, 'prioridadBase', +e.currentTarget.value)}
                />
              </td>
              <td>
                <button 
                  on:click={() => removeProcess(index)} 
                  class="remove-btn"
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
      <li>Debe haber al menos una ráfaga CPU > 0</li>
      <li>Prioridades: menor número = mayor prioridad</li>
    </ul>
  </div>
</div>

<style>
  .process-editor {
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .header h3 {
    margin: 0;
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
    padding: 0.5rem;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }

  th {
    background-color: #f5f5f5;
    font-weight: bold;
  }

  input {
    width: 100%;
    padding: 0.25rem;
    border: 1px solid #ccc;
    border-radius: 2px;
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
</style>