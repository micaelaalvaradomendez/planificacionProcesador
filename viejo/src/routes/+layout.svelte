<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/ui/styles/tokens.css';
	import './style.css';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Simulador de Planificación de Procesos</title>
	<meta name="description" content="Trabajo Práctico Integrador - Planificación del Procesador" />
</svelte:head>

<div class="app">
	<!-- Navbar -->
	<header class="navbar">
		<div class="navbar-content">
			<div class="navbar-brand">
				<h1 class="brand-title">Simulador de Planificación de Procesos</h1>
				<p class="brand-subtitle">Trabajo Práctico Integrador - Sistemas Operativos</p>
			</div>
			<nav class="navbar-nav">
				<a href="https://github.com/micaelaalvaradomendez/planificacionProcesador" 
				   target="_blank" 
				   rel="noopener noreferrer" 
				   class="nav-link github-link"
				   aria-label="Ver repositorio en GitHub">
				   Repositorio
				</a>
			</nav>
		</div>
	</header>

	<!-- Main Content -->
	<main class="main-content">
		{@render children?.()}
	</main>

	<!-- Footer -->
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
