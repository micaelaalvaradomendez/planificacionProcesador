#!/usr/bin/env npx tsx

// Test simple para verificar el fix principal
import { cargarArchivo } from '../../src/lib/application/usecases/parseInput';
import fs from 'fs';

async function testMainFix() {
  console.log('🧪 TEST: Verificar fix principal\n');
  
  const content = fs.readFileSync('../../examples/workloads/procesos_tanda_7p.json', 'utf8');
  const file = new File([content], 'procesos_tanda_7p.json', { type: 'application/json' });
  
  console.log('📁 Cargando archivo con configuración de UI...');
  const result = await cargarArchivo(
    file,
    'json',
    'FCFS',    // policy de UI
    2,         // tip de UI  
    1,         // tfp de UI
    1,         // tcp de UI
    undefined  // quantum de UI
  );
  
  if (!result.loaded || !result.workload) {
    console.error('❌ Error cargando archivo:', result.errors);
    return;
  }
  
  console.log('✅ Archivo cargado correctamente');
  console.log('📋 Config del workload:', result.workload.config);
  
  // Verificar que la configuración fue aplicada
  const configOK = 
    result.workload.config.policy === 'FCFS' &&
    result.workload.config.tip === 2 &&
    result.workload.config.tfp === 1 &&
    result.workload.config.tcp === 1;
    
  console.log(`\n🎯 FIX PRINCIPAL: ${configOK ? '✅ FUNCIONANDO' : '❌ FALLANDO'}`);
  
  if (configOK) {
    console.log('✅ La configuración de UI se aplica correctamente a archivos JSON');
    console.log('✅ Este era el problema principal que impedía el cálculo de métricas');
  } else {
    console.log('❌ La configuración de UI no se está aplicando correctamente');
  }
}

testMainFix().catch(console.error);