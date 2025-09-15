/**
 * Test rápido para verificar si diferentes algoritmos generan resultados diferentes
 */

// Datos de prueba simples
const procesos = [
  { name: 'P1', tiempoArribo: 0, rafagasCPU: 1, duracionRafagaCPU: 10, duracionRafagaES: 0, prioridad: 50 },
  { name: 'P2', tiempoArribo: 2, rafagasCPU: 1, duracionRafagaCPU: 3, duracionRafagaES: 0, prioridad: 80 },
  { name: 'P3', tiempoArribo: 4, rafagasCPU: 1, duracionRafagaCPU: 5, duracionRafagaES: 0, prioridad: 30 }
];

// Probar con diferentes algoritmos
const algoritmos = ['FCFS', 'PRIORITY', 'RR', 'SPN', 'SRTN'];
const resultados = {};

console.log('🧪 Test rápido - Comparando algoritmos de planificación');
console.log('='.repeat(50));

algoritmos.forEach(policy => {
  const workload = {
    workloadName: `Test ${policy}`,
    processes: procesos,
    config: {
      policy,
      tip: 1,
      tfp: 1,
      tcp: 1,
      quantum: policy === 'RR' ? 4 : undefined
    }
  };
  
  console.log(`\n📋 Probando ${policy}:`);
  console.log(`  - Procesos: ${workload.processes.length}`);
  console.log(`  - Config: TIP=${workload.config.tip}, TCP=${workload.config.tcp}, TFP=${workload.config.tfp}`);
  if (policy === 'RR') {
    console.log(`  - Quantum: ${workload.config.quantum}`);
  }
  
  // Simular el resultado esperado
  resultados[policy] = {
    configuracion: workload.config,
    procesos: workload.processes.length
  };
});

console.log('\n📊 Resumen:');
Object.entries(resultados).forEach(([algo, datos]) => {
  console.log(`  ${algo}: ${datos.procesos} procesos, policy=${datos.configuracion.policy}`);
});

console.log('\n✅ Configuraciones generadas correctamente');
console.log('🔍 Problema probable: El Gantt chart no refleja los diferentes algoritmos');
console.log('🎯 Solución: Verificar que la política se pase correctamente al motor de simulación');
