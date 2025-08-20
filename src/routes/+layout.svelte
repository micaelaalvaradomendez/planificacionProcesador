<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { base } from '$app/paths';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<base href="{base}">
</svelte:head>

{@render children?.()}
<slot />
