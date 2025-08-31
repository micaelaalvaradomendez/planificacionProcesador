<script lang="ts">
  export let simState: any;
</script>

{#if simState.advertencias && simState.advertencias.length > 0}
  <div class="section card">
    <h3>⚠️ Advertencias</h3>
    <ul>
      {#each simState.advertencias as adv}
        <li>{adv}</li>
      {/each}
    </ul>
  </div>
{/if}

{#if simState.estadisticasExtendidas && simState.estadisticasExtendidas.recomendaciones.length > 0}
  <div class="card p-3 my-3 recommendations-card">
    <h2>💡 Recomendaciones</h2>
    <ul class="recommendations">
      {#each simState.estadisticasExtendidas.recomendaciones as rec}
        <li>{rec}</li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .section { margin-bottom: 1.5rem; }
  .card { border: 1px solid var(--border-color, #ddd); border-radius: 12px; padding: 1rem; background: var(--bg-card, #111); }
  .recommendations-card { border-left: 4px solid #17a2b8; background: #f0faff; }
</style>
