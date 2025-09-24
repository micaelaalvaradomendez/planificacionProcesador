#!/usr/bin/env npx tsx

/**
 * Test de Validaciones de Coherencia de Tanda Corregido
 * Usa los tipos del dominio correctos y verifica las validaciones endurecidas
 */

import { validarTandaDeProcesos, validarProceso, validarConfiguracion, validarCargaTrabajoCompleta } from '../../src/lib/domain/validators';
import type { CargaTrabajo, ProcesData, ParametrosProces } from '../../src/lib/domain/types';

console.log('🧪 TEST: Validaciones de Coherencia de Tanda Corregido');
console.log('=====================================================');
console.log('');

// Test 1: Validaciones básicas de proceso individual
console.log('📝 Test 1: Validaciones Básicas de Proceso Individual');
console.log('---------------------------------------------------');

const procesoValido: ProcesData = {
  nombre: 'P1',
  arribo: 0,
  rafagasCPU: 2,
  duracionCPU: 10,
  duracionIO: 5,
  prioridad: 50
};

const procesoConMultiplesRafagasSinIO: ProcesData = {
  nombre: 'P2',
  arribo: 0,
  rafagasCPU: 3,  // ¡Múltiples ráfagas!
  duracionCPU: 10,
  duracionIO: 0,  // ¡Pero sin E/S! → Error crítico
  prioridad: 50
};

const procesoConIOSinUso: ProcesData = {
  nombre: 'P3',
  arribo: 0,
  rafagasCPU: 1,  // ¡Solo una ráfaga!
  duracionCPU: 10,
  duracionIO: 5,  // ¡Pero con E/S configurada! → Inconsistencia
  prioridad: 50
};

console.log('Testando proceso válido...');
const erroresValido = validarProceso(procesoValido);
console.log(`✅ Proceso válido: ${erroresValido.length} errores`);
if (erroresValido.length > 0) {
  console.log('  Errores:', erroresValido);
}

console.log('\nTestando proceso con múltiples ráfagas sin E/S...');
const erroresMultiplesRafagas = validarProceso(procesoConMultiplesRafagasSinIO);
console.log(`❌ Proceso múltiples ráfagas sin E/S: ${erroresMultiplesRafagas.length} errores`);
console.log('  Errores:', erroresMultiplesRafagas);

console.log('\nTestando proceso con E/S sin uso...');
const erroresIOSinUso = validarProceso(procesoConIOSinUso);
console.log(`❌ Proceso E/S sin uso: ${erroresIOSinUso.length} errores`);
console.log('  Errores:', erroresIOSinUso);

console.log('');

// Test 2: Validaciones de configuración
console.log('📝 Test 2: Validaciones de Configuración por Política');
console.log('----------------------------------------------------');

const configValidaRR: ParametrosProces = {
  TIP: 1,
  TFP: 1, 
  TCP: 2,
  quantum: 5,
  policy: 'RR'
};

const configRRSinQuantum: ParametrosProces = {
  TIP: 1,
  TFP: 1,
  TCP: 2,
  // quantum: undefined,  // ¡Sin quantum para RR!
  policy: 'RR'
};

const configRRQuantumPequeno: ParametrosProces = {
  TIP: 1,
  TFP: 1,
  TCP: 5,
  quantum: 3,  // ¡Quantum menor que 2×TCP!
  policy: 'RR'
};

const configFCFSConQuantum: ParametrosProces = {
  TIP: 1,
  TFP: 1,
  TCP: 2,
  quantum: 10,  // ¡FCFS no necesita quantum!
  policy: 'FCFS'
};

console.log('Configuración RR válida...');
const erroresConfigValida = validarConfiguracion(configValidaRR);
console.log(`✅ Config RR válida: ${erroresConfigValida.length} errores`);

console.log('\nConfiguración RR sin quantum...');
const erroresRRSinQuantum = validarConfiguracion(configRRSinQuantum);
console.log(`❌ Config RR sin quantum: ${erroresRRSinQuantum.length} errores`);
console.log('  Errores:', erroresRRSinQuantum);

console.log('\nConfiguración RR quantum pequeño...');
const erroresRRQuantumPequeno = validarConfiguracion(configRRQuantumPequeno);
console.log(`❌ Config RR quantum pequeño: ${erroresRRQuantumPequeno.length} errores`);
console.log('  Errores:', erroresRRQuantumPequeno);

console.log('\nConfiguración FCFS con quantum...');
const erroresFCFSConQuantum = validarConfiguracion(configFCFSConQuantum);
console.log(`❌ Config FCFS con quantum: ${erroresFCFSConQuantum.length} errores`);
console.log('  Errores:', erroresFCFSConQuantum);

console.log('');

// Test 3: Validaciones cruzadas de tanda completa
console.log('📝 Test 3: Validaciones Cruzadas de Tanda Completa');
console.log('-------------------------------------------------');

// Tanda con nombres duplicados
const cargaNombresDuplicados: CargaTrabajo = {
  procesos: [
    { nombre: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 50 },
    { nombre: 'P1', arribo: 2, rafagasCPU: 1, duracionCPU: 15, duracionIO: 0, prioridad: 60 },  // ¡Nombre duplicado!
    { nombre: 'P2', arribo: 5, rafagasCPU: 1, duracionCPU: 8, duracionIO: 0, prioridad: 40 }
  ],
  parametros: {
    TIP: 1, TFP: 1, TCP: 2, policy: 'FCFS'
  }
};

