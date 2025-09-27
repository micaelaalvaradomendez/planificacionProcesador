import { get } from 'svelte/store';
import { simulationConfig, procesos, simulationResult, executeSimulation, loadFixture } from '$lib/stores/simulacion';

console.log('Paso 10 — stores UI');

loadFixture('A_sinES_FCFS');   // no debe ejecutar
let ran = false;
simulationResult.subscribe(r => { if (r) ran = true; });

if (ran) throw new Error('Se ejecutó solo al cargar fixture');

simulationConfig.update(c => ({ ...c, politica: 'RR', quantum: 2 })); // no debe ejecutar
if (ran) throw new Error('Se ejecutó solo al cambiar cfg');

executeSimulation(); // ahora sí debe ejecutar
if (!ran) throw new Error('No ejecutó al llamar executeSimulation');

console.log('OK - Test Paso 10 completado');