// Prueba rápida para verificar el cambio de E/S per-proceso
import { parseTandaJSON } from '../src/lib/io/parser.js';
import { runRR } from '../src/lib/engine/engine.js';

// Datos de prueba con E/S diferente por proceso
const testData = [
  {
    nombre: "P1",
    tiempo_arribo: 0,
    cantidad_rafagas_cpu: 2,
    duracion_rafaga_cpu: 4,
    duracion_rafaga_es: 10  // P1 tiene 10ms de E/S
  },
  {
    nombre: "P2", 
    tiempo_arribo: 1,
    cantidad_rafagas_cpu: 2,
    duracion_rafaga_cpu: 3,
    duracion_rafaga_es: 20  // P2 tiene 20ms de E/S (diferente!)
  }
];

try {
  console.log('Parseando procesos...');
  const procesos = parseTandaJSON(testData);
  
  console.log('Proceso P1 rafagasES:', procesos.find(p => p.pid === 1)?.rafagasES);
  console.log('Proceso P2 rafagasES:', procesos.find(p => p.pid === 2)?.rafagasES);
  
  console.log('Ejecutando RR...');
  const trace = runRR(procesos, { bloqueoES: 25 }, 5);
  
  console.log('Eventos de E/S:');
  const ioEvents = trace.events.filter(e => e.type === 'C→B' || e.type === 'B→L');
  ioEvents.forEach(event => console.log(`${event.t}: ${event.type} PID=${event.pid}`));
  
} catch (error) {
  console.error('Error:', error.message);
}