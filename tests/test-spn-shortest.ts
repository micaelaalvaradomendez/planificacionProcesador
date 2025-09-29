import { runSPN, runFCFS } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';
import type { Costos } from '../src/lib/model/costos';

// Procesos diseñados para mostrar la diferencia entre FCFS y SPN
const procesos: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [8], rafagasES: [], estado: 'N' },  // P1: 8 ticks
  { pid: 2, arribo: 1, rafagasCPU: [6], rafagasES: [], estado: 'N' },  // P2: 6 ticks (más corto que P1)
  { pid: 3, arribo: 2, rafagasCPU: [3], rafagasES: [], estado: 'N' }   // P3: 3 ticks (el más corto)
];

const costos: Costos = { TIP: 0, TCP: 1, TFP: 0, bloqueoES: 25 };

console.log('=== SPN vs FCFS COMPARACIÓN ===\n');

console.log('📋 CASO DE PRUEBA:');
console.log('  P1: arribo=0, ráfaga=8 ticks');
console.log('  P2: arribo=1, ráfaga=6 ticks');
console.log('  P3: arribo=2, ráfaga=3 ticks');
console.log('');

// Ejecutar FCFS para comparación
const traceFCFS = runFCFS(procesos, costos);
console.log('🔹 FCFS (orden de llegada):');
const orderFCFS = [];
for (const slice of traceFCFS.slices.sort((a, b) => a.start - b.start)) {
  orderFCFS.push(`P${slice.pid}(${slice.end - slice.start})`);
}
console.log(`  Orden ejecución: ${orderFCFS.join(' → ')}`);

// Ejecutar SPN 
const traceSPN = runSPN(procesos, costos);
console.log('\n🔹 SPN (ráfaga más corta):');
const orderSPN = [];
for (const slice of traceSPN.slices.sort((a, b) => a.start - b.start)) {
  orderSPN.push(`P${slice.pid}(${slice.end - slice.start})`);
}
console.log(`  Orden ejecución: ${orderSPN.join(' → ')}`);

console.log('\n📊 ANÁLISIS DE CORRECTITUD SPN:');

// Verificar que SPN selecciona correctamente
const firstSliceSPN = traceSPN.slices.find(s => s.start === 1); // Primer despacho después de TCP
const secondSliceSPN = traceSPN.slices.find(s => s.start > 1 && s.start < 15);
const thirdSliceSPN = traceSPN.slices.find(s => s.start > 15);

console.log('  Análisis del orden de selección:');
console.log(`    1er proceso ejecutado: P${firstSliceSPN?.pid} (debería ser P1, ya estaba corriendo)`);

// En t=1, cuando P2 llega, P1 ya está ejecutando, así que P1 continúa (SPN no es preemptivo)
// En t=9 cuando P1 termina, debe elegir entre P2(6) y P3(3) → debe elegir P3(3)
console.log(`    2do proceso ejecutado: P${secondSliceSPN?.pid} (debería ser P3, ráfaga=3 < P2(6))`);
console.log(`    3er proceso ejecutado: P${thirdSliceSPN?.pid} (debería ser P2, último restante)`);

// Verificaciones
const correctSecond = secondSliceSPN?.pid === 3;
const correctThird = thirdSliceSPN?.pid === 2;

console.log('\n📋 VERIFICACIONES:');
console.log(`  SPN selecciona P3 antes que P2: ${correctSecond ? '✅' : '❌'}`);
console.log(`  SPN ejecuta P2 al final: ${correctThird ? '✅' : '❌'}`);

if (correctSecond && correctThird) {
  console.log('  🎉 SPN IMPLEMENTADO CORRECTAMENTE');
} else {
  console.log('  ❌ SPN AÚN TIENE PROBLEMAS');
}

// Comparar con FCFS para mostrar la diferencia
const sameOrder = JSON.stringify(orderSPN) === JSON.stringify(orderFCFS);
console.log(`  SPN ≠ FCFS: ${!sameOrder ? '✅' : '❌'} (deben ser diferentes)`);

console.log('\n=== EVENTOS DETALLADOS SPN ===');
traceSPN.events.forEach(evt => {
  const dataStr = evt.data ? ` ${JSON.stringify(evt.data)}` : '';
  console.log(`  t=${evt.t}: ${evt.type} P${evt.pid}${dataStr}`);
});

console.log('\n=== SLICES DETALLADOS SPN ===');
traceSPN.slices.forEach(slice => {
  console.log(`  P${slice.pid}: [${slice.start}, ${slice.end}) = ${slice.end - slice.start} ticks`);
});