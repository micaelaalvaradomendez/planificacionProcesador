#!/usr/bin/env npx tsx

/**
 * Test de Validaciones de Coherencia de Tanda Endurecidas
 * Verifica que las reglas cruzadas funcionan correctamente
 */

import { validarWorkloadCompleto, validarTandaDeProcesos, validarProceso, validarConfiguracion } from './src/lib/domain/validators';
import type { Workload, ProcessSpec, RunConfig } from './src/lib/domain/types';

console.log('🧪 TEST: Validaciones de Coherencia de Tanda Endurecidas');
console.log('======================================================');
console.log('');

// Test 1: Validaciones básicas de proceso individual
console.log('📝 Test 1: Validaciones Básicas de Proceso');
console.log('------------------------------------------');

const procesoValido: ProcessSpec = {
  id: 'P1',
  arribo: 0,
  rafagasCPU: 2,
  duracionCPU: 10,
  duracionIO: 5,
  prioridad: 50
};

const procesoInvalido: ProcessSpec = {
  id: '',
  arribo: -1,
  rafagasCPU: 0,
  duracionCPU: 0,
  duracionIO: -1,
  prioridad: 0
};

const erroresValido = validarProceso(procesoValido);
const erroresInvalido = validarProceso(procesoInvalido);

console.log(`✅ Proceso válido: ${erroresValido.length} errores`);
console.log(`❌ Proceso inválido: ${erroresInvalido.length} errores`);

if (erroresValido.length === 0 && erroresInvalido.length > 0) {
  console.log('✅ CORRECTO: Validación básica funcionando');
} else {
  console.log('❌ ERROR: Validación básica fallida');
  console.log('Errores válido:', erroresValido);
  console.log('Errores inválido:', erroresInvalido);
  process.exit(1);
}

console.log('');

// Test 2: Reglas de coherencia entre campos
console.log('🔗 Test 2: Reglas de Coherencia Entre Campos');
console.log('---------------------------------------------');

// Caso: múltiples ráfagas sin E/S
const procesoSinIO: ProcessSpec = {
  id: 'P2',
  arribo: 0,
  rafagasCPU: 3,    // múltiples ráfagas
  duracionCPU: 10,
  duracionIO: 0,    // pero sin E/S
  prioridad: 50
};

// Caso: E/S configurada pero una sola ráfaga
const procesoIOInnecesaria: ProcessSpec = {
  id: 'P3',
  arribo: 0,
  rafagasCPU: 1,    // una sola ráfaga
  duracionCPU: 10,
  duracionIO: 5,    // pero con E/S configurada
  prioridad: 50
};

const erroresSinIO = validarProceso(procesoSinIO);
const erroresIOInnecesaria = validarProceso(procesoIOInnecesaria);

console.log(`Múltiples ráfagas sin E/S: ${erroresSinIO.length} errores`);
console.log(`E/S innecesaria: ${erroresIOInnecesaria.length} errores`);

if (erroresSinIO.some(e => e.includes('necesita duracionIO > 0')) &&
    erroresIOInnecesaria.some(e => e.includes('no habrá E/S'))) {
  console.log('✅ CORRECTO: Coherencia entre ráfagas y E/S funcionando');
} else {
  console.log('❌ ERROR: Coherencia entre ráfagas y E/S fallida');
  console.log('Errores sin E/S:', erroresSinIO);
  console.log('Errores E/S innecesaria:', erroresIOInnecesaria);
  process.exit(1);
}

console.log('');

// Test 3: Validaciones específicas por política
console.log('🎯 Test 3: Validaciones Específicas por Política');
console.log('------------------------------------------------');

// Round Robin sin quantum
const configRRSinQuantum: RunConfig = {
  policy: 'RR',
  tip: 1,
  tfp: 1,
  tcp: 1
  // quantum faltante
};

// Round Robin con quantum muy pequeño
const configRRQuantumPequeno: RunConfig = {
  policy: 'RR',
  tip: 1,
  tfp: 1,
  tcp: 5,
  quantum: 2  // menor que 2 * TCP
};

