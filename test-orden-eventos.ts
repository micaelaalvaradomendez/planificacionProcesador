/**
 * Test específico para verificar el orden correcto de eventos,
 * especialmente que FinTFP no compita con admisión y arribos
 */

import { ColaEventos } from './src/lib/core/eventQueue';
import type { EventoInterno } from './src/lib/core/state';

console.log('🧪 Verificando orden de prioridad de eventos...');

const cola = new ColaEventos();

// Crear eventos en el mismo tiempo para probar prioridades
const tiempoBase = 10;

const eventos: Array<{ evento: EventoInterno; esUltimaRafaga?: boolean }> = [
  // Agregar en orden aleatorio para verificar que se reordenen correctamente
  { evento: { tiempo: tiempoBase, tipo: 'FinTFP', proceso: 'P1' } },
  { evento: { tiempo: tiempoBase, tipo: 'Despacho', proceso: 'P2' } },
  { evento: { tiempo: tiempoBase, tipo: 'Arribo', proceso: 'P3' } },
  { evento: { tiempo: tiempoBase, tipo: 'FinES', proceso: 'P4' } },
  { evento: { tiempo: tiempoBase, tipo: 'FinTIP', proceso: 'P5' } },
  { evento: { tiempo: tiempoBase, tipo: 'AgotamientoQuantum', proceso: 'P6' } },
  { evento: { tiempo: tiempoBase, tipo: 'FinRafagaCPU', proceso: 'P7' }, esUltimaRafaga: true }, // Terminado
  { evento: { tiempo: tiempoBase, tipo: 'FinRafagaCPU', proceso: 'P8' }, esUltimaRafaga: false } // Bloqueado
];

console.log('\n📋 Agregando eventos en orden aleatorio...');
eventos.forEach(({ evento, esUltimaRafaga }, i) => {
  console.log(`  ${i + 1}. ${evento.tipo} - ${evento.proceso}`);
  cola.agregarMultiples([{ evento, esUltimaRafaga }]);
});

console.log('\n🎯 Orden resultante después del reordenamiento:');
const eventosOrdenados = cola.verEventos();
eventosOrdenados.forEach((evento, i) => {
  const prioridad = evento.tipo === 'FinRafagaCPU' 
    ? (evento.esUltimaRafaga ? 1 : 2)
    : { 
        'AgotamientoQuantum': 3,
        'FinES': 4, 
        'Arribo': 5,
        'FinTIP': 5,
        'Despacho': 6,
        'FinTFP': 7
      }[evento.tipo] || 99;
  
  console.log(`  ${i + 1}. ${evento.tipo} - ${evento.proceso} (prioridad: ${prioridad})`);
});

// Verificar el orden esperado
const ordenEsperado = [
  'FinRafagaCPU', // P7 - Terminado (prio 1)
  'FinRafagaCPU', // P8 - Bloqueado (prio 2)  
  'AgotamientoQuantum', // P6 - (prio 3)
  'FinES', // P4 - (prio 4)
  'Arribo', // P3 - (prio 5)
  'FinTIP', // P5 - (prio 5)
  'Despacho', // P2 - (prio 6)
  'FinTFP' // P1 - (prio 7) ✅ Al final, sin competir con admisión
];

const ordenReal = eventosOrdenados.map(e => e.tipo);

console.log('\n✅ Verificación del orden:');
console.log(`  Esperado: ${ordenEsperado.join(' → ')}`);
console.log(`  Obtenido: ${ordenReal.join(' → ')}`);

const correcto = JSON.stringify(ordenEsperado) === JSON.stringify(ordenReal);

if (correcto) {
  console.log('  ✅ CORRECTO: FinTFP está al final (prioridad 7)');
  console.log('  ✅ No compite con admisión/arribos (prioridad 5)');
  console.log('  ✅ No compite con despacho (prioridad 6)');
  console.log('  ✅ Es cierre contable posterior como debe ser');
} else {
  console.log('  ❌ ERROR: Orden de eventos incorrecto');
  console.log('  ❌ FinTFP no está en la posición correcta');
  process.exit(1);
}

// Test específico: FinTFP vs eventos de admisión en mismo tiempo
console.log('\n🔬 Test específico: FinTFP vs Admisión simultánea');
const colaTest = new ColaEventos();

colaTest.agregar({ tiempo: 5, tipo: 'FinTFP', proceso: 'Proceso_Terminando' });
colaTest.agregar({ tiempo: 5, tipo: 'Arribo', proceso: 'Proceso_Nuevo' });
colaTest.agregar({ tiempo: 5, tipo: 'FinTIP', proceso: 'Proceso_Admitido' });

const testEventos = colaTest.verEventos();
console.log('📋 Orden en conflicto Admisión vs FinTFP:');
testEventos.forEach((evento, i) => {
  console.log(`  ${i + 1}. ${evento.tipo} - ${evento.proceso}`);
});

const admisionPrimero = testEventos[0].tipo === 'Arribo' && 
                       testEventos[1].tipo === 'FinTIP' &&
                       testEventos[2].tipo === 'FinTFP';

if (admisionPrimero) {
  console.log('  ✅ CORRECTO: Admisión/arribos tienen prioridad sobre FinTFP');
  console.log('  ✅ TFP no distorsiona el despacho ni la contabilidad');
} else {
  console.log('  ❌ ERROR: FinTFP compete incorrectamente con admisión');
  process.exit(1);
}

console.log('\n🎉 Test de orden de eventos completado exitosamente');
console.log('✅ FinTFP correctamente priorizado como cierre contable posterior');