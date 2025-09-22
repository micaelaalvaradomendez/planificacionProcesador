/**
 * TEST DE CAJA BLANCA: Métricas CPU usuario vs Sistema Operativo
 */

import { ejecutarSimulacion } from './src/lib/core/index.js';

async function testFCFSAreasCPU() {
  console.log('📊 Test FCFS: Verificando áreas CPU usuario vs SO');
  
  const workload = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 0 },
      { id: 'P2', arribo: 5, rafagasCPU: 1, duracionCPU: 8, duracionIO: 0, prioridad: 0 }
    ],
    config: { policy: 'FCFS' as const, tip: 1, tfp: 1, tcp: 1, quantum: 0 }
  };

  const resultado = await ejecutarSimulacion(workload);
  
  // Valores esperados según cálculo manual
  const cpuUsuarioEsperado = 18;  // P1: 10 + P2: 8
  const cpuSOEsperado = 6;        // 2 TIPs + 2 TCPs + 2 TFPs

  console.log(`  CPU Usuario - Esperado: ${cpuUsuarioEsperado}, Real: ${resultado.estadoFinal.contadoresCPU.procesos}`);
  console.log(`  CPU SO - Esperado: ${cpuSOEsperado}, Real: ${resultado.estadoFinal.contadoresCPU.sistemaOperativo}`);

  const cpuUsuarioOK = resultado.estadoFinal.contadoresCPU.procesos === cpuUsuarioEsperado;
  const cpuSOOK = resultado.estadoFinal.contadoresCPU.sistemaOperativo === cpuSOEsperado;

  if (cpuUsuarioOK && cpuSOOK) {
    console.log('✅ Test FCFS: Áreas CPU correctas');
    return true;
  } else {
    console.log('❌ Test FCFS: Áreas CPU incorrectas');
    return false;
  }
}

async function testRRAreasCPU() {
  console.log('📊 Test RR: Verificando TCPs de expropiación');
  
  const workload = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 6, duracionIO: 0, prioridad: 0 },
      { id: 'P2', arribo: 1, rafagasCPU: 1, duracionCPU: 4, duracionIO: 0, prioridad: 0 }
    ],
    config: { policy: 'RR' as const, tip: 1, tfp: 1, tcp: 1, quantum: 3 }
  };

  const resultado = await ejecutarSimulacion(workload);
  
  // Valores esperados para RR con expropiaciones
  const cpuUsuarioEsperado = 10;  // P1: 6 + P2: 4
  const cpuSOEsperado = 8;        // 2 TIPs + 4 TCPs + 2 TFPs

  console.log(`  CPU Usuario - Esperado: ${cpuUsuarioEsperado}, Real: ${resultado.estadoFinal.contadoresCPU.procesos}`);
  console.log(`  CPU SO - Esperado: ${cpuSOEsperado}, Real: ${resultado.estadoFinal.contadoresCPU.sistemaOperativo}`);

  const cpuUsuarioOK = resultado.estadoFinal.contadoresCPU.procesos === cpuUsuarioEsperado;
  const cpuSOOK = resultado.estadoFinal.contadoresCPU.sistemaOperativo === cpuSOEsperado;

  if (cpuUsuarioOK && cpuSOOK) {
    console.log('✅ Test RR: TCPs de expropiación contabilizados correctamente');
    return true;
  } else {
    console.log('❌ Test RR: TCPs de expropiación mal contabilizados');
    return false;
  }
}

async function main() {
  console.log('🧪 TEST CAJA BLANCA: Métricas CPU usuario vs SO');
  console.log('===============================================');

  const test1OK = await testFCFSAreasCPU();
  const test2OK = await testRRAreasCPU();

  console.log('\n🎯 RESUMEN:');
  if (test1OK && test2OK) {
    console.log('✅ TODOS LOS TESTS PASARON');
    console.log('✅ PROBLEMA #12 RESUELTO: Separación CPU usuario vs SO correcta');
  } else {
    console.log('❌ ALGUNOS TESTS FALLARON');
    console.log('❌ Hay problemas en la separación CPU usuario vs SO');
  }
}

main().catch(console.error);