// src/lib/test/test-import-legacy.ts
import { parseTandaJSON, extractBloqueoESGlobal } from '../../src/lib/io/parser';

console.log('  Test Importador Legacy');

// Simular datos como los que vienen en procesos_tanda_5p.json
const procesosTanda5p = [
  {
    "nombre": "P1",
    "tiempo_arribo": 0,
    "cantidad_rafagas_cpu": 3,
    "duracion_rafaga_cpu": 5,
    "duracion_rafaga_es": 10,
    "prioridad_externa": 2
  },
  {
    "nombre": "P2", 
    "tiempo_arribo": 1,
    "cantidad_rafagas_cpu": 2,
    "duracion_rafaga_cpu": 4,
    "duracion_rafaga_es": 10,
    "prioridad_externa": 1
  },
  {
    "nombre": "P3",
    "tiempo_arribo": 3,
    "cantidad_rafagas_cpu": 1,
    "duracion_rafaga_cpu": 6,
    "duracion_rafaga_es": 10,
    "prioridad_externa": 3
  }
];

console.log('   Test 1: Importación básica');
{
  const procesos = parseTandaJSON(procesosTanda5p);
  
  console.log('📋 Procesos importados:');
  procesos.forEach(p => {
    console.log(`   ${p.label} (pid=${p.pid}): arribo=${p.arribo}, CPU=${JSON.stringify(p.rafagasCPU)}, prioridad=${p.prioridadBase}`);
  });
  
  // Validaciones
  if (procesos.length !== 3) {
    throw new Error(`❌ Esperado 3 procesos, obtenido ${procesos.length}`);
  }
  
  if (procesos[0].pid !== 1 || procesos[0].label !== 'P1') {
    throw new Error('❌ Mapeo de nombre a pid/label incorrecto');
  }
  
  if (procesos[0].rafagasCPU.length !== 3 || procesos[0].rafagasCPU[0] !== 5) {
    throw new Error('❌ Mapeo de ráfagas CPU incorrecto');
  }
  
  if (procesos[1].prioridadBase !== 1) {
    throw new Error('❌ Mapeo de prioridad incorrecto');
  }
  
  console.log(' Test 1 OK - Importación básica funciona');
}

console.log('   Test 2: Extracción bloqueoES global');
{
  const { bloqueoES, warning } = extractBloqueoESGlobal(procesosTanda5p);
  
  console.log(` BloqueoES extraído: ${bloqueoES}`);
  if (warning) {
    console.log(`⚠️  Warning: ${warning}`);
  }
  
  if (bloqueoES !== 10) {
    throw new Error(`❌ Esperado bloqueoES=10, obtenido ${bloqueoES}`);
  }
  
  console.log(' Test 2 OK - Extracción bloqueoES funciona');
}

console.log('   Test 3: Validaciones de entrada');
{
  // Nombre inválido
  try {
    parseTandaJSON([{ 
      nombre: "X999", 
      tiempo_arribo: 0, 
      cantidad_rafagas_cpu: 1, 
      duracion_rafaga_cpu: 5 
    }]);
    throw new Error('❌ Debería haber fallado con nombre inválido');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes('nombre inválido')) {
      throw new Error(`❌ Error incorrecto: ${msg}`);
    }
  }
  
  // Arribo negativo
  try {
    parseTandaJSON([{ 
      nombre: "P1", 
      tiempo_arribo: -1, 
      cantidad_rafagas_cpu: 1, 
      duracion_rafaga_cpu: 5 
    }]);
    throw new Error('❌ Debería haber fallado con arribo negativo');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes('arribo inválido')) {
      throw new Error(`❌ Error incorrecto: ${msg}`);
    }
  }
  
  // Cantidad ráfagas inválida
  try {
    parseTandaJSON([{ 
      nombre: "P1", 
      tiempo_arribo: 0, 
      cantidad_rafagas_cpu: 0, 
      duracion_rafaga_cpu: 5 
    }]);
    throw new Error('❌ Debería haber fallado con cantidad_rafagas_cpu=0');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes('cantidad_rafagas_cpu inválida')) {
      throw new Error(`❌ Error incorrecto: ${msg}`);
    }
  }
  
  console.log(' Test 3 OK - Validaciones funcionan');
}

console.log('   Test 4: BloqueoES con valores diferentes');
{
  const procesosMixtos = [
    { nombre: "P1", tiempo_arribo: 0, cantidad_rafagas_cpu: 1, duracion_rafaga_cpu: 3, duracion_rafaga_es: 5 },
    { nombre: "P2", tiempo_arribo: 1, cantidad_rafagas_cpu: 1, duracion_rafaga_cpu: 2, duracion_rafaga_es: 8 }
  ];
  
  const { bloqueoES, warning } = extractBloqueoESGlobal(procesosMixtos);
  
  if (!warning) {
    throw new Error('❌ Debería haber warning con valores diferentes');
  }
  
  if (bloqueoES !== 5) {
    throw new Error(`❌ Esperado primer valor (5), obtenido ${bloqueoES}`);
  }
  
  console.log(`⚠️  Warning capturado correctamente: ${warning}`);
  console.log(' Test 4 OK - Warning con valores mixtos funciona');
}

console.log('\n   Test importador legacy completado exitosamente!');