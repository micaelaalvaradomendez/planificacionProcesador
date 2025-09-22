/**
 * Test de carga de tandas del docente
 */

import { parseJsonToWorkload } from './src/lib/infrastructure/parsers/jsonParser.js';
import { ejecutarSimulacion } from './src/lib/core/index.js';
import fs from 'fs';

async function testCargaTandaDocente() {
  console.log('🧪 TEST: Carga de tanda del docente');
  console.log('====================================');

  try {
    // Leer el archivo de ejemplo
    const contenido = fs.readFileSync('./examples/workloads/procesos_tanda_5p.json', 'utf8');
    
    // Crear un objeto File simulado para el parser
    const file = new File([contenido], 'procesos_tanda_5p.json', { type: 'application/json' });
    
    console.log('📂 Parseando archivo...');
    const workload = await parseJsonToWorkload(file);
    
    console.log('✅ Archivo parseado correctamente');
    console.log(`   Procesos encontrados: ${workload.processes.length}`);
    
    // Mostrar procesos parseados
    workload.processes.forEach(p => {
      console.log(`   - ${p.id}: arribo=${p.arribo}, CPU=${p.duracionCPU}, ráfagas=${p.rafagasCPU}, IO=${p.duracionIO}, prioridad=${p.prioridad}`);
    });
    
    // Configurar parámetros de simulación para la prueba
    workload.config = {
      policy: 'FCFS',
      tip: 1,
      tfp: 1,
      tcp: 1,
      quantum: undefined
    };
    
    console.log('\n🚀 Ejecutando simulación...');
    const resultado = await ejecutarSimulacion(workload);
    
    console.log('✅ Simulación ejecutada correctamente');
    console.log(`   Tiempo total: ${resultado.estadoFinal.tiempoActual}`);
    console.log(`   Procesos terminados: ${Array.from(resultado.estadoFinal.procesos.values()).filter(p => p.estado === 'TERMINADO').length}`);
    
    return true;
    
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.log('❌ Error en test:', mensaje);
    return false;
  }
}

async function main() {
  const exito = await testCargaTandaDocente();
  
  if (exito) {
    console.log('\n🎯 RESULTADO: ✅ Tandas del docente se cargan correctamente');
  } else {
    console.log('\n🎯 RESULTADO: ❌ Hay problemas al cargar las tandas del docente');
  }
}

main().catch(console.error);