// Tanda Priority con todas las prioridades iguales
const cargaPrioridadesIguales: CargaTrabajo = {
  procesos: [
    { nombre: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 50 },
    { nombre: 'P2', arribo: 2, rafagasCPU: 1, duracionCPU: 15, duracionIO: 0, prioridad: 50 },  // ¡Misma prioridad!
    { nombre: 'P3', arribo: 5, rafagasCPU: 1, duracionCPU: 8, duracionIO: 0, prioridad: 50 }   // ¡Misma prioridad!
  ],
  parametros: {
    TIP: 1, TFP: 1, TCP: 2, policy: 'PRIORITY'
  }
};

// Tanda SPN con todas las ráfagas iguales
const cargaSPNRafagasIguales: CargaTrabajo = {
  procesos: [
    { nombre: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 50 },
    { nombre: 'P2', arribo: 2, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 60 },  // ¡Misma duración!
    { nombre: 'P3', arribo: 5, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 40 }   // ¡Misma duración!
  ],
  parametros: {
    TIP: 1, TFP: 1, TCP: 2, policy: 'SPN'
  }
};

// Tanda RR con quantum muy grande
const cargaRRQuantumGrande: CargaTrabajo = {
  procesos: [
    { nombre: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 50 },
    { nombre: 'P2', arribo: 2, rafagasCPU: 1, duracionCPU: 8, duracionIO: 0, prioridad: 60 },
    { nombre: 'P3', arribo: 5, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 40 }
  ],
  parametros: {
    TIP: 1, TFP: 1, TCP: 2, quantum: 20, policy: 'RR'  // ¡Quantum mayor que todas las ráfagas!
  }
};

console.log('Tanda con nombres duplicados...');
const validacionNombresDuplicados = validarCargaTrabajoCompleta(cargaNombresDuplicados);
console.log(`❌ Nombres duplicados: ${validacionNombresDuplicados.errores.length} errores críticos, ${validacionNombresDuplicados.advertencias.length} advertencias`);
console.log('  Errores críticos:', validacionNombresDuplicados.errores);
console.log('  Válida:', validacionNombresDuplicados.valido);

console.log('\nTanda Priority con prioridades iguales...');
const validacionPrioridadesIguales = validarCargaTrabajoCompleta(cargaPrioridadesIguales);
console.log(`⚠️ Prioridades iguales: ${validacionPrioridadesIguales.errores.length} errores críticos, ${validacionPrioridadesIguales.advertencias.length} advertencias`);
console.log('  Advertencias:', validacionPrioridadesIguales.advertencias);

console.log('\nTanda SPN con ráfagas iguales...');
const validacionSPNRafagasIguales = validarCargaTrabajoCompleta(cargaSPNRafagasIguales);
console.log(`⚠️ SPN ráfagas iguales: ${validacionSPNRafagasIguales.errores.length} errores críticos, ${validacionSPNRafagasIguales.advertencias.length} advertencias`);
console.log('  Advertencias:', validacionSPNRafagasIguales.advertencias);

console.log('\nTanda RR con quantum muy grande...');
const validacionRRQuantumGrande = validarCargaTrabajoCompleta(cargaRRQuantumGrande);
console.log(`⚠️ RR quantum grande: ${validacionRRQuantumGrande.errores.length} errores críticos, ${validacionRRQuantumGrande.advertencias.length} advertencias`);
console.log('  Advertencias:', validacionRRQuantumGrande.advertencias);

console.log('');

// Test 4: Tanda válida completa
console.log('📝 Test 4: Tanda Válida Completa');
console.log('-------------------------------');

const cargaValida: CargaTrabajo = {
  procesos: [
    { nombre: 'P1', arribo: 0, rafagasCPU: 2, duracionCPU: 10, duracionIO: 3, prioridad: 70 },
    { nombre: 'P2', arribo: 2, rafagasCPU: 1, duracionCPU: 15, duracionIO: 0, prioridad: 50 },
    { nombre: 'P3', arribo: 5, rafagasCPU: 3, duracionCPU: 5, duracionIO: 2, prioridad: 90 }
  ],
  parametros: {
    TIP: 1, TFP: 1, TCP: 2, quantum: 8, policy: 'RR'
  }
};

const validacionCompleta = validarCargaTrabajoCompleta(cargaValida);
console.log(`Tanda válida: ${validacionCompleta.errores.length} errores críticos, ${validacionCompleta.advertencias.length} advertencias`);
console.log('Válida:', validacionCompleta.valido);

if (validacionCompleta.errores.length > 0) {
  console.log('Errores críticos:', validacionCompleta.errores);
}
if (validacionCompleta.advertencias.length > 0) {
  console.log('Advertencias:', validacionCompleta.advertencias);
}

// Resumen final
console.log('');
console.log('📊 RESUMEN DEL TEST');
console.log('==================');

let todoCorrecto = true;

// Verificar que se detectaron los errores esperados
if (!validacionNombresDuplicados.errores.some(e => e.includes('CRÍTICO') && e.includes('únicos'))) {
  console.log('❌ ERROR: No se detectó nombres duplicados');
  todoCorrecto = false;
}

if (erroresRRSinQuantum.length === 0) {
  console.log('❌ ERROR: No se detectó RR sin quantum');
  todoCorrecto = false;
}

if (erroresMultiplesRafagas.length === 0) {
  console.log('❌ ERROR: No se detectó múltiples ráfagas sin E/S');
  todoCorrecto = false;
}

if (erroresIOSinUso.length === 0) {
  console.log('❌ ERROR: No se detectó E/S sin uso');
  todoCorrecto = false;
}

if (validacionCompleta.valido === false) {
  console.log('❌ ERROR: Tanda válida marcada como inválida');
  todoCorrecto = false;
}

if (todoCorrecto) {
  console.log('✅ TODOS LOS TESTS PASARON CORRECTAMENTE');
  console.log('   Las validaciones de coherencia están funcionando bien');
} else {
  console.log('❌ ALGUNOS TESTS FALLARON');
  console.log('   Revisar las validaciones');
  process.exit(1);
}
