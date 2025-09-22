#!/usr/bin/env npx tsx
/**
 * 🧪 TEST RUNNER PRINCIPAL - SIMULADOR DE PLANIFICACIÓN
 * Ejecuta todos los tests esenciales organizados por categorías
 */

import { execSync } from 'child_process';
import path from 'path';

interface TestResult {
  category: string;
  testFile: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const TEST_CATEGORIES = {
  algorithms: [
    'test-fcfs-completo.ts',
    'test-priority-completo.ts', 
    'test-rr-completo.ts',
    'test-spn-completo.ts',
    'test-srtn-completo.ts'
  ],
  core: [
    'test-motor.ts',
    'test-cpu-so.ts',
    'test-cpu-ociosa.ts',
    'test-arribos-simultaneos.ts',
    'test-orden-eventos-simultaneos.ts',
    'test-tiebreak-comprehensivo.ts',
    'test-expropiacion-remanente.ts'
  ],
  functional: [
    'test-srtn-multirafaga.ts',
    'test-politicas-planificacion.ts',
    'test-gantt-parametros.ts',
    'test-exportacion.ts'
  ],
  gantt: [
    'test-construccion-gantt.ts',
    'test-exportacion-gantt.ts'
  ]
};

async function runTest(category: string, testFile: string): Promise<TestResult> {
  const testPath = path.join(__dirname, category, testFile);
  const startTime = Date.now();
  
  try {
    execSync(`npx tsx ${testPath}`, { 
      stdio: 'pipe',
      cwd: path.dirname(__dirname)
    });
    
    return {
      category,
      testFile,
      passed: true,
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      category,
      testFile, 
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function runAllTests(): Promise<void> {
  console.log('🧪 EJECUTANDO TESTS DEL SIMULADOR DE PLANIFICACIÓN');
  console.log('='.repeat(60));
  
  const results: TestResult[] = [];
  let totalTests = 0;
  let passedTests = 0;
  
  for (const [category, testFiles] of Object.entries(TEST_CATEGORIES)) {
    console.log(`\n📁 Categoría: ${category.toUpperCase()}`);
    console.log('-'.repeat(40));
    
    for (const testFile of testFiles) {
      totalTests++;
      console.log(`   🏃 Ejecutando: ${testFile}...`);
      
      const result = await runTest(category, testFile);
      results.push(result);
      
      if (result.passed) {
        passedTests++;
        console.log(`   ✅ PASÓ (${result.duration}ms)`);
      } else {
        console.log(`   ❌ FALLÓ (${result.duration}ms)`);
        if (result.error) {
          console.log(`      Error: ${result.error.slice(0, 100)}...`);
        }
      }
    }
  }
  
  // Resumen final
  console.log('\n📊 RESUMEN DE RESULTADOS');
  console.log('='.repeat(60));
  console.log(`Total de tests: ${totalTests}`);
  console.log(`Tests exitosos: ${passedTests}`);
  console.log(`Tests fallidos: ${totalTests - passedTests}`);
  console.log(`Tasa de éxito: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  // Detalles de tests fallidos
  const failedTests = results.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log('\n❌ TESTS FALLIDOS:');
    failedTests.forEach(test => {
      console.log(`   • ${test.category}/${test.testFile}`);
    });
  }
  
  console.log('\n🏁 Ejecución de tests completada');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Error ejecutando tests:', error);
    process.exit(1);
  });
}

export { runAllTests };