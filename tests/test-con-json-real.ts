import { runSimulationFromTanda } from '../src/lib/stores/simulacion';
import type { SimulationConfig } from '../src/lib/stores/simulacion';
import * as fs from 'fs';

console.log('🧪 TEST CON DATOS REALES DE LA INTERFAZ\n');

// Cargar el JSON de ejemplo que usa la interfaz
const tandaRaw = fs.readFileSync('./examples/procesos_tanda_5p.json', 'utf8');
const tanda = JSON.parse(tandaRaw);

console.log('Datos JSON cargados:');
console.log(JSON.stringify(tanda.slice(0, 2), null, 2)); // Primeros 2 procesos

const costosUI = {
  TIP: 1,
  TCP: 2,
  TFP: 1,
  bloqueoES: 25
};

const algoritmos: Array<{ name: string, config: SimulationConfig }> = [
  { name: 'FCFS', config: { politica: 'FCFS', costos: costosUI } },
  { name: 'RR', config: { politica: 'RR', quantum: 4, costos: costosUI } },
  { name: 'SPN', config: { politica: 'SPN', costos: costosUI } },
  { name: 'SRTN', config: { politica: 'SRTN', costos: costosUI } },
  { name: 'PRIORITY', config: { politica: 'PRIORITY', costos: costosUI } }
];

for (const algo of algoritmos) {
  console.log(`\n=== ${algo.name} CON TANDA REAL ===`);
  
  try {
    const resultado = runSimulationFromTanda(algo.config, tanda);
    
    console.log('✅ Simulación exitosa');
    console.log(`  Procesos: ${resultado.metricas.porProceso.length}`);
    console.log(`  Tiempo total: ${resultado.metricas.global.tiempoTotalSimulacion} ticks`);
    console.log(`  Context switches: ${resultado.metricas.global.cambiosDeContexto}`);
    console.log(`  Expropiaciones: ${resultado.metricas.global.expropiaciones}`);
    console.log(`  TRp promedio: ${resultado.metricas.global.TRpPromedio.toFixed(2)}`);
    console.log(`  TE promedio: ${resultado.metricas.global.TEPromedio.toFixed(2)}`);
    
    // Mostrar primeros 3 procesos
    console.log('  Detalle primeros 3 procesos:');
    for (const p of resultado.metricas.porProceso.slice(0, 3)) {
      console.log(`    P${p.pid}: fin=${p.fin}, TRp=${p.TRp}, TE=${p.TE}, TRn=${p.TRn.toFixed(2)}`);
    }
    
    // Verificar que los procesos tienen las ráfagas correctas
    console.log('  Verificación CPU accounting:');
    const procesosConvertidos = resultado.trace.slices.reduce((acc, slice) => {
      if (!acc[slice.pid]) acc[slice.pid] = 0;
      acc[slice.pid] += (slice.end - slice.start);
      return acc;
    }, {} as Record<number, number>);
    
    // Para el ejemplo P1: 3 ráfagas de 5 = 15 total
    // P2: 2 ráfagas de 6 = 12 total, etc.
    const esperados: Record<number, number> = { 1: 15, 2: 12, 3: 12, 4: 12, 5: 14 }; // Calculado del JSON
    
    for (const [pid, cpuUsado] of Object.entries(procesosConvertidos)) {
      const esperado = esperados[parseInt(pid)] || 0;
      const status = cpuUsado === esperado ? '✅' : '❌';
      console.log(`    P${pid}: usado=${cpuUsado}, esperado=${esperado} ${status}`);
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error}`);
    console.log(`Stack: ${(error as Error).stack?.split('\n').slice(0, 3).join('\n')}`);
  }
}

console.log('\n🎯 RESULTADO:');
console.log('Si aquí todo está bien, el problema no está en el engine.');
console.log('Revisar la UI/visualización o datos específicos que usa la interfaz.');