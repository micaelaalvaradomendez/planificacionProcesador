/**
 * Script para debuggear el problema de mapeo de campos
 */
import { parseJsonToWorkload } from "../../src/lib/infrastructure/parsers/jsonParser"';
import { MotorSimulacion } from '../../../src/lib/core/engine';
import { calcularMetricasCompletas } from '../../../src/lib/core/metrics';

async function debugMapeoArchivo() {
  console.log('🔍 DEBUG: Mapeo de campos en archivo JSON');
  console.log('==========================================');

  // Simular cargar el archivo que está usando la UI
  const contenidoArchivo = `[
    {
      "nombre": "P1",
      "tiempo_arribo": 0,
      "cantidad_rafagas_cpu": 2,
      "duracion_rafaga_cpu": 5,
      "duracion_rafaga_es": 3,
      "prioridad_externa": 2
    },
    {
      "nombre": "P2",
      "tiempo_arribo": 1,
      "cantidad_rafagas_cpu": 3,
      "duracion_rafaga_cpu": 6,
      "duracion_rafaga_es": 4,
      "prioridad_externa": 1
    }
  ]`;

  // Crear objeto File simulado
  const blob = new Blob([contenidoArchivo], { type: 'application/json' });
  const file = new File([blob], 'test.json', { type: 'application/json' });

  try {
    console.log('\n📄 Contenido del archivo JSON:');
    console.log(contenidoArchivo);

    console.log('\n🔧 Parseando con parseJsonToWorkload...');
    const workload = await parseJsonToWorkload(file);

    console.log('\n✅ Workload parseado:');
    console.log('Nombre:', workload.workloadName);
    console.log('Procesos:', workload.processes.length);
    
    workload.processes.forEach((proc, i) => {
      console.log(`  Proceso ${i + 1}:`);
      console.log(`    name: "${proc.name}"`);
      console.log(`    tiempoArribo: ${proc.tiempoArribo}`);
      console.log(`    rafagasCPU: ${proc.rafagasCPU}`);
      console.log(`    duracionRafagaCPU: ${proc.duracionRafagaCPU}`);
      console.log(`    duracionRafagaES: ${proc.duracionRafagaES}`);
      console.log(`    prioridad: ${proc.prioridad}`);
    });

    console.log('\n🚀 Ejecutando simulación...');
    
    // Agregar configuración requerida
    workload.config = {
      policy: 'FCFS',
      tip: 1,
      tfp: 1,
      tcp: 1
    };

    const motor = new MotorSimulacion(workload);
    const resultado = motor.ejecutar();

    console.log('\n📊 Resultado de la simulación:');
    console.log('Exitoso:', resultado.exitoso);
    console.log('Tiempo total:', resultado.estadoFinal.tiempoActual);
    console.log('Procesos en estado final:');
    
    resultado.estadoFinal.procesos.forEach(proc => {
      console.log(`  ${proc.name}: estado=${proc.estado}, finTFP=${proc.finTFP}, rafagasRestantes=${proc.rafagasRestantes}`);
    });

    console.log('\n📈 Calculando métricas...');
    const metricas = calcularMetricasCompletas(resultado.estadoFinal);

    console.log('\n📊 Métricas calculadas:');
    console.log('Por proceso:', metricas.porProceso.length);
    metricas.porProceso.forEach(metrica => {
      console.log(`  ${metrica.name}: TR=${metrica.tiempoRetorno}, TRn=${metrica.tiempoRetornoNormalizado}, terminado=${metrica.name}`);
    });

    console.log('\nTanda:');
    console.log(`  Total tiempo: ${metricas.tanda.tiempoRetornoTanda}`);
    console.log(`  CPU procesos: ${metricas.tanda.cpuProcesos}`);
    console.log(`  CPU SO: ${metricas.tanda.cpuSO}`);
    console.log(`  CPU ocioso: ${metricas.tanda.cpuOcioso}`);

    console.log('\n🎯 DIAGNÓSTICO:');
    if (metricas.porProceso.length === 0) {
      console.log('❌ PROBLEMA: No hay métricas por proceso');
      console.log('   Esto indica que los procesos no se marcaron como terminados');
    } else {
      console.log('✅ Las métricas por proceso se calcularon correctamente');
    }

    if (metricas.tanda.cpuProcesos === 0) {
      console.log('❌ PROBLEMA: CPU de procesos es 0');
      console.log('   Esto indica que no se registró tiempo de ejecución de procesos');
    } else {
      console.log('✅ Se registró tiempo de CPU de procesos correctamente');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar el debug
debugMapeoArchivo().catch(console.error);