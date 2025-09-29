// debug-rr-events.ts
import { runRR } from '$lib/engine/engine';
import type { Proceso } from '$lib/model/proceso';

console.log('🔍 Debug RR - Rastrear origen de eventos C→T');

const procesosSimple: Proceso[] = [
  {
    pid: 1,
    arribo: 0,
    rafagasCPU: [6], // Una sola ráfaga - debería terminar sin duplicados
    estado: 'N'
  }
];

// Monkey patch para rastrear eventos
const originalPush = Array.prototype.push;
let eventCounter = 0;

Array.prototype.push = function(this: any[], ...args: any[]) {
  if (this && typeof this[0] === 'object' && this[0]?.type) {
    const event = args[0];
    if (event?.type === 'C→T') {
      eventCounter++;
      console.log(`📋 C→T #${eventCounter} creado:`, {
        t: event.t,
        pid: event.pid,
        data: event.data,
        stack: new Error().stack?.split('\n')[2]?.trim()
      });
    }
  }
  return originalPush.apply(this, args);
};

const trace = runRR(procesosSimple, { TIP: 0, TCP: 0, TFP: 0 }, 3);

// Restore original
Array.prototype.push = originalPush;

console.log('\n🎯 Resultado final:');
const finishEvents = trace.events.filter(e => e.type === 'C→T');
console.log(`Eventos C→T en trace final: ${finishEvents.length}`);

export {};