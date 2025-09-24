#!/usr/bin/env npx tsx

/**
 * Test de Validaciones Estrictas Adicionales
 * Verifica las nuevas reglas de coherencia más estrictas
 */

import { validarCargaTrabajoCompleta } from '../../src/lib/domain/validators';
import type { CargaTrabajo } from '../../src/lib/domain/types';

console.log('🧪 TEST: Validaciones Estrictas Adicionales');
console.log('==========================================');
console.log('');

// Test 1: Overhead del SO muy alto
console.log('📝 Test 1: Overhead del SO muy alto');
console.log('----------------------------------');

const cargaOverheadAlto: CargaTrabajo = {
  procesos: [
    { nombre: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 50 },
    { nombre: 'P2', arribo: 1, rafagasCPU: 1, duracionCPU: 2, duracionIO: 0, prioridad: 60 }
  ],
  parametros: {
    TIP: 10, TFP: 10, TCP: 5, policy: 'FCFS'  // ¡TIP+TFP muy altos vs CPU de 2-3u!
  }
};

const validacionOverhead = validarCargaTrabajoCompleta(cargaOverheadAlto);
console.log(`⚠️ Overhead alto: ${validacionOverhead.errores.length} errores, ${validacionOverhead.advertencias.length} advertencias`);
console.log('Advertencias:', validacionOverhead.advertencias.filter(a => a.includes('Overhead')));

// Test 2: Proceso dominado por E/S
console.log('\n📝 Test 2: Proceso dominado por E/S');
console.log('----------------------------------');

const cargaDominadaPorIO: CargaTrabajo = {
  procesos: [
    { nombre: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 50 },
    { nombre: 'P2', arribo: 1, rafagasCPU: 3, duracionCPU: 2, duracionIO: 15, prioridad: 60 }  // ¡E/S muy larga vs CPU!
  ],
  parametros: {
    TIP: 1, TFP: 1, TCP: 1, policy: 'FCFS'
  }
};

const validacionIO = validarCargaTrabajoCompleta(cargaDominadaPorIO);
console.log(`⚠️ E/S dominante: ${validacionIO.errores.length} errores, ${validacionIO.advertencias.length} advertencias`);
console.log('Advertencias:', validacionIO.advertencias.filter(a => a.includes('dominado') || a.includes('ratio')));

// Test 3: Gaps muy grandes entre arribos
console.log('\n📝 Test 3: Gaps muy grandes entre arribos');
console.log('----------------------------------------');

const cargaGapsGrandes: CargaTrabajo = {
  procesos: [
    { nombre: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 50 },
    { nombre: 'P2', arribo: 100, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 60 },  // ¡Gap de 100u!
    { nombre: 'P3', arribo: 200, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 40 }   // ¡Gap de 100u!
  ],
  parametros: {
    TIP: 1, TFP: 1, TCP: 1, policy: 'FCFS'
  }
};

const validacionGaps = validarCargaTrabajoCompleta(cargaGapsGrandes);
console.log(`⚠️ Gaps grandes: ${validacionGaps.errores.length} errores, ${validacionGaps.advertencias.length} advertencias`);
console.log('Advertencias:', validacionGaps.advertencias.filter(a => a.includes('Gap') || a.includes('idle')));

// Test 4: Proceso con hambruna potencial (FCFS con proceso muy largo)
console.log('\n📝 Test 4: Potencial hambruna en FCFS');
console.log('------------------------------------');

const cargaHambruna: CargaTrabajo = {
  procesos: [
    { nombre: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 100, duracionIO: 0, prioridad: 50 },  // ¡Proceso muy largo!
    { nombre: 'P2', arribo: 1, rafagasCPU: 1, duracionCPU: 5, duracionIO: 0, prioridad: 60 },
    { nombre: 'P3', arribo: 2, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 40 }
  ],
  parametros: {
    TIP: 1, TFP: 1, TCP: 1, policy: 'FCFS'  // ¡FCFS con proceso muy largo puede causar hambruna!
  }
};

const validacionHambruna = validarCargaTrabajoCompleta(cargaHambruna);
console.log(`⚠️ Hambruna potencial: ${validacionHambruna.errores.length} errores, ${validacionHambruna.advertencias.length} advertencias`);
console.log('Advertencias:', validacionHambruna.advertencias.filter(a => a.includes('hambruna') || a.includes('largo')));

