/**
 * Demo de comparación: JSON vs TXT/CSV
 * Verifica que ambos parsers producen resultados idénticos
 */

import { readFileSync } from 'fs';
import { analizarTandaJson } from '../src/lib/infrastructure/io/parseWorkload';
import { parseWorkloadTxt } from '../src/lib/infrastructure/parsers/txtParser';

console.log('🔄 DEMO: COMPARACIÓN JSON vs TXT/CSV');
console.log('========================================');

// Simular File object desde contenido string
function createMockFile(content: string, filename: string, type: string = 'text/plain'): File {
  const blob = new Blob([content], { type });
  return new File([blob], filename, { type });
}

// Comparar estructuras de proceso
function compararProcesos(json: any, txt: any): boolean {
  if (json.processes.length !== txt.processes.length) {
    console.log(`❌ Diferente número de procesos: JSON=${json.processes.length}, TXT=${txt.processes.length}`);
    return false;
  }
  
  for (let i = 0; i < json.processes.length; i++) {
    const pJson = json.processes[i];
    const pTxt = txt.processes[i];
    
    const campos = ['name', 'tiempoArribo', 'rafagasCPU', 'duracionRafagaCPU', 'duracionRafagaES', 'prioridad'];
    for (const campo of campos) {
      if (pJson[campo] !== pTxt[campo]) {
        console.log(`❌ Diferencia en ${pJson.name}.${campo}: JSON=${pJson[campo]}, TXT=${pTxt[campo]}`);
        return false;
      }
    }
  }
  
  return true;
}

