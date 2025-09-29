// Test rápido para verificar los cambios en TraceViewer y métricas
import { runRR, runFCFS } from '../src/lib/engine/engine';
import { MetricsBuilder } from '../src/lib/metrics/metricas';
import type { Proceso } from '../src/lib/model/proceso';
import type { Costos } from '../src/lib/model/costos';

// Procesos simples para test
const procesosTest: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [3], rafagasES: [], estado: 'N', prioridadBase: 1 },
  { pid: 2, arribo: 2, rafagasCPU: [2], rafagasES: [], estado: 'N', prioridadBase: 2 }
];

const costosTest: Costos = {
  TCP: 1,
  TIP: 1, 
  TFP: 2,  // Importante: TFP > 0 para probar el fix de métricas
  bloqueoES: 1
};

console.log('🧪 VERIFICANDO FIXES DE TRACE VIEWER Y MÉTRICAS\n');

// Test con RR para ver expropiaciones
const traceRR = runRR(procesosTest, costosTest, 2);
console.log('=== RR con quantum=2 ===');
console.log('Eventos en trace:', traceRR.events.map(e => `${e.t}: ${e.type} (pid=${e.pid})`));
console.log('Overheads TFP:', traceRR.overheads?.filter(o => o.kind === 'TFP').map(o => `pid=${o.pid}: ${o.t0}-${o.t1}`));

// Métricas con el fix
const metricas = MetricsBuilder.build(traceRR, procesosTest);
const global = MetricsBuilder.buildGlobal(metricas, traceRR);

console.log('\nMétricas por proceso:');
metricas.forEach(m => {
  console.log(`  P${m.pid}: fin=${m.fin}, TRp=${m.TRp}, TE=${m.TE}`);
});

console.log(`\nGlobal: tiempo_total=${global.tiempoTotalSimulacion}, throughput=${global.throughput.toFixed(3)}`);
console.log(`Context switches: ${global.cambiosDeContexto}, Expropiaciones: ${global.expropiaciones}`);

// Verificar que los tipos de evento son correctos
const tiposUnicos = [...new Set(traceRR.events.map(e => e.type))];
console.log('\nTipos de evento únicos:', tiposUnicos);

// Verificar que las expropiaciones se detectan
const expropiacionesDetalle = traceRR.events.filter(e => 
  e.type === 'C→L' && (e.data?.reason === 'quantum' || e.data?.reason === 'preempt')
);
console.log('Expropiaciones detectadas:', expropiacionesDetalle.length);