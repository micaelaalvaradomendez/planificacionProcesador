#!/usr/bin/env npx tsx

/**
 * 📂 TEST DE FORMATO DE ARCHIVOS Y PARSERS
 * ========================================
 * 
 * Valida que el simulador maneja correctamente todos los formatos
 * de entrada especificados en la consigna y documentados.
 */

import { readFileSync, writeFileSync } from 'fs';
import { parseJsonToWorkload } from '../../src/lib/infrastructure/parsers/jsonParser';
import { parseTxtToWorkload } from '../../src/lib/infrastructure/parsers/txtParser';
import type { Workload } from '../../src/lib/domain/types';

console.log('📂 TEST: FORMATO DE ARCHIVOS Y PARSERS');
console.log('======================================');

let testsPasados = 0;
let testsTotal = 0;

function validarTest(nombre: string, condicion: boolean, detalle?: string): void {
  testsTotal++;
  if (condicion) {
    console.log(`✅ ${nombre}`);
    testsPasados++;
  } else {
    console.log(`❌ ${nombre}${detalle ? ` - ${detalle}` : ''}`);
  }
}

function crearMockFile(contenido: string, nombre: string, tipo: string): File {
  const blob = new Blob([contenido], { type: tipo });
  return new File([blob], nombre, { type: tipo });
}

async function testFormatoJSON(): Promise<void> {
  console.log('\n📋 1. FORMATO JSON');
  console.log('==================');
  
  // ✅ JSON Array básico
  const jsonArray = `[
    {
      "name": "P1",
      "tiempoArribo": 0,
      "rafagasCPU": 2,
      "duracionRafagaCPU": 5,
      "duracionRafagaES": 3,
      "prioridad": 80
    },
    {
      "name": "P2",
      "tiempoArribo": 1,
      "rafagasCPU": 1,
      "duracionRafagaCPU": 8,
      "duracionRafagaES": 0,
      "prioridad": 60
    }
  ]`;
  
  try {
    const file = crearMockFile(jsonArray, 'test-array.json', 'application/json');
    const workload = await parseJsonToWorkload(file);
    
    validarTest(
      'JSON: Array de procesos',
      workload.processes.length === 2,
      `Cargados ${workload.processes.length} procesos`
    );
    
    // Validar campos requeridos
    const proceso = workload.processes[0];
    validarTest(
      'JSON: Campos requeridos presentes',
      proceso.id === 'P1' && proceso.arribo === 0 && proceso.rafagasCPU === 2,
      'Campos básicos validados'
    );
  } catch (error) {
    validarTest('JSON: Array de procesos', false, `Error: ${error}`);
  }
  
  // ✅ JSON Workload completo
  const jsonWorkload = `{
    "workloadName": "Test Workload",
    "processes": [
      {
        "name": "P1",
        "tiempoArribo": 0,
        "rafagasCPU": 1,
        "duracionRafagaCPU": 5,
        "duracionRafagaES": 0,
        "prioridad": 50
      }
    ],
    "config": {
      "policy": "FCFS",
      "tip": 1,
      "tfp": 1,
      "tcp": 1
    }
  }`;
  
  try {
    const file = crearMockFile(jsonWorkload, 'test-workload.json', 'application/json');
    const workload = await parseJsonToWorkload(file);
    
    validarTest(
      'JSON: Workload completo con config',
      workload.config?.policy === 'FCFS' && workload.processes.length === 1,
      `Policy: ${workload.config?.policy}`
    );
  } catch (error) {
    validarTest('JSON: Workload completo con config', false, `Error: ${error}`);
  }
  
  // ✅ Compatibilidad con nombres de campos variados
  const jsonCompatibilidad = `[
    {
      "nombre": "P1",
      "tiempo_arribo": 0,
      "cantidad_rafagas_cpu": 1,
      "duracion_rafaga_cpu": 5,
      "duracion_rafaga_es": 0,
      "prioridad_externa": 50
    }
  ]`;
  
  try {
    const file = crearMockFile(jsonCompatibilidad, 'test-compat.json', 'application/json');
    const workload = await parseJsonToWorkload(file);
    
    validarTest(
      'JSON: Compatibilidad nombres de campo',
      workload.processes.length === 1 && workload.processes[0].id === 'P1',
      'Acepta nombres alternativos de campos'
    );
  } catch (error) {
    validarTest('JSON: Compatibilidad nombres de campo', false, `Error: ${error}`);
  }
}

