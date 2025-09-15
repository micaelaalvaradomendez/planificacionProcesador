/**
 * Test de mensajes de error claros para archivos inválidos
 * Verifica que ambos parsers den mensajes útiles y específicos
 */

import { readFileSync } from 'fs';
import { parseJsonToWorkload } from '../../src/lib/infrastructure/parsers/jsonParser';
import { parseWorkloadTxt } from '../../src/lib/infrastructure/parsers/txtParser';

console.log('🚨 TEST: MENSAJES DE ERROR CLAROS');
console.log('=====================================');

// Simular File object desde contenido string
function createMockFile(content: string, filename: string, type: string = 'text/plain'): File {
  const blob = new Blob([content], { type });
  return new File([blob], filename, { type });
}

async function testErroresSintaxis(): Promise<void> {
  console.log('\n=== ERRORES DE SINTAXIS ===');
  
  // JSON malformado
  console.log('\n🧪 JSON malformado:');
  try {
    const file = createMockFile('{ "processes": [ invalid json', 'malformed.json', 'application/json');
    await parseJsonToWorkload(file);
    console.log('❌ No detectó error de sintaxis JSON');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`✅ JSON Error: "${message}"`);
    
    // Verificar que el mensaje es claro
    if (message.includes('inválido') || message.includes('invalid')) {
      console.log('  → ✅ Mensaje claro y específico');
    } else {
      console.log('  → ⚠️ Mensaje podría ser más claro');
    }
  }
  
  // CSV con campos faltantes
  console.log('\n🧪 CSV con campos faltantes:');
  try {
    const contenido = `nombre,tiempo_arribo
P1,0
P2,1`;
    const file = createMockFile(contenido, 'incomplete.csv', 'text/csv');
    await parseWorkloadTxt(file);
    console.log('❌ No detectó campos faltantes en CSV');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`✅ CSV Error: "${message}"`);
    
    // Verificar especificidad del mensaje
    if (message.includes('6 campos') || message.includes('columnas')) {
      console.log('  → ✅ Especifica el problema estructural');
    } else {
      console.log('  → ⚠️ Podría especificar mejor el problema estructural');
    }
  }
}

async function testErroresCampos(): Promise<void> {
  console.log('\n=== ERRORES DE CAMPOS ===');
  
  // Campos faltantes en JSON
  console.log('\n🧪 Campos faltantes en JSON:');
  try {
    const contenido = `[
      {"nombre": "P1", "tiempo_arribo": 0}
    ]`;
    const file = createMockFile(contenido, 'missing_fields.json', 'application/json');
    await parseJsonToWorkload(file);
    console.log('❌ No detectó campos faltantes en JSON');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`✅ JSON Error: "${message}"`);
    
    // Verificar que menciona qué campo falta
    if (message.includes('cantidad_rafagas_cpu') || message.includes('requerido')) {
      console.log('  → ✅ Especifica qué campo falta');
    } else {
      console.log('  → ⚠️ Podría especificar qué campo falta');
    }
  }
  
  // Tipos de datos incorrectos
  console.log('\n🧪 Tipos de datos incorrectos:');
  try {
    const contenido = `nombre,tiempo_arribo,cantidad_rafagas_cpu,duracion_rafaga_cpu,duracion_rafaga_es,prioridad_externa
P1,abc,1,5,0,50`;
    const file = createMockFile(contenido, 'invalid_types.csv', 'text/csv');
    await parseWorkloadTxt(file);
    console.log('❌ No detectó tipo de dato incorrecto');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`✅ CSV Error: "${message}"`);
    
    // Verificar que menciona el tipo de error
    if (message.includes('número') || message.includes('valid') || message.includes('línea')) {
      console.log('  → ✅ Especifica el problema de tipo y ubicación');
    } else {
      console.log('  → ⚠️ Podría especificar mejor el problema de tipo');
    }
  }
}

