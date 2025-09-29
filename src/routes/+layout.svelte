<script lang="ts">
	import { page } from '$app/stores';
	
	let { children } = $props();
	
	const currentPath = $derived($page.url.pathname);
</script>

<svelte:head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="icon" href="%sveltekit.assets%/favicon.svg" type="image/svg+xml" />
	<link rel="icon" href="%sveltekit.assets%/favicon.ico" />
	<title>Simulador de Planificación de Procesos</title>
</svelte:head>

<div class="app">
	<nav class="navbar">
		<div class="nav-container">
			<div class="brand-info">
				<h1 class="brand-title">Simulador de Planificación de Procesos</h1>
				<p class="brand-subtitle">Trabajo Práctico Integrador - Sistemas Operativos</p>
			</div>
			
			
			<div class="nav-links">
				<a href="https://github.com/micaelaalvaradomendez/planificacionProcesador" 
				   target="_blank" 
				   rel="noopener noreferrer" 
				   class="nav-link github-link"
				   aria-label="Ver repositorio en GitHub">
				   Repositorio
				</a>
			</div>
		</div>
	</nav>

	<main class="main">
		{@render children?.()}
	</main>
	
	<footer class="footer">
		<div class="footer-content">
			<p class="footer-text">
				&copy; 2025 - <strong>Micaela Alvarado Mendez</strong>
			</p>
			<p class="footer-subtitle">
				Universidad Nacional de Tierra del Fuego - Sistemas Operativos
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
		background: linear-gradient(135deg, #3f2c50 0%, #633f6e 100%);
		color: white;
		padding: 1rem 0;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		border-bottom: 3px solid #dde5b6;
	}

	.nav-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.brand-title {
		margin: 0 0 0.25rem 0;
		font-size: 1.6rem;
		font-weight: bold;
		color: #dde5b6;
		text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
	}

	.brand-subtitle {
		margin: 0;
		font-size: 0.9rem;
		color: #bdc3c7;
		font-style: italic;
	}

	.nav-links {
		display: flex;
		gap: 1rem;
	}

	.nav-link {
		color: #633f6e;
		background-color: #dde5b6;
		text-decoration: none;
		padding: 0.75rem 1.5rem;
		border-radius: 25px;
		font-weight: 600;
		font-size: 0.9rem;
		border: 2px solid #dde5b6;
		transition: all 0.3s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.nav-link:hover {
		background-color: transparent;
		color: #dde5b6;
		border-color: #dde5b6;
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}

	.brand-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.main {
		flex: 1;
		min-height: calc(100vh - 120px);
	}

	.footer {
		background: linear-gradient(135deg, #3f2c50 0%, #633f6e 100%);
		color: white;
		padding: 1rem 0;
		margin-top: 2rem;
		border-top: 3px solid #dde5b6;
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
			text-align: center;
		}

		.brand-title {
			font-size: 1.4rem;
		}

		.brand-subtitle {
			font-size: 0.8rem;
		}

		.nav-links {
			width: 100%;
			justify-content: center;
		}

		.nav-link {
			padding: 0.6rem 1.2rem;
			font-size: 0.85rem;
		}
	}
</style>
