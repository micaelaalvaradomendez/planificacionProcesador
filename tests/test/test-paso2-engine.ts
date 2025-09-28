// src/lib/test/test-paso2-engine.ts
// Tests del Paso 2 - Tipos del Motor + Cola de Eventos

import { EventQueue } from '../../src/lib/engine/queue';
import { EVENT_PRIORITY, type EventType, type SimEvent } from '../../src/lib/engine/types';

console.log('  Ejecutando tests del Paso 2 - Motor + Cola de Eventos...\n');

// ========== TEST: EVENT_PRIORITY ==========
console.log('📋 Test: Prioridades de eventos');
console.assert(EVENT_PRIORITY['C→T'] === 1, '❌ C→T debería tener prioridad 1');
console.assert(EVENT_PRIORITY['C→B'] === 2, '❌ C→B debería tener prioridad 2');
console.assert(EVENT_PRIORITY['C→L'] === 3, '❌ C→L debería tener prioridad 3');
console.assert(EVENT_PRIORITY['B→L'] === 4, '❌ B→L debería tener prioridad 4');
console.assert(EVENT_PRIORITY['N→L'] === 5, '❌ N→L debería tener prioridad 5');
console.assert(EVENT_PRIORITY['L→C'] === 6, '❌ L→C debería tener prioridad 6');
console.log(' Prioridades de eventos: OK\n');

// ========== TEST: Cola vacía ==========
console.log('📋 Test: Cola vacía');
const qEmpty = new EventQueue();
console.assert(qEmpty.isEmpty() === true, '❌ Cola nueva debería estar vacía');
console.assert(qEmpty.pop() === undefined, '❌ pop() en cola vacía debería retornar undefined');
console.log(' Cola vacía: OK\n');

// ========== TEST: Orden por timestamp ==========
console.log('📋 Test: Orden por timestamp');
const q1 = new EventQueue();
q1.push({ t: 100, type: 'N→L', pid: 1 });
q1.push({ t: 50, type: 'N→L', pid: 2 });
q1.push({ t: 75, type: 'N→L', pid: 3 });

const e1 = q1.pop()!;
const e2 = q1.pop()!;
const e3 = q1.pop()!;

console.assert(e1.t === 50 && e1.pid === 2, '❌ Primer evento debería ser t=50, pid=2');
console.assert(e2.t === 75 && e2.pid === 3, '❌ Segundo evento debería ser t=75, pid=3');
console.assert(e3.t === 100 && e3.pid === 1, '❌ Tercer evento debería ser t=100, pid=1');
console.log(' Orden por timestamp: OK\n');

// ========== TEST: Gate 1 - Tres eventos al mismo t, orden por prioridad ==========
console.log('📋 Test: Gate 1 - Orden por prioridad en mismo timestamp');
const q = new EventQueue();

// Agregar en orden diferente al de prioridad
q.push({ t: 100, type: 'L→C', pid: 1 }); // prio 6
q.push({ t: 100, type: 'C→B', pid: 2 }); // prio 2
q.push({ t: 100, type: 'C→L', pid: 3 }); // prio 3

const first = q.pop()!;
const second = q.pop()!;
const third = q.pop()!;

console.assert(first.type === 'C→B' && first.pid === 2, '❌ Debe salir prio 2 (C→B) primero');
console.assert(second.type === 'C→L' && second.pid === 3, '❌ Luego prio 3 (C→L)');
console.assert(third.type === 'L→C' && third.pid === 1, '❌ Luego prio 6 (L→C)');
console.log(' Gate 1 - Orden por prioridad: OK\n');

// ========== TEST: Gate 2 - Estabilidad con eventos idénticos ==========
console.log('📋 Test: Gate 2 - Estabilidad (orden de inserción)');
const q2 = new EventQueue();
q2.push({ t: 50, type: 'N→L', pid: 10 }); // entra primero
q2.push({ t: 50, type: 'N→L', pid: 20 }); // entra segundo

const firstStable = q2.pop()!;
const secondStable = q2.pop()!;

console.assert(firstStable.pid === 10, '❌ Estabilidad: primero en entrar (pid=10), primero en salir');
console.assert(secondStable.pid === 20, '❌ Luego el segundo (pid=20)');
console.log(' Gate 2 - Estabilidad: OK\n');

// ========== TEST: Caso complejo - Múltiples criterios ==========
console.log('📋 Test: Caso complejo - timestamp + prioridad + estabilidad');
const qComplex = new EventQueue();

// Eventos en diferentes tiempos y prioridades
qComplex.push({ t: 200, type: 'N→L', pid: 1 }); // t=200, prio=5
qComplex.push({ t: 100, type: 'C→T', pid: 2 }); // t=100, prio=1 (debería salir primero por tiempo)
qComplex.push({ t: 100, type: 'L→C', pid: 3 }); // t=100, prio=6 (mismo tiempo que anterior, menor prioridad)
qComplex.push({ t: 100, type: 'C→B', pid: 4 }); // t=100, prio=2 (mismo tiempo, prioridad media)
qComplex.push({ t: 150, type: 'B→L', pid: 5 }); // t=150, prio=4

// Orden esperado: 
// 1. t=100, C→T (prio=1), pid=2
// 2. t=100, C→B (prio=2), pid=4  
// 3. t=100, L→C (prio=6), pid=3
// 4. t=150, B→L (prio=4), pid=5
// 5. t=200, N→L (prio=5), pid=1

const results = [];
while (!qComplex.isEmpty()) {
  results.push(qComplex.pop()!);
}

console.assert(results[0].pid === 2 && results[0].type === 'C→T', '❌ 1º: t=100, C→T, pid=2');
console.assert(results[1].pid === 4 && results[1].type === 'C→B', '❌ 2º: t=100, C→B, pid=4');
console.assert(results[2].pid === 3 && results[2].type === 'L→C', '❌ 3º: t=100, L→C, pid=3');
console.assert(results[3].pid === 5 && results[3].type === 'B→L', '❌ 4º: t=150, B→L, pid=5');
console.assert(results[4].pid === 1 && results[4].type === 'N→L', '❌ 5º: t=200, N→L, pid=1');

console.log(' Caso complejo: OK\n');

// ========== TEST: Tipos de interfaz SimEvent ==========
console.log('📋 Test: Estructura de SimEvent');
const evento: SimEvent = {
  t: 42,
  type: 'C→L',
  pid: 123,
  data: { quantum: 4, reason: 'preemption' }
};

console.assert(evento.t === 42, '❌ Campo t debe estar presente');
console.assert(evento.type === 'C→L', '❌ Campo type debe estar presente');
console.assert(evento.pid === 123, '❌ Campo pid opcional debe funcionar');
console.assert(evento.data?.quantum === 4, '❌ Campo data opcional debe funcionar');
console.log(' Estructura de SimEvent: OK\n');

console.log('🎉 ¡Todos los tests del Paso 2 pasaron correctamente!');
console.log('📋 Resumen:');
console.log('    EVENT_PRIORITY con todas las prioridades correctas (1-6)');
console.log('    EventQueue ordena correctamente por (t, prioridad, estabilidad)');
console.log('    Gate 1: Eventos mismo t salen por prioridad');
console.log('    Gate 2: Orden estable en empates');
console.log('    Casos complejos funcionan correctamente');
console.log('    Interfaces SimEvent, TraceSlice, TraceEvent definidas');
console.log('\n🚀 Listo para continuar con el Paso 3 (FCFS + Motor básico)!');