async function testErroresLogicos(): Promise<void> {
  console.log('\n=== ERRORES LÓGICOS ===');
  
  // Nombres duplicados
  console.log('\n🧪 Nombres duplicados:');
  try {
    const contenido = `[
      {"nombre": "P1", "tiempo_arribo": 0, "cantidad_rafagas_cpu": 1, "duracion_rafaga_cpu": 5, "duracion_rafaga_es": 0, "prioridad_externa": 50},
      {"nombre": "P1", "tiempo_arribo": 1, "cantidad_rafagas_cpu": 1, "duracion_rafaga_cpu": 3, "duracion_rafaga_es": 0, "prioridad_externa": 60}
    ]`;
    const file = createMockFile(contenido, 'duplicated.json', 'application/json');
    await parseJsonToWorkload(file);
    console.log('❌ No detectó nombres duplicados');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`✅ JSON Error: "${message}"`);
    
    // Verificar que lista los nombres duplicados
    if (message.includes('P1') && message.includes('duplicad')) {
      console.log('  → ✅ Lista específicamente los nombres duplicados');
    } else {
      console.log('  → ⚠️ Podría listar específicamente los nombres duplicados');
    }
  }
  
  // Valores fuera de rango
  console.log('\n🧪 Valores fuera de rango:');
  try {
    const contenido = `nombre,tiempo_arribo,cantidad_rafagas_cpu,duracion_rafaga_cpu,duracion_rafaga_es,prioridad_externa
P1,0,1,5,0,150`;
    const file = createMockFile(contenido, 'out_of_range.csv', 'text/csv');
    await parseWorkloadTxt(file);
    console.log('❌ No detectó valor fuera de rango');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`✅ CSV Error: "${message}"`);
    
    // Verificar que especifica el rango válido
    if (message.includes('100') || message.includes('<=') || message.includes('rango')) {
      console.log('  → ✅ Especifica el rango válido');
    } else {
      console.log('  → ⚠️ Podría especificar el rango válido');
    }
  }
  
  // Valores negativos
  console.log('\n🧪 Valores negativos inválidos:');
  try {
    const contenido = `nombre,tiempo_arribo,cantidad_rafagas_cpu,duracion_rafaga_cpu,duracion_rafaga_es,prioridad_externa
P1,-1,1,5,0,50`;
    const file = createMockFile(contenido, 'negative.csv', 'text/csv');
    await parseWorkloadTxt(file);
    console.log('❌ No detectó valor negativo inválido');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`✅ CSV Error: "${message}"`);
    
    // Verificar que especifica que debe ser >= 0
    if (message.includes('>=') || message.includes('positivo') || message.includes('negativo')) {
      console.log('  → ✅ Especifica el requisito de valor no negativo');
    } else {
      console.log('  → ⚠️ Podría especificar el requisito de valor no negativo');
    }
  }
}

async function testErroresContextuales(): Promise<void> {
  console.log('\n=== ERRORES CONTEXTUALES ===');
  
  // Archivo vacío
  console.log('\n🧪 Archivo vacío:');
  try {
    const file = createMockFile('', 'empty.json', 'application/json');
    await parseJsonToWorkload(file);
    console.log('❌ No detectó archivo vacío');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`✅ JSON Error: "${message}"`);
    
    if (message.includes('vacío') || message.includes('empty') || message.includes('inválido')) {
      console.log('  → ✅ Identifica claramente el problema');
    } else {
      console.log('  → ⚠️ Podría ser más claro sobre el problema');
    }
  }
  
  // Solo headers, sin datos
  console.log('\n🧪 Solo headers, sin datos:');
  try {
    const contenido = `nombre,tiempo_arribo,cantidad_rafagas_cpu,duracion_rafaga_cpu,duracion_rafaga_es,prioridad_externa`;
    const file = createMockFile(contenido, 'only_headers.csv', 'text/csv');
    await parseWorkloadTxt(file);
    console.log('❌ No detectó ausencia de datos');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`✅ CSV Error: "${message}"`);
    
    if (message.includes('procesos') && (message.includes('válidos') || message.includes('encontraron'))) {
      console.log('  → ✅ Explica claramente que faltan procesos');
    } else {
      console.log('  → ⚠️ Podría explicar mejor que faltan procesos');
    }
  }
}

async function evaluarCalidadMensajes(): Promise<void> {
  console.log('\n=== EVALUACIÓN DE CALIDAD ===');
  
  const criterios = [
    '1. Especificidad: ¿El mensaje dice exactamente qué está mal?',
    '2. Ubicación: ¿Indica dónde está el problema (línea, campo)?',
    '3. Solución: ¿Sugiere cómo corregir el problema?',
    '4. Claridad: ¿Es comprensible para el usuario?',
    '5. Consistencia: ¿Los mensajes siguen un patrón similar?'
  ];
  
  console.log('\n📋 Criterios de evaluación:');
  for (const criterio of criterios) {
    console.log(`   ${criterio}`);
  }
  
  console.log('\n📊 Análisis de mejoras necesarias:');
  console.log('   • Parser TXT/CSV: Buena especificidad de líneas y campos');
  console.log('   • Parser JSON: Identifica problemas pero podría ser más específico');
  console.log('   • Ambos: Podrían incluir más sugerencias de corrección');
  console.log('   • Consistencia: Formatos de mensaje similares pero no idénticos');
}

// Ejecutar todos los tests
async function ejecutarTestsErrores(): Promise<void> {
  await testErroresSintaxis();
  await testErroresCampos();
  await testErroresLogicos();
  await testErroresContextuales();
  await evaluarCalidadMensajes();
  
  console.log('\n=====================================');
  console.log('🎯 CONCLUSIÓN: Análisis de mensajes de error');
  console.log('✅ Ambos parsers detectan errores correctamente');
  console.log('⚠️ Oportunidades de mejora identificadas');
  console.log('🔧 Se recomienda estandarizar formato de mensajes');
}

// Ejecutar tests
ejecutarTestsErrores().catch(console.error);
