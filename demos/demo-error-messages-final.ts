/**
 * Demo final: Mensajes de error mejorados
 * Muestra ejemplos prácticos de los nuevos mensajes de error claros y útiles
 */

import { readFileSync } from 'fs';
import { parseJsonToWorkload } from '../src/lib/infrastructure/parsers/jsonParser';
import { parseWorkloadTxt } from '../src/lib/infrastructure/parsers/txtParser';

console.log('🎯 DEMO: MENSAJES DE ERROR MEJORADOS');
console.log('====================================');

// Simular File object desde contenido string
function createMockFile(content: string, filename: string, type: string = 'text/plain'): File {
  const blob = new Blob([content], { type });
  return new File([blob], filename, { type });
}

function mostrarError(titulo: string, error: any): void {
  console.log(`\n${titulo}:`);
  console.log('━'.repeat(50));
  const message = error instanceof Error ? error.message : String(error);
  
  // Mostrar el mensaje completo con formato mejorado
  const lines = message.split('\n');
  for (const line of lines) {
    if (line.includes('💡')) {
      console.log(`\x1b[36m${line}\x1b[0m`); // Cyan para sugerencias
    } else if (line.includes('❌')) {
      console.log(`\x1b[31m${line}\x1b[0m`); // Rojo para errores
    } else {
      console.log(`\x1b[33m${line}\x1b[0m`); // Amarillo para descripción del error
    }
  }
}

async function demostrarMejoras(): Promise<void> {
  console.log('\n📋 Ejemplos de mensajes de error mejorados:');
  
  // Ejemplo 1: JSON malformado
  try {
    const file = createMockFile('{ "processes": [ invalid', 'workload_roto.json', 'application/json');
    await parseJsonToWorkload(file);
  } catch (error) {
    mostrarError('🔴 JSON Malformado', error);
  }
  
  // Ejemplo 2: Campo faltante con sugerencia específica
  try {
    const contenido = `[
      {"nombre": "P1", "tiempo_arribo": 0, "cantidad_rafagas_cpu": 1}
    ]`;
    const file = createMockFile(contenido, 'proceso_incompleto.json', 'application/json');
    await parseJsonToWorkload(file);
  } catch (error) {
    mostrarError('🔴 Campo Faltante', error);
  }
  
  // Ejemplo 3: Valor fuera de rango con contexto
  try {
    const contenido = `nombre,tiempo_arribo,cantidad_rafagas_cpu,duracion_rafaga_cpu,duracion_rafaga_es,prioridad_externa
P1,0,1,5,0,150
P2,2,1,3,0,60`;
    const file = createMockFile(contenido, 'prioridades_invalidas.csv', 'text/csv');
    await parseWorkloadTxt(file);
  } catch (error) {
    mostrarError('🔴 Valor Fuera de Rango', error);
  }
  
  // Ejemplo 4: Nombres duplicados con lista específica
  try {
    const contenido = `P1	0	1	5	0	50
P2	1	1	3	0	60
P1	2	1	8	0	70`;
    const file = createMockFile(contenido, 'nombres_duplicados.txt', 'text/plain');
    await parseWorkloadTxt(file);
  } catch (error) {
    mostrarError('🔴 Nombres Duplicados', error);
  }
  
  // Ejemplo 5: Tipo de dato incorrecto con sugerencia
  try {
    const contenido = `nombre,tiempo_arribo,cantidad_rafagas_cpu,duracion_rafaga_cpu,duracion_rafaga_es,prioridad_externa
P1,abc,1,5,0,50`;
    const file = createMockFile(contenido, 'tipo_incorrecto.csv', 'text/csv');
    await parseWorkloadTxt(file);
  } catch (error) {
    mostrarError('🔴 Tipo de Dato Incorrecto', error);
  }
  
  // Ejemplo 6: Archivo vacío
  try {
    const file = createMockFile('', 'archivo_vacio.json', 'application/json');
    await parseJsonToWorkload(file);
  } catch (error) {
    mostrarError('🔴 Archivo Vacío', error);
  }
}

async function mostrarComparacionAntes(): Promise<void> {
  console.log('\n📊 COMPARACIÓN: Antes vs Después');
  console.log('=================================');
  
  console.log('\n🟡 ANTES (mensajes básicos):');
  console.log('   ❌ "Archivo JSON inválido"');
  console.log('   ❌ "Campo requerido"');
  console.log('   ❌ "Error en proceso 1"');
  console.log('   ❌ "Nombres duplicados: P1"');
  
  console.log('\n🟢 DESPUÉS (mensajes mejorados):');
  console.log('   ✅ Especifica el archivo exacto');
  console.log('   ✅ Indica línea y campo problemático');
  console.log('   ✅ Incluye sugerencias de corrección');
  console.log('   ✅ Explica qué formato se espera');
  console.log('   ✅ Proporciona ejemplos válidos');
}

async function mostrarCaracteristicas(): Promise<void> {
  console.log('\n🎨 CARACTERÍSTICAS DE LOS MENSAJES MEJORADOS');
  console.log('============================================');
  
  const caracteristicas = [
    '📍 Ubicación precisa: archivo, línea, campo',
    '🎯 Especificidad: qué exactamente está mal',
    '💡 Sugerencias útiles: cómo corregir el problema',
    '📋 Formato esperado: qué estructura se requiere',
    '🔤 Ejemplos prácticos: valores válidos de referencia',
    '🎨 Formato consistente: mismo estilo en ambos parsers',
    '🌐 Contexto completo: información suficiente para depurar'
  ];
  
  for (const caracteristica of caracteristicas) {
    console.log(`   ${caracteristica}`);
  }
}

// Ejecutar demo
async function ejecutarDemo(): Promise<void> {
  await demostrarMejoras();
  await mostrarComparacionAntes();
  await mostrarCaracteristicas();
  
  console.log('\n====================================');
  console.log('🎉 RESULTADO: Mensajes de error implementados');
  console.log('✅ Parsers JSON y TXT/CSV con mensajes claros');
  console.log('✅ Información específica de ubicación y solución');
  console.log('✅ Experiencia de usuario significativamente mejorada');
}

ejecutarDemo().catch(console.error);