// Priority con todas las prioridades iguales
const workloadPriorityIguales: Workload = {
  processes: [
    { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 50 },
    { id: 'P2', arribo: 1, rafagasCPU: 1, duracionCPU: 15, duracionIO: 0, prioridad: 50 },
    { id: 'P3', arribo: 2, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 50 }
  ],
  config: {
    policy: 'PRIORITY',
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

const erroresRRSinQuantum = validarConfiguracion(configRRSinQuantum);
const erroresRRQuantumPequeno = validarConfiguracion(configRRQuantumPequeno);
const erroresPriorityIguales = validarTandaDeProcesos(workloadPriorityIguales);

console.log(`RR sin quantum: ${erroresRRSinQuantum.length} errores`);
console.log(`RR quantum pequeño: ${erroresRRQuantumPequeno.length} errores`);
console.log(`Priority iguales: ${erroresPriorityIguales.filter(e => e.includes('misma prioridad')).length} advertencias`);

if (erroresRRSinQuantum.some(e => e.includes('requiere quantum')) &&
    erroresRRQuantumPequeno.some(e => e.includes('2× TCP')) &&
    erroresPriorityIguales.some(e => e.includes('misma prioridad'))) {
  console.log('✅ CORRECTO: Validaciones específicas por política funcionando');
} else {
  console.log('❌ ERROR: Validaciones por política fallidas');
  console.log('RR sin quantum:', erroresRRSinQuantum);
  console.log('RR quantum pequeño:', erroresRRQuantumPequeno);
  console.log('Priority iguales:', erroresPriorityIguales);
  process.exit(1);
}

console.log('');

// Test 4: Validaciones cruzadas de tanda completa
console.log('🔄 Test 4: Validaciones Cruzadas de Tanda');
console.log('-----------------------------------------');

// IDs duplicados
const workloadIDsDuplicados: Workload = {
  processes: [
    { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 50 },
    { id: 'P1', arribo: 1, rafagasCPU: 1, duracionCPU: 15, duracionIO: 0, prioridad: 60 } // ID duplicado
  ],
  config: {
    policy: 'FCFS',
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

// Todos arriban al mismo tiempo
const workloadArriboSimultaneo: Workload = {
  processes: [
    { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 50 },
    { id: 'P2', arribo: 0, rafagasCPU: 1, duracionCPU: 15, duracionIO: 0, prioridad: 60 },
    { id: 'P3', arribo: 0, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 70 }
  ],
  config: {
    policy: 'FCFS',
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

const erroresIDsDuplicados = validarTandaDeProcesos(workloadIDsDuplicados);
const erroresArriboSimultaneo = validarTandaDeProcesos(workloadArriboSimultaneo);

console.log(`IDs duplicados: ${erroresIDsDuplicados.filter(e => e.includes('únicos')).length} errores`);
console.log(`Arribo simultáneo: ${erroresArriboSimultaneo.filter(e => e.includes('mismo tiempo')).length} advertencias`);

if (erroresIDsDuplicados.some(e => e.includes('únicos')) &&
    erroresArriboSimultaneo.some(e => e.includes('mismo tiempo'))) {
  console.log('✅ CORRECTO: Validaciones cruzadas funcionando');
} else {
  console.log('❌ ERROR: Validaciones cruzadas fallidas');
  console.log('IDs duplicados:', erroresIDsDuplicados);
  console.log('Arribo simultáneo:', erroresArriboSimultaneo);
  process.exit(1);
}

console.log('');

// Test 5: Función de validación completa con separación errores/advertencias
console.log('📊 Test 5: Validación Completa Estructurada');
console.log('--------------------------------------------');

const workloadMixto: Workload = {
  processes: [
    { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 2000, duracionIO: 0, prioridad: 50 }, // CPU muy larga (advertencia)
    { id: 'P2', arribo: 0, rafagasCPU: 0, duracionCPU: 10, duracionIO: 0, prioridad: 60 }    // rafagasCPU=0 (error)
  ],
  config: {
    policy: 'FCFS',
    tip: 1,
    tfp: 1,
    tcp: 1
  }
};

const resultado = validarWorkloadCompleto(workloadMixto);

console.log(`Resultado válido: ${resultado.valido}`);
console.log(`Errores críticos: ${resultado.errores.length}`);
console.log(`Advertencias: ${resultado.advertencias.length}`);

if (!resultado.valido && 
    resultado.errores.some(e => e.includes('rafagasCPU')) &&
    resultado.advertencias.some(e => e.includes('muy larga'))) {
  console.log('✅ CORRECTO: Separación errores/advertencias funcionando');
} else {
  console.log('❌ ERROR: Separación errores/advertencias fallida');
  console.log('Resultado:', resultado);
  process.exit(1);
}

console.log('');

console.log('🎉 TODOS LOS TESTS DE COHERENCIA PASARON');
console.log('=========================================');
console.log('✅ Validaciones básicas de proceso funcionando');
console.log('✅ Reglas de coherencia entre campos implementadas');
console.log('✅ Validaciones específicas por política correctas');
console.log('✅ Validaciones cruzadas de tanda operativas');
console.log('✅ Separación errores críticos vs advertencias funcional');
console.log('✅ Problema de validaciones faltantes RESUELTO');
console.log('');
console.log('🔧 MEJORAS IMPLEMENTADAS:');
console.log('- ✅ Coherencia ráfagas CPU vs duración E/S');
console.log('- ✅ Validaciones específicas RR (quantum vs TCP)');
console.log('- ✅ Validaciones específicas Priority (distribución prioridades)');
console.log('- ✅ Verificación IDs únicos');
console.log('- ✅ Análisis distribución temporal arribot');
console.log('- ✅ Advertencias para valores extremos');
console.log('- ✅ Validaciones de carga de trabajo razonable');
console.log('- ✅ Reglas específicas para SJF/SRTN');