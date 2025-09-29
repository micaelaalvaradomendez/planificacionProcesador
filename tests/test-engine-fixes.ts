// tests/test-engine-fixes.ts
import { runFCFS, runRR, runSRTN, runPriority } from '../src/lib/engine/engine';
import type { Proceso } from '../src/lib/model/proceso';
import type { Costos } from '../src/lib/model/costos';

// Cargar procesos de ejemplo de 5 procesos
const procesos5: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [15, 12], rafagasES: [20], estado: 'N' },
  { pid: 2, arribo: 1, rafagasCPU: [12, 8], rafagasES: [25], estado: 'N' },
  { pid: 3, arribo: 3, rafagasCPU: [3, 5], rafagasES: [15], estado: 'N' },
  { pid: 4, arribo: 4, rafagasCPU: [6, 2], rafagasES: [30], estado: 'N' },
  { pid: 5, arribo: 6, rafagasCPU: [1, 4], rafagasES: [10], estado: 'N' }
];

const costos: Costos = {
  TIP: 1,
  TCP: 1,
  TFP: 1,
  bloqueoES: 25
};

const quantum = 6;

console.log('=== TESTING ENGINE FIXES ===\n');

// Test A.1: Verificar separación de C→T y TFP
function testSeparacionFinYTFP() {
  console.log('A.1 - Testando separación de fin de CPU y TFP...');
  const trace = runFCFS(procesos5, costos);
  
  const finEvents = trace.events.filter(e => e.type === 'C→T');
  const slices = trace.slices;
  
  console.log('Eventos C→T:', finEvents.map(e => `P${e.pid} @ t=${e.t}`));
  
  // Verificar que C→T ocurre exactamente al final del último slice
  for (const finEvent of finEvents) {
    const lastSlice = slices.filter(s => s.pid === finEvent.pid).pop();
    if (lastSlice) {
      const offset = finEvent.t - lastSlice.end;
      console.log(`P${finEvent.pid}: último slice termina en ${lastSlice.end}, C→T en ${finEvent.t}, offset: ${offset}`);
      if (offset !== 0) {
        console.log(`❌ ERROR: P${finEvent.pid} tiene offset ${offset} (debería ser 0)`);
      } else {
        console.log(`✅ OK: P${finEvent.pid} C→T correcto`);
      }
    }
  }
  console.log();
}

// Test A.2: Verificar TCP desplaza el inicio del slice
function testTCPDesplazaSlices() {
  console.log('A.2 - Testando que TCP desplaza inicio de slices...');
  const trace = runFCFS(procesos5, costos);
  
  const dispatchEvents = trace.events.filter(e => e.type === 'L→C');
  const slices = trace.slices;
  
  let mismatches = 0;
  for (const dispatch of dispatchEvents) {
    const nextSlice = slices.find(s => s.pid === dispatch.pid && s.start >= dispatch.t);
    if (nextSlice) {
      const expectedStart = dispatch.t + costos.TCP;
      if (nextSlice.start !== expectedStart) {
        console.log(`❌ P${dispatch.pid}: L→C @ ${dispatch.t}, slice inicia en ${nextSlice.start}, esperado ${expectedStart}`);
        mismatches++;
      } else {
        console.log(`✅ P${dispatch.pid}: L→C @ ${dispatch.t}, slice correcto en ${nextSlice.start}`);
      }
    }
  }
  console.log(`Total mismatches TCP: ${mismatches}\n`);
}

// Test B.1: Verificar que RR no tiene eventos duplicados
function testRREventosDuplicados() {
  console.log('B.1 - Testando RR sin eventos duplicados...');
  const trace = runRR(procesos5, costos, quantum);
  
  // Contar C→T por (pid, t)
  const finEvents = trace.events.filter(e => e.type === 'C→T');
  const finCounts = new Map<string, number>();
  
  for (const event of finEvents) {
    const key = `${event.pid}-${event.t}`;
    finCounts.set(key, (finCounts.get(key) || 0) + 1);
  }
  
  let duplicates = 0;
  for (const [key, count] of finCounts) {
    if (count > 1) {
      console.log(`❌ ERROR: C→T duplicado para ${key}: ${count} veces`);
      duplicates++;
    }
  }
  
  if (duplicates === 0) {
    console.log('✅ OK: No hay C→T duplicados en RR');
  }
  
  console.log(`Eventos C→T únicos: ${finCounts.size}, duplicados: ${duplicates}\n`);
}

// Test C: Verificar contabilidad de CPU
function testContabilidadCPU() {
  console.log('C - Testando contabilidad de CPU...');
  const trace = runRR(procesos5, costos, quantum);
  
  for (const proceso of procesos5) {
    const slicesProceso = trace.slices.filter(s => s.pid === proceso.pid);
    const tiempoSlices = slicesProceso.reduce((sum, s) => sum + (s.end - s.start), 0);
    const tiempoRafagas = proceso.rafagasCPU.reduce((sum, r) => sum + r, 0);
    
    console.log(`P${proceso.pid}: slices=${tiempoSlices}, rafagas=${tiempoRafagas}, diff=${tiempoSlices - tiempoRafagas}`);
    
    if (tiempoSlices !== tiempoRafagas) {
      console.log(`❌ ERROR: P${proceso.pid} contabilidad incorrecta`);
    } else {
      console.log(`✅ OK: P${proceso.pid} contabilidad correcta`);
    }
  }
  console.log();
}

// Test D.1: Verificar que todos los eventos tienen pid
function testEventosSinPid() {
  console.log('D.1 - Testando eventos sin pid...');
  const trace = runFCFS(procesos5, costos);
  
  const eventosSinPid = trace.events.filter(e => e.pid == null || e.pid === undefined);
  
  if (eventosSinPid.length > 0) {
    console.log(`❌ ERROR: ${eventosSinPid.length} eventos sin pid:`);
    eventosSinPid.forEach(e => console.log(`  ${e.type} @ t=${e.t}`));
  } else {
    console.log('✅ OK: Todos los eventos tienen pid válido');
  }
  console.log();
}

// Ejecutar tests
testSeparacionFinYTFP();
testTCPDesplazaSlices();
testRREventosDuplicados();
testContabilidadCPU();
testEventosSinPid();

console.log('=== FIN DE TESTS ===');