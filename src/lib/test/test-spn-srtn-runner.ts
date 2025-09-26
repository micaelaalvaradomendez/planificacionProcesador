// src/lib/test/test-spn-srtn-runner.ts

import { testSPNBasic } from './test-spn-basic';
import { testSRTNGate } from './test-srtn-gate';

/**
 * Runner para ejecutar todos los tests de SPN y SRTN
 */

console.log('🚀 Ejecutando Tests SPN/SRTN\n');

console.log('='.repeat(60));
testSPNBasic();
console.log('='.repeat(60));
console.log();

console.log('='.repeat(60));
testSRTNGate();
console.log('='.repeat(60));
console.log();

console.log('✨ Tests SPN/SRTN completados');
