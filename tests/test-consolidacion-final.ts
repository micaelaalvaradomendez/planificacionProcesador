/**
 * Test exhaustivo de validación tras consolidación arquitectónica
 * Verifica que la unificación de tipos eliminó phantom bugs
 */

import { AdaptadorSimuladorDominio } from '../src/lib/core/adaptadorSimuladorDominio';
import { MetricsCalculator } from '../src/lib/domain/services/MetricsCalculator';
import type { Workload } from '../src/lib/domain/types';

console.log('🧪 VALIDACIÓN POST-CONSOLIDACIÓN');
console.log('=================================');

// Test consolidado: un workload que ejercita todos los componentes
const workloadCompleto: Workload = {
  processes: [
    { id: 'A', arribo: 0, rafagasCPU: 2, duracionCPU: 3, duracionIO: 1, prioridad: 2 },
    { id: 'B', arribo: 1, rafagasCPU: 1, duracionCPU: 4, duracionIO: 0, prioridad: 1 },
    { id: 'C', arribo: 2, rafagasCPU: 3, duracionCPU: 2, duracionIO: 2, prioridad: 3 }
  ],
  config: { policy: 'SRTN', tip: 1, tfp: 1, tcp: 0.5, quantum: 2 }
};

console.log('\n📋 Ejecutando simulación consolidada...');
const adaptador = new AdaptadorSimuladorDominio(workloadCompleto);
const resultado = adaptador.ejecutar();

if (!resultado.exitoso) {
  console.log('❌ Simulación falló:', resultado.error);
  process.exit(1);
}

console.log('✅ Simulación exitosa');
console.log(`⏰ Tiempo total: ${resultado.estadoFinal.tiempoActual}`);
console.log(`🎯 Eventos generados: ${resultado.eventosInternos.length}`);

// Verificar que las métricas se calculan sin errores
const metricas = MetricsCalculator.calcularMetricasCompletas(resultado.estadoFinal);

console.log('\n📊 VALIDACIÓN DE MÉTRICAS:');
console.log(`  Procesos con métricas: ${metricas.porProceso.length}`);
console.log(`  CPU Total (estado): ${resultado.estadoFinal.contadoresCPU.procesos}`);
console.log(`  CPU Total (métricas): ${metricas.tanda.cpuProcesos}`);

// Verificar coherencia entre estado y métricas
const estadoCPU = resultado.estadoFinal.contadoresCPU.procesos;
const metricasCPU = metricas.tanda.cpuProcesos;
const coherencia = Math.abs(estadoCPU - metricasCPU) < 0.001;

console.log(`  ✅ Coherencia CPU: ${coherencia ? 'SÍ' : 'NO'} (diff: ${Math.abs(estadoCPU - metricasCPU)})`);

// Verificar que todos los procesos tienen métricas
const procesosSim = Array.from(resultado.estadoFinal.procesos.keys());
const procesosMetricas = metricas.porProceso.map(m => m.name);
const todosPresentes = procesosSim.every(p => procesosMetricas.includes(p));

console.log(`  ✅ Todos los procesos en métricas: ${todosPresentes ? 'SÍ' : 'NO'}`);

// Verificar que no hay valores undefined/NaN/null
const valoresInvalidos = metricas.porProceso.some(p => 
  isNaN(p.tiempoRetorno) || 
  isNaN(p.tiempoRetornoNormalizado) || 
  isNaN(p.tiempoEnListo) ||
  p.name === undefined ||
  p.name === null
);

console.log(`  ✅ Sin valores inválidos: ${!valoresInvalidos ? 'SÍ' : 'NO'}`);

console.log('\n📋 MÉTRICAS POR PROCESO:');
metricas.porProceso.forEach(p => {
  console.log(`  ${p.name}: TR=${p.tiempoRetorno.toFixed(2)}, TRn=${p.tiempoRetornoNormalizado.toFixed(2)}, TListo=${p.tiempoEnListo.toFixed(2)}`);
});

console.log('\n📋 MÉTRICAS DE TANDA:');
console.log(`  Tiempo retorno tanda: ${metricas.tanda.tiempoRetornoTanda.toFixed(2)}`);
console.log(`  Tiempo medio retorno: ${metricas.tanda.tiempoMedioRetorno.toFixed(2)}`);
console.log(`  CPU Procesos: ${metricas.tanda.cpuProcesos.toFixed(2)}`);
console.log(`  CPU SO: ${metricas.tanda.cpuSO.toFixed(2)}`);
console.log(`  CPU Ocioso: ${metricas.tanda.cpuOcioso.toFixed(2)}`);

// Test final: verificar que los tipos domain son consistentes
console.log('\n🔍 VERIFICACIÓN DE TIPOS:');
const procesoEjemplo = resultado.estadoFinal.procesos.get('A');
if (procesoEjemplo) {
  console.log(`  ✅ Proceso domain tiene id: ${procesoEjemplo.id !== undefined}`);
  console.log(`  ✅ Proceso domain tiene arribo: ${procesoEjemplo.arribo !== undefined}`);
  console.log(`  ✅ Proceso domain tiene duracionCPU: ${procesoEjemplo.duracionCPU !== undefined}`);
  console.log(`  ✅ Proceso domain tiene duracionIO: ${procesoEjemplo.duracionIO !== undefined}`);
} else {
  console.log('  ❌ No se encontró proceso ejemplo');
}

const todosBien = coherencia && todosPresentes && !valoresInvalidos;

console.log('\n🎯 RESULTADO FINAL:');
console.log(`${todosBien ? '✅ CONSOLIDACIÓN EXITOSA' : '❌ PROBLEMAS DETECTADOS'}`);
console.log('=================================');

if (!todosBien) {
  process.exit(1);
}