async function testFormatoCSV(): Promise<void> {
  console.log('\n📋 2. FORMATO CSV/TXT');
  console.log('=====================');
  
  // ✅ CSV según consigna: "comas separadas"
  const csvConsigna = `P1,0,2,5,3,80
P2,1,1,8,0,60
P3,2,3,3,2,40`;
  
  try {
    const workload = parseTxtToWorkload(csvConsigna, {
      policy: 'FCFS',
      tip: 1, tfp: 1, tcp: 1,
      separator: ','
    }, 'consigna.csv');
    
    validarTest(
      'CSV: Formato según consigna (comas)',
      workload.processes.length === 3,
      `Cargados ${workload.processes.length} procesos`
    );
    
    // Validar orden de campos según consigna
    const proceso = workload.processes[0];
    validarTest(
      'CSV: Orden de campos correcto',
      proceso.id === 'P1' && proceso.arribo === 0 && proceso.rafagasCPU === 2 &&
      proceso.duracionCPU === 5 && proceso.duracionIO === 3 && proceso.prioridad === 80,
      'Nombre,Arribo,Ráfagas,DuraciónCPU,DuraciónI/O,Prioridad'
    );
  } catch (error) {
    validarTest('CSV: Formato según consigna (comas)', false, `Error: ${error}`);
  }
  
  // ✅ Manejo de espacios en blanco
  const csvEspacios = `P1 , 0 , 1 , 5 , 0 , 50
  P2,  1,  1,  3,  0,  70  `;
  
  try {
    const workload = parseTxtToWorkload(csvEspacios, {
      policy: 'FCFS',
      tip: 1, tfp: 1, tcp: 1,
      separator: ','
    }, 'espacios.csv');
    
    validarTest(
      'CSV: Manejo de espacios en blanco',
      workload.processes.length === 2 && workload.processes[0].id === 'P1',
      'Ignora espacios correctamente'
    );
  } catch (error) {
    validarTest('CSV: Manejo de espacios en blanco', false, `Error: ${error}`);
  }
  
  // ✅ Separadores alternativos (punto y coma)
  const csvPuntoComa = `P1;0;1;5;0;50
P2;1;1;3;0;70`;
  
  try {
    const workload = parseTxtToWorkload(csvPuntoComa, {
      policy: 'FCFS',
      tip: 1, tfp: 1, tcp: 1,
      separator: ';'
    }, 'punto-coma.csv');
    
    validarTest(
      'CSV: Separador punto y coma',
      workload.processes.length === 2,
      'Acepta separadores alternativos'
    );
  } catch (error) {
    validarTest('CSV: Separador punto y coma', false, `Error: ${error}`);
  }
}

async function testValidacionDatos(): Promise<void> {
  console.log('\n📋 3. VALIDACIÓN DE DATOS');
  console.log('=========================');
  
  // ✅ Valores numéricos válidos
  const datosValidos = `P1,0,1,5,2,50`;
  
  try {
    const workload = parseTxtToWorkload(datosValidos, {
      policy: 'FCFS',
      tip: 1, tfp: 1, tcp: 1,
      separator: ','
    }, 'validos.csv');
    
    const proceso = workload.processes[0];
    validarTest(
      'Validación: Números enteros/decimales',
      proceso.arribo >= 0 && proceso.rafagasCPU > 0 && proceso.duracionCPU > 0,
      `Arribo: ${proceso.arribo}, Ráfagas: ${proceso.rafagasCPU}, Duración: ${proceso.duracionCPU}`
    );
  } catch (error) {
    validarTest('Validación: Números enteros/decimales', false, `Error: ${error}`);
  }
  
  // ✅ Prioridades en rango 1-100
  const prioridadesLimite = `P1,0,1,5,0,1
P2,0,1,5,0,100`;
  
  try {
    const workload = parseTxtToWorkload(prioridadesLimite, {
      policy: 'PRIORITY',
      tip: 1, tfp: 1, tcp: 1,
      separator: ','
    }, 'prioridades.csv');
    
    const prioridades = workload.processes.map(p => p.prioridad);
    validarTest(
      'Validación: Prioridades rango 1-100',
      prioridades.every(p => p >= 1 && p <= 100),
      `Prioridades: ${prioridades.join(', ')}`
    );
  } catch (error) {
    validarTest('Validación: Prioridades rango 1-100', false, `Error: ${error}`);
  }
  
  // ✅ Detección de errores comunes
  const datosInvalidos = `P1,arribo_texto,1,5,0,50`;
  
  try {
    const workload = parseTxtToWorkload(datosInvalidos, {
      policy: 'FCFS',
      tip: 1, tfp: 1, tcp: 1,
      separator: ','
    }, 'invalidos.csv');
    
    validarTest('Validación: Detección valores no numéricos', false, 'Debería fallar');
  } catch (error) {
    validarTest(
      'Validación: Detección valores no numéricos',
      true,
      'Error detectado correctamente'
    );
  }
}

