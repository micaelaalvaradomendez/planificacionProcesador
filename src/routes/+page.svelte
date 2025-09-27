<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  onMount(() => {
    // Redirigir automáticamente a la simulación
    goto('/simulacion');
  });
</script>

<svelte:head>
  <title>Simulador de Planificación de Procesos</title>
</svelte:head>

<div class="container">
  <h1>🖥️ Simulador de Planificación de Procesos</h1>
  <p>Redirigiendo a la simulación...</p>
  
  <div class="nav-links">
    <a href="/simulacion" class="nav-btn">▶️ Ir a Simulación</a>
    <a href="/resultados" class="nav-btn">📊 Ver Resultados</a>
  </div>
</div>

<style>
  .container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 2rem;
    text-align: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  h1 {
    color: #333;
    margin-bottom: 1rem;
  }

  p {
    color: #666;
    margin-bottom: 2rem;
  }

  .nav-links {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .nav-btn {
    padding: 1rem 1.5rem;
    background-color: #2196f3;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-weight: bold;
    transition: background-color 0.2s;
  }

  .nav-btn:hover {
    background-color: #1976d2;
  }
</style>