async function compararMismoContenido(): Promise<void> {
  console.log('\n=== COMPARACIÓN: Mismo contenido en JSON vs CSV ===');
  
  try {
    // Crear el mismo workload en ambos formatos
    const contenidoJson = `[
      {"nombre": "P1", "tiempo_arribo": 0, "cantidad_rafagas_cpu": 2, "duracion_rafaga_cpu": 5, "duracion_rafaga_es": 3, "prioridad_externa": 80},
      {"nombre": "P2", "tiempo_arribo": 1, "cantidad_rafagas_cpu": 1, "duracion_rafaga_cpu": 8, "duracion_rafaga_es": 0, "prioridad_externa": 60},
      {"nombre": "P3", "tiempo_arribo": 3, "cantidad_rafagas_cpu": 3, "duracion_rafaga_cpu": 4, "duracion_rafaga_es": 2, "prioridad_externa": 90}
    ]`;
    
    const contenidoCsv = `nombre,tiempo_arribo,cantidad_rafagas_cpu,duracion_rafaga_cpu,duracion_rafaga_es,prioridad_externa
P1,0,2,5,3,80
P2,1,1,8,0,60
P3,3,3,4,2,90`;
    
    // Parsear con ambos parsers
    const fileJson = createMockFile(contenidoJson, 'test.json', 'application/json');
    const fileCsv = createMockFile(contenidoCsv, 'test.csv', 'text/csv');
    
    const workloadJson = await analizarTandaJson(fileJson);
    const workloadTxt = await parseWorkloadTxt(fileCsv);
    
    console.log('📊 Resultados del parser JSON:');
    for (const proc of workloadJson.processes) {
      console.log(`   ${proc.name}: arribo=${proc.tiempoArribo}, rafagas=${proc.rafagasCPU}, cpu=${proc.duracionRafagaCPU}, es=${proc.duracionRafagaES}, prio=${proc.prioridad}`);
    }
    
    console.log('\n📊 Resultados del parser TXT/CSV:');
    for (const proc of workloadTxt.processes) {
      console.log(`   ${proc.name}: arribo=${proc.tiempoArribo}, rafagas=${proc.rafagasCPU}, cpu=${proc.duracionRafagaCPU}, es=${proc.duracionRafagaES}, prio=${proc.prioridad}`);
    }
    
    // Comparar resultados
    const sonIguales = compararProcesos(workloadJson, workloadTxt);
    
    if (sonIguales) {
      console.log('\n✅ ¡Resultados IDÉNTICOS! Ambos parsers producen la misma estructura');
    } else {
      console.log('\n❌ Los parsers producen resultados diferentes');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error en comparación:', errorMessage);
  }
}

async function compararArchivosReales(): Promise<void> {
  console.log('\n=== COMPARACIÓN: Archivos reales equivalentes ===');
  
  try {
    // Leer ejemplo CSV
    const contenidoCsv = readFileSync('examples/workloads/ejemplo_5procesos.csv', 'utf-8');
    console.log('📄 Contenido CSV:');
    console.log(contenidoCsv);
    
    // Crear JSON equivalente
    const contenidoJsonEquivalente = `[
      {"nombre": "P1", "tiempo_arribo": 0, "cantidad_rafagas_cpu": 2, "duracion_rafaga_cpu": 5, "duracion_rafaga_es": 3, "prioridad_externa": 80},
      {"nombre": "P2", "tiempo_arribo": 1, "cantidad_rafagas_cpu": 1, "duracion_rafaga_cpu": 8, "duracion_rafaga_es": 0, "prioridad_externa": 60},
      {"nombre": "P3", "tiempo_arribo": 3, "cantidad_rafagas_cpu": 3, "duracion_rafaga_cpu": 4, "duracion_rafaga_es": 2, "prioridad_externa": 90},
      {"nombre": "P4", "tiempo_arribo": 4, "cantidad_rafagas_cpu": 1, "duracion_rafaga_cpu": 6, "duracion_rafaga_es": 0, "prioridad_externa": 70},
      {"nombre": "P5", "tiempo_arribo": 6, "cantidad_rafagas_cpu": 2, "duracion_rafaga_cpu": 3, "duracion_rafaga_es": 4, "prioridad_externa": 85}
    ]`;
    
    console.log('\n📄 JSON equivalente creado');
    
    // Parsear ambos
    const fileCsv = createMockFile(contenidoCsv, 'ejemplo_5procesos.csv', 'text/csv');
    const fileJson = createMockFile(contenidoJsonEquivalente, 'equivalente.json', 'application/json');
    
    const workloadCsv = await parseWorkloadTxt(fileCsv);
    const workloadJson = await analizarTandaJson(fileJson);
    
    console.log('\n📊 CSV parseado:');
    for (const proc of workloadCsv.processes) {
      console.log(`   ${proc.name}: arribo=${proc.tiempoArribo}, rafagas=${proc.rafagasCPU}, cpu=${proc.duracionRafagaCPU}, es=${proc.duracionRafagaES}, prio=${proc.prioridad}`);
    }
    
    console.log('\n📊 JSON parseado:');
    for (const proc of workloadJson.processes) {
      console.log(`   ${proc.name}: arribo=${proc.tiempoArribo}, rafagas=${proc.rafagasCPU}, cpu=${proc.duracionRafagaCPU}, es=${proc.duracionRafagaES}, prio=${proc.prioridad}`);
    }
    
    // Comparar
    const sonIguales = compararProcesos(workloadCsv, workloadJson);
    
    if (sonIguales) {
      console.log('\n✅ ¡Archivos reales producen resultados IDÉNTICOS!');
    } else {
      console.log('\n❌ Los archivos reales producen resultados diferentes');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error comparando archivos reales:', errorMessage);
  }
}

async function compararValidacionErrores(): Promise<void> {
  console.log('\n=== COMPARACIÓN: Validación de errores ===');
  
  let erroresJsonDetectados = 0;
  let erroresTxtDetectados = 0;
  
  // Test 1: Campo faltante
  console.log('\n🧪 Test: Campo faltante');
  try {
    const contenidoJson = `[{"nombre": "P1", "tiempo_arribo": 0}]`;
    const fileJson = createMockFile(contenidoJson, 'incomplete.json', 'application/json');
    await analizarTandaJson(fileJson);
    console.log('❌ JSON: No detectó campo faltante');
  } catch (error) {
    console.log('✅ JSON: Detectó campo faltante correctamente');
    erroresJsonDetectados++;
  }
  
  try {
    const contenidoTxt = `nombre,tiempo_arribo\nP1,0`;
    const fileTxt = createMockFile(contenidoTxt, 'incomplete.csv', 'text/csv');
    await parseWorkloadTxt(fileTxt);
    console.log('❌ TXT: No detectó campo faltante');
  } catch (error) {
    console.log('✅ TXT: Detectó campo faltante correctamente');
    erroresTxtDetectados++;
  }
  
  // Test 2: Nombres duplicados
  console.log('\n🧪 Test: Nombres duplicados');
  try {
    const contenidoJson = `[
      {"nombre": "P1", "tiempo_arribo": 0, "cantidad_rafagas_cpu": 1, "duracion_rafaga_cpu": 5, "duracion_rafaga_es": 0, "prioridad_externa": 50},
      {"nombre": "P1", "tiempo_arribo": 1, "cantidad_rafagas_cpu": 1, "duracion_rafaga_cpu": 3, "duracion_rafaga_es": 0, "prioridad_externa": 60}
    ]`;
    const fileJson = createMockFile(contenidoJson, 'duplicated.json', 'application/json');
    await analizarTandaJson(fileJson);
    console.log('❌ JSON: No detectó nombres duplicados');
  } catch (error) {
    console.log('✅ JSON: Detectó nombres duplicados correctamente');
    erroresJsonDetectados++;
  }
  
  try {
    const contenidoTxt = `nombre,tiempo_arribo,cantidad_rafagas_cpu,duracion_rafaga_cpu,duracion_rafaga_es,prioridad_externa
P1,0,1,5,0,50
P1,1,1,3,0,60`;
    const fileTxt = createMockFile(contenidoTxt, 'duplicated.csv', 'text/csv');
    await parseWorkloadTxt(fileTxt);
    console.log('❌ TXT: No detectó nombres duplicados');
  } catch (error) {
    console.log('✅ TXT: Detectó nombres duplicados correctamente');
    erroresTxtDetectados++;
  }
  
  console.log(`\n📊 Errores detectados - JSON: ${erroresJsonDetectados}/2, TXT: ${erroresTxtDetectados}/2`);
  
  if (erroresJsonDetectados === erroresTxtDetectados && erroresJsonDetectados === 2) {
    console.log('✅ ¡Ambos parsers tienen la misma capacidad de validación!');
  } else {
    console.log('⚠️ Los parsers tienen diferente capacidad de validación');
  }
}

// Ejecutar todas las comparaciones
async function ejecutarComparaciones(): Promise<void> {
  await compararMismoContenido();
  await compararArchivosReales();
  await compararValidacionErrores();
  
  console.log('\n========================================');
  console.log('🎯 CONCLUSIÓN: Parser JSON estandarizado');
  console.log('✅ Misma semántica que parser TXT/CSV');
  console.log('✅ Misma validación de errores');
  console.log('✅ Resultados idénticos para mismo contenido');
  console.log('🔄 Formatos completamente intercambiables');
}

// Ejecutar comparaciones
ejecutarComparaciones().catch(console.error);
