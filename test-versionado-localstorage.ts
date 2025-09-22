#!/usr/bin/env npx tsx

/**
 * Test del sistema de versionado de localStorage
 */

import { 
  guardarDatosSimulacion, 
  cargarDatosSimulacion, 
  limpiarDatosSimulacion,
  SCHEMA_VERSION,
  type DatosSimulacionCompleta,
  type DatosVersionados 
} from './src/lib/application/simuladorLogic.js';

// Mock localStorage para testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

// Reemplazar localStorage global
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

console.log('🧪 TEST: Sistema de versionado localStorage');
console.log('=========================================');

// Datos de prueba
const datosSimulacionPrueba: DatosSimulacionCompleta = {
  procesos: [
    { nombre: 'P1', llegada: 0, rafaga: 5, prioridad: 1 },
    { nombre: 'P2', llegada: 2, rafaga: 3, prioridad: 2 }
  ],
  configuracion: {
    policy: 'FCFS',
    tip: 1,
    tfp: 1,
    tcp: 1,
    quantum: undefined
  },
  resultados: {
    events: [],
    metrics: {
      tiempoPromedio: 10,
      tiempoEspera: 5,
      tiempoRespuesta: 3,
      throughput: 0.2,
      utilizacionCPU: 80
    },
    warnings: [],
    tiempoTotal: 15
  },
  timestamp: '2025-01-01T00:00:00.000Z'
};

console.log('📋 Configuración de prueba:');
console.log(`  Schema actual: v${SCHEMA_VERSION}`);
console.log(`  Procesos: ${datosSimulacionPrueba.procesos.length}`);
console.log('');

// Test 1: Guardado y carga básica con versionado
console.log('📊 Test 1: Guardado y carga versionada');
localStorageMock.clear();

guardarDatosSimulacion(datosSimulacionPrueba);
const cargados1 = cargarDatosSimulacion();

if (cargados1 && cargados1.procesos.length === 2 && cargados1.configuracion.policy === 'FCFS') {
  console.log('✅ Guardado/carga versionada: CORRECTO');
} else {
  console.log('❌ Guardado/carga versionada: FALLÓ');
  throw new Error('Test 1 falló');
}

// Verificar estructura interna versionada
const rawData1 = localStorageMock.getItem('ultimaSimulacion');
const parsed1 = JSON.parse(rawData1!) as DatosVersionados;

if (parsed1.version === SCHEMA_VERSION && parsed1.data && parsed1.metadata) {
  console.log('✅ Estructura versionada: CORRECTA');
  console.log(`  Version: ${parsed1.version}`);
  console.log(`  Metadata timestamp: ${parsed1.metadata.timestamp}`);
} else {
  console.log('❌ Estructura versionada: INCORRECTA');
  throw new Error('Estructura versionada malformada');
}

// Test 2: Manejo de esquema incompatible
console.log('');
console.log('📊 Test 2: Esquema incompatible');

const datosVersionIncorrecta: DatosVersionados = {
  version: '0.9.0', // Versión antigua ficticia
  data: datosSimulacionPrueba,
  metadata: {
    timestamp: '2024-12-01T00:00:00.000Z',
    appVersion: '0.9.0'
  }
};

localStorageMock.clear();
localStorageMock.setItem('ultimaSimulacion', JSON.stringify(datosVersionIncorrecta));

const cargados2 = cargarDatosSimulacion();

if (cargados2 === null) {
  console.log('✅ Invalidación esquema incompatible: CORRECTO');
  
  // Verificar que se limpió localStorage
  const rawDataAfter = localStorageMock.getItem('ultimaSimulacion');
  if (rawDataAfter === null) {
    console.log('✅ Limpieza automática: CORRECTO');
  } else {
    console.log('❌ Limpieza automática: FALLÓ');
    throw new Error('No se limpió localStorage automáticamente');
  }
} else {
  console.log('❌ Invalidación esquema incompatible: FALLÓ');
  throw new Error('Test 2 falló - debería haber rechazado esquema antiguo');
}

// Test 3: Migración de formato legacy
console.log('');
console.log('📊 Test 3: Migración formato legacy');

localStorageMock.clear();
// Simular datos guardados en formato legacy (sin versionado)
localStorageMock.setItem('ultimaSimulacion', JSON.stringify(datosSimulacionPrueba));

const cargados3 = cargarDatosSimulacion();

if (cargados3 && cargados3.procesos.length === 2) {
  console.log('✅ Migración legacy: CORRECTO');
  
  // Verificar que ahora está en formato versionado
  const rawData3 = localStorageMock.getItem('ultimaSimulacion');
  const parsed3 = JSON.parse(rawData3!) as DatosVersionados;
  
  if (parsed3.version === SCHEMA_VERSION) {
    console.log('✅ Migración a formato versionado: CORRECTO');
  } else {
    console.log('❌ Migración a formato versionado: FALLÓ');
    throw new Error('No se migró a formato versionado');
  }
} else {
  console.log('❌ Migración legacy: FALLÓ');
  throw new Error('Test 3 falló - no se migró el formato legacy');
}

// Test 4: Formato corrupto/desconocido
console.log('');
console.log('📊 Test 4: Datos corruptos');

localStorageMock.clear();
localStorageMock.setItem('ultimaSimulacion', '{"formato": "desconocido", "data": "corrupto"}');

const cargados4 = cargarDatosSimulacion();

if (cargados4 === null) {
  console.log('✅ Manejo datos corruptos: CORRECTO');
  
  // Verificar limpieza
  const rawData4 = localStorageMock.getItem('ultimaSimulacion');
  if (rawData4 === null) {
    console.log('✅ Limpieza datos corruptos: CORRECTO');
  } else {
    console.log('❌ Limpieza datos corruptos: FALLÓ');
  }
} else {
  console.log('❌ Manejo datos corruptos: FALLÓ');
  throw new Error('Test 4 falló - debería haber rechazado datos corruptos');
}

// Test 5: JSON malformado
console.log('');
console.log('📊 Test 5: JSON malformado');

localStorageMock.clear();
localStorageMock.setItem('ultimaSimulacion', '{"incomplete": json}'); // JSON inválido

const cargados5 = cargarDatosSimulacion();

if (cargados5 === null) {
  console.log('✅ Manejo JSON malformado: CORRECTO');
} else {
  console.log('❌ Manejo JSON malformado: FALLÓ');
  throw new Error('Test 5 falló - debería haber manejado JSON malformado');
}

console.log('');
console.log('🎯 RESUMEN:');
console.log('============');
console.log('✅ Guardado/carga versionada funciona');
console.log('✅ Invalidación esquemas incompatibles');
console.log('✅ Migración automática formato legacy');
console.log('✅ Manejo robusto de datos corruptos');
console.log('✅ Recuperación de errores de parseo');
console.log('');
console.log('📚 BENEFICIOS:');
console.log('- Previene "resultados raros" por cambios de esquema');
console.log('- Migración transparente de datos legacy');
console.log('- Recuperación automática de errores');
console.log('- Trazabilidad de versiones en localStorage');

console.log('');
console.log('🎯 TEST VERSIONADO COMPLETADO');
console.log('=============================');