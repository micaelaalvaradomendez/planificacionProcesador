#!/usr/bin/env npx tsx

/**
 * 🧪 SUITE COMPLETA DE TESTS DEL INTEGRADOR
 * =========================================
 * 
 * Ejecuta todos los tests necesarios para demostrar que el simulador:
 * 1. Cumple con la consigna del integrador
 * 2. Está alineado con la teoría en research/
 * 3. Maneja correctamente todos los formatos de entrada
 * 4. Implementa correctamente cada política de planificación
 * 5. Calcula métricas según las especificaciones
 */

console.log('🧪 SUITE COMPLETA DE TESTS - SIMULADOR PLANIFICACION');
console.log('====================================================');
console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
console.log('');

// Importar todos los módulos de tests
import { ejecutarTodosLosTests as testConsigna } from './consigna/test-consigna-completa.js';
import { ejecutarTodosLosTests as testTeoriaAlgoritmos } from './teoria/test-algoritmos-teoria.js';
import { ejecutarTodosLosTests as testTransiciones } from './teoria/test-transiciones-estados.js';
import { ejecutarTodosLosTests as testEficiencia } from './teoria/test-eficiencia-rendimiento.js';
import { ejecutarTodosLosTests as testFormatos } from './integracion/test-formato-archivos.js';
import { ejecutarTodosLosTests as testMetricas } from './integracion/test-metricas-calculo.js';
import { ejecutarTodosLosTests as testPoliticas } from './unitarios/test-politicas-planificacion.js';

// ===== FUNCIÓN PRINCIPAL =====

async function ejecutarTodosLosTestsDelIntegrador(): Promise<void> {
  console.log('\n🚀 INICIANDO EJECUCIÓN DE TODOS LOS TESTS');
  console.log('=========================================\n');
  
  const suites = [
    { nombre: '🎯 CONSIGNA COMPLETA', test: testConsigna },
    { nombre: '📚 ALGORITMOS TEORIA', test: testTeoriaAlgoritmos },
    { nombre: '🔄 TRANSICIONES ESTADOS', test: testTransiciones },
    { nombre: '📊 EFICIENCIA RENDIMIENTO', test: testEficiencia },
    { nombre: '📋 FORMATO ARCHIVOS', test: testFormatos },
    { nombre: '📈 MÉTRICAS CÁLCULO', test: testMetricas },
    { nombre: '🔧 POLÍTICAS UNITARIO', test: testPoliticas }
  ];
  
  let suitesTotales = 0;
  let suitesPasadas = 0;
  
  for (const { nombre, test } of suites) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 EJECUTANDO: ${nombre}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const inicio = Date.now();
      await test();
      const duracion = Date.now() - inicio;
      
      console.log(`\n✅ ${nombre} - COMPLETADO (${duracion}ms)`);
      suitesPasadas++;
    } catch (error) {
      console.error(`\n❌ ${nombre} - ERROR:`);
      console.error(error);
    }
    
    suitesTotales++;
    
    // Pausa entre suites
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // ===== RESUMEN FINAL =====
  console.log('\n' + '='.repeat(80));
  console.log('🎯 RESUMEN FINAL - SUITE COMPLETA DEL INTEGRADOR');
  console.log('='.repeat(80));
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
  console.log(`⏱️  Suites ejecutadas: ${suitesTotales}`);
  console.log(`✅ Suites exitosas: ${suitesPasadas}`);
  console.log(`❌ Suites fallidas: ${suitesTotales - suitesPasadas}`);
  console.log(`📈 Porcentaje éxito: ${((suitesPasadas / suitesTotales) * 100).toFixed(1)}%`);
  
  if (suitesPasadas === suitesTotales) {
    console.log('\n🎉 ¡TODOS LOS TESTS DEL INTEGRADOR PASARON!');
    console.log('   El simulador está completamente validado:');
    console.log('   ✅ Cumple con la consigna del integrador');
    console.log('   ✅ Refleja la teoría de algoritmos correctamente');
    console.log('   ✅ Maneja todos los formatos de entrada');
    console.log('   ✅ Implementa las políticas según especificación');
    console.log('   ✅ Calcula métricas con precisión');
    console.log('   ✅ Gestiona transiciones de estado correctamente');
    console.log('   ✅ Produce resultados eficientes y consistentes');
  } else {
    console.log('\n⚠️  ALGUNOS TESTS FALLARON');
    console.log('   Revisar implementación antes del entrega final');
  }
  
  console.log('\n🏁 FIN DE LA SUITE DE TESTS DEL INTEGRADOR');
  console.log('=' .repeat(80));
}

// Ejecutar suite completa si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  ejecutarTodosLosTestsDelIntegrador().catch(console.error);
}

export { ejecutarTodosLosTestsDelIntegrador };