async function testIntegracionFormatos(): Promise<void> {
  console.log('\n📋 4. INTEGRACIÓN DE FORMATOS');
  console.log('==============================');
  
  // ✅ Mismo workload en JSON y CSV debe dar resultados equivalentes
  const datosComunes = {
    procesos: [
      { name: 'P1', arribo: 0, rafagas: 1, duracionCPU: 5, duracionIO: 0, prioridad: 50 },
      { name: 'P2', arribo: 2, rafagas: 1, duracionCPU: 3, duracionIO: 0, prioridad: 70 }
    ]
  };
  
  // Crear JSON
  const jsonEquivalente = `[
    {
      "name": "${datosComunes.procesos[0].name}",
      "tiempoArribo": ${datosComunes.procesos[0].arribo},
      "rafagasCPU": ${datosComunes.procesos[0].rafagas},
      "duracionRafagaCPU": ${datosComunes.procesos[0].duracionCPU},
      "duracionRafagaES": ${datosComunes.procesos[0].duracionIO},
      "prioridad": ${datosComunes.procesos[0].prioridad}
    },
    {
      "name": "${datosComunes.procesos[1].name}",
      "tiempoArribo": ${datosComunes.procesos[1].arribo},
      "rafagasCPU": ${datosComunes.procesos[1].rafagas},
      "duracionRafagaCPU": ${datosComunes.procesos[1].duracionCPU},
      "duracionRafagaES": ${datosComunes.procesos[1].duracionIO},
      "prioridad": ${datosComunes.procesos[1].prioridad}
    }
  ]`;
  
  // Crear CSV equivalente
  const csvEquivalente = datosComunes.procesos.map(p => 
    `${p.name},${p.arribo},${p.rafagas},${p.duracionCPU},${p.duracionIO},${p.prioridad}`
  ).join('\n');
  
  try {
    // Parsear ambos formatos
    const fileJson = crearMockFile(jsonEquivalente, 'equiv.json', 'application/json');
    const workloadJson = await parseJsonToWorkload(fileJson);
    
    const workloadCsv = parseTxtToWorkload(csvEquivalente, {
      policy: 'FCFS',
      tip: 1, tfp: 1, tcp: 1,
      separator: ','
    }, 'equiv.csv');
    
    // Comparar resultados
    const procesosIguales = workloadJson.processes.length === workloadCsv.processes.length &&
      workloadJson.processes.every((p, i) => {
        const pCsv = workloadCsv.processes[i];
        return p.id === pCsv.id && p.arribo === pCsv.arribo && 
               p.duracionCPU === pCsv.duracionCPU && p.prioridad === pCsv.prioridad;
      });
    
    validarTest(
      'Integración: JSON y CSV equivalentes',
      procesosIguales,
      `JSON: ${workloadJson.processes.length}, CSV: ${workloadCsv.processes.length} procesos`
    );
  } catch (error) {
    validarTest('Integración: JSON y CSV equivalentes', false, `Error: ${error}`);
  }
}

