<script lang="ts">
  import { parseJsonWorkload, parseCsvWorkload } from '$lib/io/parseWorkload';
  import { exportEventsCsv } from '$lib/io/exportEvents';
  import { exportMetricsJson, withPercentages } from '$lib/io/exportMetrics';
  import type { Workload, SimEvent, Metrics, Policy } from '$lib/model/types';

  let file: File | null = null;
  let mode: 'json' | 'csv' = 'json';

  // Config sólo necesario si usás CSV:
  let policy: Policy = 'FCFS';
  let tip = 0, tfp = 0, tcp = 0, quantum: number | undefined = undefined;

  let workload: Workload | null = null;
  let errors: string[] = [];
  let loaded = false;

  // Simulación todavía NO: solo I/O (Etapa 1)
  // Dejamos arreglos vacíos / de prueba para exportar:
  let events: SimEvent[] = [];
  let metrics: Metrics = {
    perProcess: [],
    batch: { batchTR: 0, avgTurnaround: 0, cpuIdle: 0, cpuOS: 0, cpuUser: 0 }
  };

  async function loadFile() {
    errors = [];
    workload = null;
    loaded = false;
    if (!file) { errors.push('Seleccioná un archivo'); return; }

    try {
      if (mode === 'json') {
        workload = await parseJsonWorkload(file);
      } else {
        workload = await parseCsvWorkload(file, { policy, tip, tfp, tcp, quantum });
      }
      loaded = true;
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  function downloadEvents() {
    const blob = exportEventsCsv(events);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'events.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function downloadMetrics() {
    const blob = exportMetricsJson(withPercentages(metrics));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'metrics.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
</script>

<div class="container p-4">
  <h1>Simulador de Planificación — Etapa 1 (Entrada/Salida)</h1>

  <div class="card p-3 my-3">
    <label>
      <strong>Formato de entrada:</strong>
      <select bind:value={mode}>
        <option value="json">JSON (recomendado)</option>
        <option value="csv">CSV/TXT (opcional)</option>
      </select>
    </label>

    {#if mode === 'csv'}
      <div class="grid" style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.5rem;margin-top:.5rem;">
        <label>Política
          <select bind:value={policy}>
            <option>FCFS</option><option>PRIORITY</option><option>RR</option><option>SPN</option><option>SRTN</option>
          </select>
        </label>
        <label>TIP <input type="number" bind:value={tip} min="0"/></label>
        <label>TFP <input type="number" bind:value={tfp} min="0"/></label>
        <label>TCP <input type="number" bind:value={tcp} min="0"/></label>
        <label>Quantum <input type="number" bind:value={quantum} min="1" placeholder="solo RR"/></label>
      </div>
    {/if}

    <div class="mt-2">
      <input type="file" accept={mode === 'json' ? '.json,application/json' : '.csv,.txt,text/csv'} on:change={(e:any)=>{file=e.target.files?.[0]||null}} />
      <button on:click={loadFile}>Cargar</button>
    </div>

    {#if errors.length}
      <div class="mt-2" style="color:#b00020;">
        <ul>{#each errors as err}<li>{err}</li>{/each}</ul>
      </div>
    {/if}
  </div>

  {#if loaded && workload}
    <div class="card p-3 my-3">
      <h2>Entrada cargada</h2>
      <p><strong>Tanda:</strong> {workload.workloadName}</p>
      <p><strong>Política:</strong> {workload.config.policy} | <strong>TIP:</strong> {workload.config.tip} | <strong>TFP:</strong> {workload.config.tfp} | <strong>TCP:</strong> {workload.config.tcp} {#if workload.config.quantum != null}| <strong>Q:</strong> {workload.config.quantum}{/if}</p>
      <table>
        <thead>
          <tr><th>Proc</th><th>Arribo</th><th>#CPU</th><th>DurCPU</th><th>DurIO</th><th>Prio</th></tr>
        </thead>
        <tbody>
          {#each workload.processes as p}
            <tr>
              <td>{p.name}</td><td>{p.arrivalTime}</td><td>{p.cpuBursts}</td><td>{p.cpuBurstDuration}</td><td>{p.ioBurstDuration}</td><td>{p.priority}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="card p-3 my-3">
      <h2>Salidas (Etapa 1 listas para usar)</h2>
      <p>Cuando integres el simulador, completará <em>events</em> y <em>metrics</em>. Por ahora, podés probar las descargas con datos vacíos para verificar formato.</p>
      <button on:click={downloadEvents}>Descargar eventos (CSV)</button>
      <button on:click={downloadMetrics}>Descargar métricas (JSON)</button>
    </div>
  {/if}
</div>

<style>
  .container { max-width: 980px; margin: 0 auto; }
  .card { border: 1px solid #e1e1e1; border-radius: 12px; }
  table { width:100%; border-collapse: collapse; }
  th, td { border: 1px solid #ddd; padding: .5rem; text-align: center; }
  th { background: #f7f7f7; }
  button { margin-right: .5rem; }
</style>