// Test 5: E/S muy corta vs CPU larga (poco realista)
console.log('\n📝 Test 5: E/S muy corta vs CPU larga');
console.log('-----------------------------------');

const cargaIOCorta: CargaTrabajo = {
  procesos: [
    { nombre: 'P1', arribo: 0, rafagasCPU: 2, duracionCPU: 50, duracionIO: 1, prioridad: 50 },  // ¡E/S de 1u vs CPU de 50u!
    { nombre: 'P2', arribo: 1, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 60 }
  ],
  parametros: {
    TIP: 1, TFP: 1, TCP: 1, policy: 'FCFS'
  }
};

const validacionIOCorta = validarCargaTrabajoCompleta(cargaIOCorta);
console.log(`⚠️ E/S muy corta: ${validacionIOCorta.errores.length} errores, ${validacionIOCorta.advertencias.length} advertencias`);
console.log('Advertencias:', validacionIOCorta.advertencias.filter(a => a.includes('muy corta') || a.includes('realista')));

// Test 6: Priority con orden de arribo igual a orden de prioridad
console.log('\n📝 Test 6: Priority con orden de arribo = orden de prioridad');
console.log('--------------------------------------------------------');

const cargaPriorityOrdenado: CargaTrabajo = {
  procesos: [
    { nombre: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 90 },  // ¡Mayor prioridad arriba primero!
    { nombre: 'P2', arribo: 5, rafagasCPU: 1, duracionCPU: 15, duracionIO: 0, prioridad: 70 },  // ¡Media prioridad arriba segundo!
    { nombre: 'P3', arribo: 10, rafagasCPU: 1, duracionCPU: 8, duracionIO: 0, prioridad: 50 }   // ¡Menor prioridad arriba último!
  ],
  parametros: {
    TIP: 1, TFP: 1, TCP: 1, policy: 'PRIORITY'
  }
};

const validacionPriorityOrdenado = validarCargaTrabajoCompleta(cargaPriorityOrdenado);
console.log(`⚠️ Priority ordenado: ${validacionPriorityOrdenado.errores.length} errores, ${validacionPriorityOrdenado.advertencias.length} advertencias`);
console.log('Advertencias:', validacionPriorityOrdenado.advertencias.filter(a => a.includes('orden') || a.includes('considerar FCFS')));

// Resumen final
console.log('\n📊 RESUMEN DE VALIDACIONES ESTRICTAS');
console.log('===================================');

let advertenciasEncontradas = 0;

if (validacionOverhead.advertencias.some(a => a.includes('Overhead'))) {
  console.log('✅ Se detectó overhead de SO alto');
  advertenciasEncontradas++;
}

if (validacionIO.advertencias.some(a => a.includes('dominado') || a.includes('ratio'))) {
  console.log('✅ Se detectó proceso dominado por E/S');
  advertenciasEncontradas++;
}

if (validacionGaps.advertencias.some(a => a.includes('Gap'))) {
  console.log('✅ Se detectaron gaps grandes entre arribos');
  advertenciasEncontradas++;
}

if (validacionHambruna.advertencias.some(a => a.includes('hambruna'))) {
  console.log('✅ Se detectó potencial hambruna');
  advertenciasEncontradas++;
}

if (validacionIOCorta.advertencias.some(a => a.includes('muy corta'))) {
  console.log('✅ Se detectó E/S muy corta');
  advertenciasEncontradas++;
}

if (validacionPriorityOrdenado.advertencias.some(a => a.includes('orden'))) {
  console.log('✅ Se detectó Priority con orden predecible');
  advertenciasEncontradas++;
}

console.log(`\n🎯 Total de validaciones estrictas trabajando: ${advertenciasEncontradas}/6`);

if (advertenciasEncontradas >= 5) {
  console.log('✅ VALIDACIONES ESTRICTAS FUNCIONANDO CORRECTAMENTE');
  console.log('   El sistema detecta configuraciones problemáticas y subóptimas');
} else {
  console.log('❌ ALGUNAS VALIDACIONES ESTRICTAS NO FUNCIONAN');
  console.log('   Revisar las reglas de coherencia');
  process.exit(1);
}
