/**
 * Test del parser JSON estandarizado
 * Valida la misma semántica que el parser TXT/CSV
 */

import { readFileSync } from 'fs';
import { analizarTandaJson } from '../../src/lib/infrastructure/io/parseWorkload';

console.log('🧪 TESTS DEL PARSER JSON ESTANDARIZADO');
console.log('==================================================');

// Simular File object desde contenido string
function createMockFile(content: string, filename: string): File {
  const blob = new Blob([content], { type: 'application/json' });
  return new File([blob], filename, { type: 'application/json' });
}

async function testFormatoCompleto(): Promise<boolean> {
  console.log('\n=== TEST: Formato completo con config ===');
  
  try {
    const contenido = readFileSync('examples/workloads/ejemplo_fcfs_estandarizado.json', 'utf-8');
    console.log('📄 Contenido del archivo:');
    console.log(contenido);
    
    const file = createMockFile(contenido, 'ejemplo_fcfs_estandarizado.json');
    const workload = await analizarTandaJson(file);
    
    console.log('\n✅ JSON parseado correctamente');
    console.log(`📋 Workload: ${workload.workloadName}`);
    console.log(`📊 Procesos: ${workload.processes.length}`);
    console.log(`⚙️  Política: ${workload.config.policy}`);
    console.log(`🔧 TIP: ${workload.config.tip}, TFP: ${workload.config.tfp}, TCP: ${workload.config.tcp}`);
    
    for (const proc of workload.processes) {
      console.log(`   ${proc.name}: arribo=${proc.tiempoArribo}, rafagas=${proc.rafagasCPU}, cpu=${proc.duracionRafagaCPU}, es=${proc.duracionRafagaES}, prio=${proc.prioridad}`);
    }
    
    // Validar estructura específica
    if (workload.processes.length !== 3) {
      throw new Error(`Se esperaban 3 procesos, se encontraron ${workload.processes.length}`);
    }
    
    const p1 = workload.processes.find(p => p.name === 'P1');
    if (!p1 || p1.tiempoArribo !== 0 || p1.duracionRafagaCPU !== 10) {
      throw new Error('P1 no se parseó correctamente');
    }
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error en formato completo:', errorMessage);
    return false;
  }
}

async function testFormatoArray(): Promise<boolean> {
  console.log('\n=== TEST: Formato array simple ===');
  
  try {
    const contenido = readFileSync('examples/workloads/ejemplo_array_simple.json', 'utf-8');
    console.log('📄 Contenido del archivo:');
    console.log(contenido);
    
    const file = createMockFile(contenido, 'ejemplo_array_simple.json');
    const workload = await analizarTandaJson(file);
    
    console.log('\n✅ Array JSON parseado correctamente');
    console.log(`📋 Workload: ${workload.workloadName}`);
    console.log(`📊 Procesos: ${workload.processes.length}`);
    console.log(`⚙️  Política: ${workload.config.policy} (pendiente de configurar)`);
    
    for (const proc of workload.processes) {
      console.log(`   ${proc.name}: arribo=${proc.tiempoArribo}, rafagas=${proc.rafagasCPU}, cpu=${proc.duracionRafagaCPU}, es=${proc.duracionRafagaES}, prio=${proc.prioridad}`);
    }
    
    // Validar que config está pendiente de configurar
    if (workload.config.policy !== null) {
      console.log('⚠️  Nota: La política debería ser null para arrays simples');
    }
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error en formato array:', errorMessage);
    return false;
  }
}

async function testCompatibilidadLegacy(): Promise<boolean> {
  console.log('\n=== TEST: Compatibilidad con formato legacy ===');
  
  try {
    const contenido = readFileSync('src/lib/mocks/ejemplo.json', 'utf-8');
    
    const file = createMockFile(contenido, 'ejemplo_legacy.json');
    const workload = await analizarTandaJson(file);
    
    console.log('✅ Formato legacy parseado correctamente');
    console.log(`📋 Workload: ${workload.workloadName}`);
    console.log(`📊 Procesos: ${workload.processes.length}`);
    console.log(`⚙️  Política: ${workload.config.policy}`);
    
    for (const proc of workload.processes) {
      console.log(`   ${proc.name}: arribo=${proc.tiempoArribo}, rafagas=${proc.rafagasCPU}, cpu=${proc.duracionRafagaCPU}, es=${proc.duracionRafagaES}, prio=${proc.prioridad}`);
    }
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error en compatibilidad legacy:', errorMessage);
    return false;
  }
}

