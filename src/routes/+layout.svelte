<script lang="ts">
	import { page } from '$app/stores';
	
	let { children } = $props();
	
	const currentPath = $derived($page.url.pathname);
</script>

<svelte:head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="icon" href="/favicon.ico" />
	<title>Simulador de Planificación de Procesos</title>
</svelte:head>

<div class="app">
	<nav class="navbar">
		<div class="nav-container">
			<a href="/" class="nav-brand">
				🖥️ Planificador de Procesos
			</a>
			
			<div class="nav-links">
				<a 
					href="/simulacion" 
					class="nav-link"
					class:active={currentPath === '/simulacion'}
				>
					⚙️ Simulación
				</a>
				<a 
					href="/resultados" 
					class="nav-link"
					class:active={currentPath === '/resultados'}
				>
					📊 Resultados
				</a>
			</div>
		</div>
	</nav>

	<main class="main">
		{@render children?.()}
	</main>
	
	<footer class="footer">
		<div class="footer-content">
			<p>
				Simulador de Algoritmos de Planificación de Procesos - 
				Universidad Nacional de Tierra del Fuego
			</p>
		</div>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		background-color: #f5f5f5;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.navbar {
		background-color: #1976d2;
		color: white;
		padding: 0.75rem 0;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.nav-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.nav-brand {
		font-size: 1.25rem;
		font-weight: bold;
		color: white;
		text-decoration: none;
	}

	.nav-brand:hover {
		color: #bbdefb;
	}

	.nav-links {
		display: flex;
		gap: 1rem;
	}

	.nav-link {
		color: white;
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.nav-link:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.nav-link.active {
		background-color: rgba(255, 255, 255, 0.2);
		font-weight: bold;
	}

	.main {
		flex: 1;
		min-height: calc(100vh - 120px);
	}

	.footer {
		background-color: #333;
		color: white;
		padding: 1rem 0;
		margin-top: 2rem;
	}

	.footer-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
		text-align: center;
	}

	.footer-content p {
		margin: 0;
		font-size: 0.875rem;
		color: #ccc;
	}

	@media (max-width: 768px) {
		.nav-container {
			padding: 0 1rem;
			flex-direction: column;
			gap: 1rem;
		}

		.nav-links {
			width: 100%;
			justify-content: center;
		}
	}
</style>