async function testMensajesError(): Promise<void> {
  console.log('\n📋 5. MENSAJES DE ERROR');
  console.log('=======================');
  
  // ✅ JSON malformado
  const jsonMalo = `{ "processes": [ invalid json `;
  
  try {
    const file = crearMockFile(jsonMalo, 'malo.json', 'application/json');
    await parseJsonToWorkload(file);
    validarTest('Errores: JSON malformado', false, 'Debería fallar');
  } catch (error) {
    validarTest(
      'Errores: JSON malformado',
      error instanceof Error && (error.message.includes('JSON') || error.message.includes('parse')),
      'Mensaje de error claro'
    );
  }
  
  // ✅ CSV con columnas faltantes
  const csvIncompleto = `P1,0,1,5`;  // Faltan duracionIO y prioridad
  
  try {
    parseTxtToWorkload(csvIncompleto, {
      policy: 'FCFS',
      tip: 1, tfp: 1, tcp: 1,
      separator: ','
    }, 'incompleto.csv');
    validarTest('Errores: CSV columnas faltantes', false, 'Debería fallar');
  } catch (error) {
    validarTest(
      'Errores: CSV columnas faltantes',
      error instanceof Error && (error.message.includes('columna') || error.message.includes('campo')),
      'Detecta campos faltantes'
    );
  }
  
  // ✅ Archivo vacío
  try {
    const fileVacio = crearMockFile('', 'vacio.json', 'application/json');
    await parseJsonToWorkload(fileVacio);
    validarTest('Errores: Archivo vacío', false, 'Debería fallar');
  } catch (error) {
    validarTest(
      'Errores: Archivo vacío',
      error instanceof Error && (error.message.includes('vacío') || error.message.includes('empty')),
      'Detecta archivos vacíos'
    );
  }
}

async function testCompatibilidadExamples(): Promise<void> {
  console.log('\n📋 6. COMPATIBILIDAD CON EXAMPLES');
  console.log('=================================');
  
  // ✅ Cargar archivos reales de examples/
  try {
    const contenido = readFileSync('examples/workloads/ejemplo-fcfs-simple.json', 'utf8');
    const file = crearMockFile(contenido, 'ejemplo-fcfs-simple.json', 'application/json');
    const workload = await parseJsonToWorkload(file);
    
    validarTest(
      'Examples: ejemplo-fcfs-simple.json',
      workload.processes.length > 0,
      `Cargados ${workload.processes.length} procesos`
    );
  } catch (error) {
    validarTest('Examples: ejemplo-fcfs-simple.json', false, `Error: ${error}`);
  }
  
  try {
    const contenido = readFileSync('examples/workloads/procesos_tanda_5p.json', 'utf8');
    const file = crearMockFile(contenido, 'procesos_tanda_5p.json', 'application/json');
    const workload = await parseJsonToWorkload(file);
    
    validarTest(
      'Examples: procesos_tanda_5p.json',
      workload.processes.length === 5,
      `Esperados 5, cargados ${workload.processes.length} procesos`
    );
  } catch (error) {
    validarTest('Examples: procesos_tanda_5p.json', false, `Error: ${error}`);
  }
}

// ===== EJECUCIÓN PRINCIPAL =====

async function ejecutarTodosLosTests(): Promise<void> {
  await testFormatoJSON();
  await testFormatoCSV();
  await testValidacionDatos();
  await testIntegracionFormatos();
  await testMensajesError();
  await testCompatibilidadExamples();
  
  console.log('\n📊 RESUMEN FINAL - FORMATOS');
  console.log('===========================');
  console.log(`✅ Tests pasados: ${testsPasados}`);
  console.log(`❌ Tests fallidos: ${testsTotal - testsPasados}`);
  console.log(`📈 Porcentaje éxito: ${((testsPasados / testsTotal) * 100).toFixed(1)}%`);
  
  if (testsPasados === testsTotal) {
    console.log('\n🎉 ¡TODOS LOS TESTS DE FORMATO PASARON!');
    console.log('   El parser maneja correctamente todos los formatos');
  } else {
    console.log('\n⚠️  HAY PROBLEMAS CON FORMATOS');
    console.log('   Revisar implementación de parsers');
  }
}

// Ejecutar tests si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  ejecutarTodosLosTests().catch(console.error);
}

export { ejecutarTodosLosTests };