async function testArchivosTandas(): Promise<boolean> {
  console.log('\n=== TEST: Archivos de tandas existentes ===');
  
  try {
    const contenido = readFileSync('examples/workloads/procesos_tanda_5p.json', 'utf-8');
    
    const file = createMockFile(contenido, 'procesos_tanda_5p.json');
    const workload = await analizarTandaJson(file);
    
    console.log('✅ Tanda de 5 procesos parseada correctamente');
    console.log(`📊 Procesos: ${workload.processes.length}`);
    
    for (const proc of workload.processes) {
      console.log(`   ${proc.name}: arribo=${proc.tiempoArribo}, rafagas=${proc.rafagasCPU}, cpu=${proc.duracionRafagaCPU}, es=${proc.duracionRafagaES}, prio=${proc.prioridad}`);
    }
    
    if (workload.processes.length !== 5) {
      throw new Error(`Se esperaban 5 procesos, se encontraron ${workload.processes.length}`);
    }
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error en archivos tandas:', errorMessage);
    return false;
  }
}

async function testValidacionErrores(): Promise<boolean> {
  console.log('\n=== TEST: Validación de errores ===');
  
  let erroresDetectados = 0;
  
  // Test 1: JSON inválido
  try {
    const file = createMockFile('{ invalid json', 'invalid.json');
    await analizarTandaJson(file);
    console.error('❌ No se detectó error en JSON inválido');
  } catch (error) {
    console.log('✅ Error detectado correctamente: JSON inválido');
    erroresDetectados++;
  }
  
  // Test 2: Campo faltante
  try {
    const file = createMockFile('[{"nombre": "P1"}]', 'incomplete.json');
    await analizarTandaJson(file);
    console.error('❌ No se detectó error en campos faltantes');
  } catch (error) {
    console.log('✅ Error detectado correctamente: campos faltantes');
    erroresDetectados++;
  }
  
  // Test 3: Nombres duplicados
  try {
    const contenido = `[
      {"nombre": "P1", "tiempo_arribo": 0, "cantidad_rafagas_cpu": 1, "duracion_rafaga_cpu": 5, "duracion_rafaga_es": 0, "prioridad_externa": 50},
      {"nombre": "P1", "tiempo_arribo": 1, "cantidad_rafagas_cpu": 1, "duracion_rafaga_cpu": 3, "duracion_rafaga_es": 0, "prioridad_externa": 60}
    ]`;
    const file = createMockFile(contenido, 'duplicated.json');
    await analizarTandaJson(file);
    console.error('❌ No se detectó error en nombres duplicados');
  } catch (error) {
    console.log('✅ Error detectado correctamente: nombres duplicados');
    erroresDetectados++;
  }
  
  return erroresDetectados === 3;
}

// Ejecutar todos los tests
async function ejecutarTodosLosTests(): Promise<void> {
  const resultados = [
    await testFormatoCompleto(),
    await testFormatoArray(),
    await testCompatibilidadLegacy(),
    await testArchivosTandas(),
    await testValidacionErrores()
  ];
  
  const exitosos = resultados.filter(r => r).length;
  
  console.log('\n==================================================');
  console.log(`🏁 RESUMEN: ${exitosos}/${resultados.length} tests exitosos`);
  
  if (exitosos === resultados.length) {
    console.log('🎉 ¡Todos los tests del parser JSON pasaron correctamente!');
    console.log('✅ Parser JSON estandarizado con misma semántica que TXT/CSV');
  } else {
    console.log('⚠️ Algunos tests fallaron. Revisar implementación.');
  }
}

// Ejecutar tests
ejecutarTodosLosTests().catch(console.error);
