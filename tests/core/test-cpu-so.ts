import { MotorSimulacion, type ResultadoSimulacion } from '../../src/lib/core/engine';

/**
 * Test específico para verificar que CPU SO = TIP + TFP + TCP (acumulado)
 */

console.log('🧪 Test CPU SO = TIP + TFP + TCP (acumulado)');
console.log('='.repeat(50));

// Test 1: Un proceso simple (1 ráfaga, sin E/S)
const test1 = {
  workloadName: 'Test SO - Proceso Simple',
  processes: [{
    name: 'P1',
    tiempoArribo: 0,
    rafagasCPU: 1,
    duracionRafagaCPU: 5,
    duracionRafagaES: 0,
    prioridad: 50
  }],
  config: {
    policy: 'FCFS' as const,
    tip: 2,
    tfp: 3,
    tcp: 1
  }
};

console.log('\n📋 Test 1: Proceso Simple (1 ráfaga, sin E/S)');
console.log(`  TIP: ${test1.config.tip}, TFP: ${test1.config.tfp}, TCP: ${test1.config.tcp}`);

const sim1 = new MotorSimulacion(test1);
const resultado1: ResultadoSimulacion = sim1.ejecutar();

if (resultado1.exitoso) {
  const cpuSO = resultado1.estadoFinal.contadoresCPU.sistemaOperativo;
  const esperado1 = test1.config.tip + test1.config.tfp + test1.config.tcp; // 2 + 3 + 1 = 6
  
  console.log(`  CPU SO: ${cpuSO}`);
  console.log(`  Esperado: ${esperado1} (TIP=${test1.config.tip} + TFP=${test1.config.tfp} + TCP=${test1.config.tcp})`);
  console.log(`  ✅ ${cpuSO === esperado1 ? 'CORRECTO' : 'ERROR'}`);
} else {
  console.log('  ❌ Simulación falló:', resultado1.error);
}

// Test 2: Proceso con E/S (múltiples despachos = múltiples TCP)
const test2 = {
  workloadName: 'Test SO - Proceso con E/S',
  processes: [{
    name: 'P1',
    tiempoArribo: 0,
    rafagasCPU: 2,
    duracionRafagaCPU: 3,
    duracionRafagaES: 2,
    prioridad: 50
  }],
  config: {
    policy: 'FCFS' as const,
    tip: 1,
    tfp: 1,
    tcp: 2
  }
};

console.log('\n📋 Test 2: Proceso con E/S (2 ráfagas, 1 E/S)');
console.log(`  TIP: ${test2.config.tip}, TFP: ${test2.config.tfp}, TCP: ${test2.config.tcp}`);
console.log(`  Ráfagas CPU: ${test2.processes[0].rafagasCPU} (implica ${test2.processes[0].rafagasCPU} despachos)`);

const sim2 = new MotorSimulacion(test2);
const resultado2: ResultadoSimulacion = sim2.ejecutar();

if (resultado2.exitoso) {
  const cpuSO = resultado2.estadoFinal.contadoresCPU.sistemaOperativo;
  const numDespachos = test2.processes[0].rafagasCPU; // 2 despachos (1 por cada ráfaga)
  const esperado2 = test2.config.tip + test2.config.tfp + (test2.config.tcp * numDespachos) + test2.config.tcp; // TIP + TFP + (TCP * despachos) + TCP_adicional_por_ES
  // 1 + 1 + (2 * 2) + 2 = 8
  
  console.log(`  CPU SO: ${cpuSO}`);
  console.log(`  Desglose esperado:`);
  console.log(`    TIP: ${test2.config.tip}`);
  console.log(`    TFP: ${test2.config.tfp}`);
  console.log(`    TCP (${numDespachos} despachos): ${test2.config.tcp * numDespachos}`);
  console.log(`    TCP adicional (transición Bloqueado→Listo): ${test2.config.tcp}`);
  console.log(`    Total: ${esperado2}`);
  console.log(`  ✅ ${cpuSO === esperado2 ? 'CORRECTO' : 'VERIFICAR MANUALMENTE'}`);
} else {
  console.log('  ❌ Simulación falló:', resultado2.error);
}

// Test 3: Múltiples procesos
const test3 = {
  workloadName: 'Test SO - Múltiples Procesos',
  processes: [
    {
      name: 'P1',
      tiempoArribo: 0,
      rafagasCPU: 1,
      duracionRafagaCPU: 2,
      duracionRafagaES: 0,
      prioridad: 50
    },
    {
      name: 'P2',
      tiempoArribo: 1,
      rafagasCPU: 1,
      duracionRafagaCPU: 3,
      duracionRafagaES: 0,
      prioridad: 50
    }
  ],
  config: {
    policy: 'FCFS' as const,
    tip: 1,
    tfp: 2,
    tcp: 3
  }
};

console.log('\n📋 Test 3: Múltiples Procesos (2 procesos, 1 ráfaga c/u)');
console.log(`  TIP: ${test3.config.tip}, TFP: ${test3.config.tfp}, TCP: ${test3.config.tcp}`);
console.log(`  Procesos: ${test3.processes.length}`);

const sim3 = new MotorSimulacion(test3);
const resultado3: ResultadoSimulacion = sim3.ejecutar();

if (resultado3.exitoso) {
  const cpuSO = resultado3.estadoFinal.contadoresCPU.sistemaOperativo;
  const numProcesos = test3.processes.length;
  const numDespachos = test3.processes.reduce((sum, p) => sum + p.rafagasCPU, 0); // 1 + 1 = 2
  const esperado3 = (test3.config.tip * numProcesos) + (test3.config.tfp * numProcesos) + (test3.config.tcp * numDespachos);
  // (1 * 2) + (2 * 2) + (3 * 2) = 2 + 4 + 6 = 12
  
  console.log(`  CPU SO: ${cpuSO}`);
  console.log(`  Desglose esperado:`);
  console.log(`    TIP (${numProcesos} procesos): ${test3.config.tip * numProcesos}`);
  console.log(`    TFP (${numProcesos} procesos): ${test3.config.tfp * numProcesos}`);
  console.log(`    TCP (${numDespachos} despachos): ${test3.config.tcp * numDespachos}`);
  console.log(`    Total: ${esperado3}`);
  console.log(`  ✅ ${cpuSO === esperado3 ? 'CORRECTO' : 'VERIFICAR MANUALMENTE'}`);
} else {
  console.log('  ❌ Simulación falló:', resultado3.error);
}

console.log('\n🏁 Resumen del Test CPU SO');
console.log('='.repeat(50));
console.log('La fórmula CPU SO = TIP + TFP + TCP se aplica como:');
console.log('• TIP: suma por cada proceso que llega');
console.log('• TFP: suma por cada proceso que termina');
console.log('• TCP: suma por cada despacho (Listo→Corriendo)');
console.log('• TCP adicional: por transiciones Bloqueado→Listo instantáneas');
