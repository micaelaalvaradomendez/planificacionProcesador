/**
 * Test del parser TXT/CSV 
 * Valida que se lean correctamente los 6 campos exactos
 */

import { 
  parseTxtToWorkload, 
  parseTxtToProcesses,
  createDefaultConfig
} from '../../src/lib/infrastructure/parsers/txtParser';
import { ParseError } from '../../src/lib/infrastructure/parsers/ParseError';
import { ejecutarSimulacionCompleta } from '../../src/lib/application/usecases/runSimulation';

// Ejemplo de contenido TXT simple
const EJEMPLO_TXT = `# Ejemplo con comentario
P1, 0, 1, 10, 0, 50
P2, 2, 1, 3, 0, 60
P3, 4, 1, 8, 0, 90`;

// Ejemplo CSV con headers
const EJEMPLO_CSV = `nombre,tiempo_arribo,cantidad_rafagas_cpu,duracion_rafaga_cpu,duracion_rafaga_es,prioridad_externa
P1,0,3,5,4,2
P2,1,2,6,3,1
P3,3,4,3,2,3`;

// Ejemplo separado por tabs
const EJEMPLO_TSV = `P1	0	1	10	0	50
P2	2	1	3	0	60
P3	4	1	8	0	90`;

console.log('🧪 INICIANDO TESTS DEL PARSER TXT/CSV');
console.log('==================================================');

async function testParseoBasico(): Promise<boolean> {
  console.log('\n=== TEST: Parseo básico TXT ===');
  
  try {
    const procesos = parseTxtToProcesses(EJEMPLO_TXT);
    
    console.log('✅ TXT parseado correctamente');
    console.log(`📊 Procesos encontrados: ${procesos.length}`);
    
    for (const proc of procesos) {
      console.log(`   ${proc.name}: arribo=${proc.tiempoArribo}, rafagas=${proc.rafagasCPU}, cpu=${proc.duracionRafagaCPU}, es=${proc.duracionRafagaES}, prio=${proc.prioridad}`);
    }
    
    // Validar contenido específico
    if (procesos.length !== 3) {
      throw new Error(`Se esperaban 3 procesos, se encontraron ${procesos.length}`);
    }
    
    const p1 = procesos.find(p => p.name === 'P1');
    if (!p1 || p1.tiempoArribo !== 0 || p1.rafagasCPU !== 1 || p1.duracionRafagaCPU !== 10) {
      throw new Error('P1 no se parseó correctamente');
    }
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error en parseo básico:', errorMessage);
    return false;
  }
}

async function testParseoCSV(): Promise<boolean> {
  console.log('\n=== TEST: Parseo CSV con headers ===');
  
  try {
    const procesos = parseTxtToProcesses(EJEMPLO_CSV);
    
    console.log('✅ CSV parseado correctamente');
    console.log(`📊 Procesos encontrados: ${procesos.length}`);
    
    for (const proc of procesos) {
      console.log(`   ${proc.name}: arribo=${proc.tiempoArribo}, rafagas=${proc.rafagasCPU}, cpu=${proc.duracionRafagaCPU}, es=${proc.duracionRafagaES}, prio=${proc.prioridad}`);
    }
    
    // Validar que se detectaron headers y se saltaron
    if (procesos.length !== 3) {
      throw new Error(`Se esperaban 3 procesos, se encontraron ${procesos.length}`);
    }
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error en parseo CSV:', errorMessage);
    return false;
  }
}

async function testParseoTSV(): Promise<boolean> {
  console.log('\n=== TEST: Parseo separado por tabs ===');
  
  try {
    const procesos = parseTxtToProcesses(EJEMPLO_TSV);
    
    console.log('✅ TSV parseado correctamente');
    console.log(`📊 Procesos encontrados: ${procesos.length}`);
    
    for (const proc of procesos) {
      console.log(`   ${proc.name}: arribo=${proc.tiempoArribo}, rafagas=${proc.rafagasCPU}, cpu=${proc.duracionRafagaCPU}, es=${proc.duracionRafagaES}, prio=${proc.prioridad}`);
    }
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error en parseo TSV:', errorMessage);
    return false;
  }
}

