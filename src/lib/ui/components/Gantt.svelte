
<script lang="ts">
	export let diagrama;
</script>

<div class="gantt-container">
	{#if diagrama && diagrama.segmentos}
		<table>
			<thead>
				<tr>
					<th>Proceso</th>
					<th>Inicio</th>
					<th>Fin</th>
					<th>Tipo</th>
				</tr>
			</thead>
			<tbody>
				{#each diagrama.segmentos as seg}
					<tr>
						<td>{seg.process}</td>
						<td>{seg.tStart}</td>
						<td>{seg.tEnd}</td>
						<td>{seg.kind}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
