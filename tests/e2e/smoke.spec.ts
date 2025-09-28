import { test, expect } from '@playwright/test';

test('smoke test - cargar páginas principales', async ({ page }) => {
  // Página de simulación
  await page.goto('/simulacion');
  await expect(page.getByText('Configuración de Simulación')).toBeVisible();
  
  // Página de inicio
  await page.goto('/');
  await expect(page.getByText('Simulador de Planificación')).toBeVisible();
});

test('flujo básico de simulación', async ({ page }) => {
  await page.goto('/simulacion');
  
  // Verificar que hay elementos básicos de la interfaz
  await expect(page.getByText('Política')).toBeVisible();
  await expect(page.getByText('Costos')).toBeVisible();
  await expect(page.getByText('Procesos')).toBeVisible();
  
  // Verificar que el botón de simular existe (puede estar deshabilitado)
  await expect(page.getByRole('button', { name: /simular/i })).toBeVisible();
});

test('página de resultados sin datos', async ({ page }) => {
  await page.goto('/resultados');
  
  // Debe mostrar mensaje de "no hay resultados" o similar
  await expect(page.getByText(/no hay resultado/i)).toBeVisible();
  
  // Debe tener botón para ir a simulación
  await expect(page.getByRole('button', { name: /simulación/i })).toBeVisible();
});