async function testWorkloadCompleto(): Promise<boolean> {
  console.log('\n=== TEST: Workload completo y simulación ===');
  
  try {
    const config = createDefaultConfig('FCFS');
    config.tip = 1;
    config.tfp = 1;
    config.tcp = 1;
    
    const workload = parseTxtToWorkload(EJEMPLO_TXT, config, 'ejemplo.txt');
    
    console.log('✅ Workload creado correctamente');
    console.log(`📋 Nombre: ${workload.workloadName}`);
    console.log(`📊 Procesos: ${workload.processes.length}`);
    console.log(`⚙️  Política: ${workload.config.policy}`);
    console.log(`🔧 TIP: ${workload.config.tip}, TFP: ${workload.config.tfp}, TCP: ${workload.config.tcp}`);
    
    // Ejecutar simulación con el workload parseado
    console.log('\n🚀 Ejecutando simulación con workload parseado...');
    const resultado = await ejecutarSimulacionCompleta(workload);
    
    if (!resultado.exitoso) {
      throw new Error(`Simulación falló: ${resultado.error}`);
    }
    
    console.log('✅ Simulación exitosa');
    console.log(`⏱️  Tiempo total: ${resultado.tiempoTotal}`);
    console.log(`📊 Procesos terminados: ${resultado.metricas.porProceso.length}`);
    
    for (const proc of resultado.metricas.porProceso) {
      console.log(`   ${proc.name}: TR=${proc.tiempoRetorno.toFixed(2)}, TRn=${proc.tiempoRetornoNormalizado.toFixed(2)}, T_Listo=${proc.tiempoEnListo.toFixed(2)}`);
    }
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error en workload completo:', errorMessage);
    return false;
  }
}

async function testErrores(): Promise<boolean> {
  console.log('\n=== TEST: Manejo de errores ===');
  
  let erroresDetectados = 0;
  
  // Test 1: Archivo vacío
  try {
    parseTxtToProcesses('');
    console.error('❌ No se detectó error en archivo vacío');
  } catch (error) {
    if (error instanceof ParseError) {
      console.log('✅ Error detectado correctamente: archivo vacío');
      erroresDetectados++;
    }
  }
  
  // Test 2: Campos insuficientes
  try {
    parseTxtToProcesses('P1, 0, 1, 10'); // Solo 4 campos
    console.error('❌ No se detectó error en campos insuficientes');
  } catch (error) {
    if (error instanceof ParseError) {
      console.log('✅ Error detectado correctamente: campos insuficientes');
      erroresDetectados++;
    }
  }
  
  // Test 3: Nombre inválido
  try {
    parseTxtToProcesses('123, 0, 1, 10, 0, 50'); // Nombre empieza con número
    console.error('❌ No se detectó error en nombre inválido');
  } catch (error) {
    if (error instanceof ParseError) {
      console.log('✅ Error detectado correctamente: nombre inválido');
      erroresDetectados++;
    }
  }
  
  // Test 4: Número inválido
  try {
    parseTxtToProcesses('P1, abc, 1, 10, 0, 50'); // tiempo_arribo no es número
    console.error('❌ No se detectó error en número inválido');
  } catch (error) {
    if (error instanceof ParseError) {
      console.log('✅ Error detectado correctamente: número inválido');
      erroresDetectados++;
    }
  }
  
  return erroresDetectados === 4;
}

// Ejecutar todos los tests
async function ejecutarTodosLosTests(): Promise<void> {
  const resultados = [
    await testParseoBasico(),
    await testParseoCSV(),
    await testParseoTSV(),
    await testWorkloadCompleto(),
    await testErrores()
  ];
  
  const exitosos = resultados.filter(r => r).length;
  
  console.log('\n==================================================');
  console.log(`🏁 RESUMEN: ${exitosos}/${resultados.length} tests exitosos`);
  
  if (exitosos === resultados.length) {
    console.log('🎉 ¡Todos los tests del parser TXT/CSV pasaron correctamente!');
  } else {
    console.log('⚠️ Algunos tests fallaron. Revisar implementación.');
  }
}

// Ejecutar tests
ejecutarTodosLosTests().catch(console.error);
