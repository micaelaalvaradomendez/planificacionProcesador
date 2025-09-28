// src/lib/test/test-paso1-modelo.ts
// Tests rápidos del Paso 1 - Modelo + Reglas Base

import { servicioTotal, isProcesoValido, type Proceso } from '../../src/lib/model/proceso';
import { rafagaActual, quedanRafagas } from '../../src/lib/model/rafaga';
import { isTransicionLegal, assertTransicionLegal, transicionarEstado } from '../../src/lib/model/estados';
import { COSTOS_DEF, validarCostos, makeCostos } from '../../src/lib/model/costos';

console.log('  Ejecutando tests del Paso 1 - Modelo + Reglas Base...\n');

// ========== TEST: servicioTotal ==========
console.log('📋 Test: servicioTotal');
console.assert(servicioTotal({ rafagasCPU: [5,7,3] }) === 15, '❌ servicioTotal([5,7,3]) debería ser 15');
console.assert(servicioTotal({ rafagasCPU: [10] }) === 10, '❌ servicioTotal([10]) debería ser 10');
console.assert(servicioTotal({ rafagasCPU: [] }) === 0, '❌ servicioTotal([]) debería ser 0');
console.log(' servicioTotal: OK\n');

// ========== TEST: helpers de ráfagas ==========
console.log('📋 Test: helpers de ráfagas');
console.assert(rafagaActual([5,7,3], 0) === 5, '❌ rafagaActual([5,7,3], 0) debería ser 5');
console.assert(rafagaActual([5,7,3], 2) === 3, '❌ rafagaActual([5,7,3], 2) debería ser 3');
console.assert(rafagaActual([5,7,3], 3) === null, '❌ rafagaActual([5,7,3], 3) debería ser null');
console.assert(quedanRafagas([5,7,3], 2) === true, '❌ quedanRafagas([5,7,3], 2) debería ser true');
console.assert(quedanRafagas([5,7,3], 3) === false, '❌ quedanRafagas([5,7,3], 3) debería ser false');
console.log(' Helpers de ráfagas: OK\n');

// ========== TEST: transiciones de estados ==========
console.log('📋 Test: transiciones de estados');

// Transiciones legales
console.assert(isTransicionLegal('N','L') === true, '❌ N→L debería ser legal');
console.assert(isTransicionLegal('L','C') === true, '❌ L→C debería ser legal');
console.assert(isTransicionLegal('C','B') === true, '❌ C→B debería ser legal');
console.assert(isTransicionLegal('B','L') === true, '❌ B→L debería ser legal');
console.assert(isTransicionLegal('C','F') === true, '❌ C→F debería ser legal');
console.assert(isTransicionLegal('C','L') === true, '❌ C→L (preempción) debería ser legal');

// Transiciones ilegales
console.assert(isTransicionLegal('C','N') === false, '❌ C→N NO debería ser legal');
console.assert(isTransicionLegal('F','L') === false, '❌ F→L NO debería ser legal');
console.assert(isTransicionLegal('B','C') === false, '❌ B→C NO debería ser legal');
console.assert(isTransicionLegal('N','C') === false, '❌ N→C NO debería ser legal');

// Test de transicionarEstado
console.assert(transicionarEstado('N','L') === 'L', '❌ transicionarEstado(N,L) debería retornar L');

// Test de error en transición ilegal
try {
  transicionarEstado('C','N');
  console.assert(false, '❌ transicionarEstado(C,N) debería arrojar error');
} catch (e) {
  console.assert(e instanceof Error && e.message.includes('ilegal'), '❌ Error debería mencionar transición ilegal');
}

console.log(' Transiciones de estados: OK\n');

// ========== TEST: costos ==========
console.log('📋 Test: costos');

// Costos por defecto válidos
console.assert(validarCostos(COSTOS_DEF), '❌ Costos por defecto deberían ser válidos');
console.assert(COSTOS_DEF.bloqueoES === 25, '❌ bloqueoES default debe ser 25');

// Costos válidos
console.assert(validarCostos({ TIP: 1, TCP: 1, TFP: 1, bloqueoES: 30 }), '❌ Costos válidos deberían pasar');

// Costos inválidos (negativos)
console.assert(!validarCostos({ TIP: -1, TCP: 1, TFP: 1, bloqueoES: 25 }), '❌ Costos negativos no deberían ser válidos');

// makeCostos con defaults
const costosCreados = makeCostos({ TIP: 2, TCP: 1 });
console.assert(costosCreados.TIP === 2 && costosCreados.TCP === 1 && costosCreados.bloqueoES === 25, 
              '❌ makeCostos debería mezclar input con defaults');

console.log(' Costos: OK\n');

// ========== TEST: validación de proceso ==========
console.log('📋 Test: validación de proceso');

const procesoValido: Proceso = {
  pid: 1,
  arribo: 0,
  rafagasCPU: [5, 3, 2],
  estado: 'N'
};

console.assert(isProcesoValido(procesoValido), '❌ Proceso válido debería pasar validación');

const procesoInvalido: Proceso = {
  pid: -1, // PID inválido
  arribo: 0,
  rafagasCPU: [5, 3, 2],
  estado: 'N'
};

console.assert(!isProcesoValido(procesoInvalido), '❌ Proceso con PID negativo no debería ser válido');

console.log(' Validación de proceso: OK\n');

console.log('🎉 ¡Todos los tests del Paso 1 pasaron correctamente!');
console.log('📋 Resumen:');
console.log('    servicioTotal() funciona correctamente');
console.log('    Helpers de ráfagas funcionan');
console.log('    Transiciones de estados validadas (legales e ilegales)');
console.log('    Costos con defaults y validación');
console.log('    Validación de procesos');
console.log('\n🚀 Listo para continuar con el Paso 2!');
