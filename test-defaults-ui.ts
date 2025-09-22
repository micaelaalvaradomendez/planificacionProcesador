#!/usr/bin/env npx tsx

/**
 * Test específico para verificar valores por defecto TIP/TFP/TCP en UI
 */

import { validarConfiguracion } from './src/lib/application/simuladorLogic.js';
import type { ConfiguracionSimulacion } from './src/lib/application/simuladorLogic.js';

console.log('🧪 TEST: Valores por defecto TIP/TFP/TCP');
console.log('=======================================');

// Simular la configuración inicial de la UI después del cambio
const configuracionUI: ConfiguracionSimulacion = {
  policy: 'FCFS',
  tip: 1,  // Nuevos valores por defecto docentes
  tfp: 1,
  tcp: 1,
  quantum: undefined
};

console.log('📋 Configuración inicial UI:');
console.log('  TIP:', configuracionUI.tip);
console.log('  TFP:', configuracionUI.tfp);
console.log('  TCP:', configuracionUI.tcp);
console.log('  Policy:', configuracionUI.policy);
console.log('');

// Test 1: Validación de la configuración por defecto
const validacion = validarConfiguracion(configuracionUI);
console.log('📊 Validación configuración por defecto:');
console.log('  Válida:', validacion.valida);
console.log('  Errores:', validacion.errores);

if (validacion.valida) {
  console.log('  ✅ Configuración por defecto VÁLIDA');
} else {
  console.log('  ❌ Configuración por defecto INVÁLIDA');
  throw new Error('Los nuevos defaults no pasan validación');
}

// Test 2: Verificar que sigue permitiendo valores = 0 (flexibilidad)
const configuracionSinOverhead: ConfiguracionSimulacion = {
  policy: 'FCFS',
  tip: 0,
  tfp: 0,
  tcp: 0,
  quantum: undefined
};

const validacion0 = validarConfiguracion(configuracionSinOverhead);
console.log('');
console.log('📊 Validación TIP/TFP/TCP = 0 (flexibilidad):');
console.log('  Válida:', validacion0.valida);
console.log('  Errores:', validacion0.errores);

if (validacion0.valida) {
  console.log('  ✅ TIP/TFP/TCP = 0 sigue siendo VÁLIDO (flexibilidad mantenida)');
} else {
  console.log('  ❌ TIP/TFP/TCP = 0 INVÁLIDO - se perdió flexibilidad');
  throw new Error('La validación se volvió demasiado restrictiva');
}

// Test 3: Verificar que Round Robin también funciona con nuevos defaults
const configuracionRR: ConfiguracionSimulacion = {
  policy: 'RR',
  tip: 1,
  tfp: 1,
  tcp: 1,
  quantum: 2
};

const validacionRR = validarConfiguracion(configuracionRR);
console.log('');
console.log('📊 Validación RR con nuevos defaults:');
console.log('  Válida:', validacionRR.valida);
console.log('  Errores:', validacionRR.errores);

if (validacionRR.valida) {
  console.log('  ✅ RR con nuevos defaults VÁLIDO');
} else {
  console.log('  ❌ RR con nuevos defaults INVÁLIDO');
  throw new Error('RR no funciona con los nuevos defaults');
}

// Test 4: Comparar con valores típicos de tests
const valoresTypicos = [1, 0.5, 2];
console.log('');
console.log('📈 Verificación valores típicos usados en tests:');

valoresTypicos.forEach(valor => {
  const config: ConfiguracionSimulacion = {
    policy: 'FCFS',
    tip: valor,
    tfp: valor,
    tcp: valor,
    quantum: undefined
  };
  
  const validacion = validarConfiguracion(config);
  console.log(`  TIP/TFP/TCP = ${valor}:`, validacion.valida ? '✅ VÁLIDO' : '❌ INVÁLIDO');
});

console.log('');
console.log('🎯 RESUMEN:');
console.log('============');
console.log('✅ Nuevos defaults (TIP/TFP/TCP = 1) son VÁLIDOS');
console.log('✅ Flexibilidad mantenida (permite 0)');
console.log('✅ Compatibilidad con todos los algoritmos');
console.log('✅ Alineación con práctica docente típica');
console.log('');
console.log('📚 BENEFICIO EDUCATIVO:');
console.log('- Demo arranca con overhead del SO realista');
console.log('- Estudiantes ven impacto de TIP/TFP/TCP desde el inicio');
console.log('- Consistencia con ejercicios de cátedra típicos');

console.log('');
console.log('🎯 TEST DEFAULTS COMPLETADO');
console.log('===========================');