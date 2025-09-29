import { runSimulation } from '../src/lib/stores/simulacion';
import type { SimulationConfig } from '../src/lib/stores/simulacion';
import type { Proceso } from '../src/lib/model/proceso';

// Procesos de prueba típicos para la interfaz
const procesosUI: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [8, 6], rafagasES: [3], estado: 'N', prioridadBase: 2 },
  { pid: 2, arribo: 2, rafagasCPU: [4, 4], rafagasES: [2], estado: 'N', prioridadBase: 1 },
  { pid: 3, arribo: 4, rafagasCPU: [10], rafagasES: [], estado: 'N', prioridadBase: 3 }
];

const costosUI = {
  TIP: 1,
  TCP: 2, 
  TFP: 1,
  bloqueoES: 25
};

console.log('🖥️  TEST INTERFAZ - SIMULACIÓN REAL\n');

const algoritmos: Array<{ name: string, config: SimulationConfig }> = [
  { name: 'FCFS', config: { politica: 'FCFS', costos: costosUI } },
  { name: 'RR', config: { politica: 'RR', quantum: 5, costos: costosUI } },
  { name: 'SPN', config: { politica: 'SPN', costos: costosUI } },
  { name: 'SRTN', config: { politica: 'SRTN', costos: costosUI } },
  { name: 'PRIORITY', config: { politica: 'PRIORITY', costos: costosUI } }
];

for (const algo of algoritmos) {
  console.log(`=== ${algo.name} - SIMULACIÓN INTERFAZ ===`);
  
  try {
    const resultado = runSimulation(algo.config, procesosUI);
    
    // Verificar que los resultados tengan sentido
    console.log('✅ Simulación exitosa');
    console.log(`  Procesos simulados: ${resultado.metricas.porProceso.length}`);
    console.log(`  Eventos generados: ${resultado.trace.events.length}`);
    console.log(`  Slices generados: ${resultado.trace.slices.length}`);
    console.log(`  Tiempo total: ${resultado.metricas.global.tiempoTotalSimulacion}`);
    console.log(`  Context switches: ${resultado.metricas.global.cambiosDeContexto}`);
    console.log(`  Expropiaciones: ${resultado.metricas.global.expropiaciones}`);
    
    // Verificar CPU accounting
    let cpuOK = true;
    for (const proceso of procesosUI) {
      const totalSlices = resultado.trace.slices
        .filter(s => s.pid === proceso.pid)
        .reduce((sum, s) => sum + (s.end - s.start), 0);
      const totalRafagas = proceso.rafagasCPU.reduce((sum, r) => sum + r, 0);
      
      if (totalSlices !== totalRafagas) {
        console.log(`  ❌ P${proceso.pid}: CPU accounting error - slices=${totalSlices}, rafagas=${totalRafagas}`);
        cpuOK = false;
      }
    }
    
    if (cpuOK) {
      console.log('  ✅ CPU Accounting correcto');
    }
    
    // Verificar que las métricas estén calculadas
    const metricsOK = resultado.metricas.global.TRpPromedio > 0 &&
                     resultado.metricas.porProceso.every(p => p.TRp > 0);
    
    if (metricsOK) {
      console.log('  ✅ Métricas calculadas');
    } else {
      console.log('  ❌ Métricas inválidas');
    }
    
    // Mostrar algunos detalles críticos
    console.log('  Métricas por proceso:');
    for (const p of resultado.metricas.porProceso) {
      console.log(`    P${p.pid}: TRp=${p.TRp}, TE=${p.TE}, TRn=${p.TRn.toFixed(2)}`);
    }
    
  } catch (error) {
    console.log(`❌ Error en simulación: ${error}`);
    console.log(`   Stack: ${(error as Error).stack?.split('\n')[1]}`);
  }
  
  console.log('');
}

console.log('🎯 DIAGNÓSTICO FINAL:');
console.log('Si algún algoritmo falló, ese es el problema que ve la interfaz.');
console.log('Si todos pasaron pero la interfaz sigue mal, hay un problema de integración.');