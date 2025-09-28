// src/lib/test/test-runSimulation.ts
import { runSimulation, runSimulationFromTanda, type SimulationConfig } from '../../src/lib/stores/simulacion';
import type { Proceso } from '../../src/lib/model/proceso';
import type { ProcesoLegacy } from '../ui/services/importers/legacyTanda';

console.log('  Paso 9 — runSimulation() Tests');

const baseCfg: SimulationConfig = { 
  politica: 'FCFS', 
  costos: { TIP: 0, TCP: 0, TFP: 0, bloqueoES: 0 } 
};

const tanda: Proceso[] = [
  { pid: 1, arribo: 0, rafagasCPU: [5], estado: 'N' },
  { pid: 2, arribo: 2, rafagasCPU: [3], estado: 'N' }
];

function clone<T>(x: T): T { 
  return JSON.parse(JSON.stringify(x)); 
}

console.log('   Test 1: No mutación de entrada');
{
  const input = clone(tanda);
  const { trace, metricas, gantt } = runSimulation(baseCfg, input);

  // 1) No muta entrada
  if (JSON.stringify(input) !== JSON.stringify(tanda)) {
    throw new Error('❌ Mutación de entrada detectada');
  }

  // 2) Objetos "planos" presentes
  if (!trace?.events || !Array.isArray(trace.slices)) {
    throw new Error('❌ Trace inválido');
  }
  if (!metricas?.porProceso?.length) {
    throw new Error('❌ Métricas vacías');
  }
  if (!gantt) {
    throw new Error('❌ Gantt vacío');
  }

  console.log(' Test 1 OK - No hay mutación, objetos válidos');
}

console.log('   Test 2: RR requiere quantum > 0');
{
  let errorCapturado = false;
  try {
    runSimulation({ ...baseCfg, politica: 'RR', quantum: 0 }, tanda);
  } catch (error) {
    errorCapturado = true;
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes('quantum > 0')) {
      throw new Error(`❌ Error incorrecto: ${msg}`);
    }
  }
  
  if (!errorCapturado) {
    throw new Error('❌ RR sin quantum > 0 no lanzó error');
  }

  console.log(' Test 2 OK - RR valida quantum');
}

console.log('   Test 3: PRIORITY requiere prioridadBase');
{
  const processosSinPrioridad: Proceso[] = [
    { pid: 1, arribo: 0, rafagasCPU: [3], estado: 'N' }, // sin prioridadBase
    { pid: 2, arribo: 1, rafagasCPU: [2], estado: 'N', prioridadBase: 1 }
  ];

  let errorCapturado = false;
  try {
    runSimulation({ ...baseCfg, politica: 'PRIORITY' }, processosSinPrioridad);
  } catch (error) {
    errorCapturado = true;
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes('prioridadBase')) {
      throw new Error(`❌ Error incorrecto: ${msg}`);
    }
  }
  
  if (!errorCapturado) {
    throw new Error('❌ PRIORITY sin prioridades no lanzó error');
  }

  console.log(' Test 3 OK - PRIORITY valida prioridades');
}

console.log('   Test 4: Importador legacy');
{
  const legacyData: ProcesoLegacy[] = [
    {
      nombre: "P1",
      tiempo_arribo: 0,
      cantidad_rafagas_cpu: 2,
      duracion_rafaga_cpu: 5,
      duracion_rafaga_es: 10,
      prioridad_externa: 2
    },
    {
      nombre: "P2", 
      tiempo_arribo: 3,
      cantidad_rafagas_cpu: 1,
      duracion_rafaga_cpu: 4,
      duracion_rafaga_es: 10,
      prioridad_externa: 1
    }
  ];

  const result = runSimulationFromTanda({ politica: 'PRIORITY' }, legacyData);
  
  // Verificar que se importó correctamente
  if (!result.trace || !result.metricas || !result.gantt) {
    throw new Error('❌ Importación legacy falló');
  }

  console.log(' Test 4 OK - Importación legacy funciona');
}

console.log('   Test 5: Todas las políticas funcionan');
{
  const politicas: Array<{ politica: SimulationConfig['politica'], extra?: any }> = [
    { politica: 'FCFS' },
    { politica: 'RR', extra: { quantum: 3 } },
    { politica: 'SPN' },
    { politica: 'SRTN' },
    { politica: 'PRIORITY', extra: {} }
  ];

  const procesosConPrioridad: Proceso[] = [
    { pid: 1, arribo: 0, rafagasCPU: [4], estado: 'N', prioridadBase: 2 },
    { pid: 2, arribo: 1, rafagasCPU: [2], estado: 'N', prioridadBase: 1 }
  ];

  for (const { politica, extra } of politicas) {
    try {
      const cfg: SimulationConfig = { 
        ...baseCfg, 
        politica, 
        ...extra 
      };
      const result = runSimulation(cfg, procesosConPrioridad);
      
      if (!result.trace || !result.metricas || !result.gantt) {
        throw new Error(`❌ ${politica} no devolvió resultado válido`);
      }
      
      console.log(`   ${politica} OK`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`❌ ${politica} falló: ${msg}`);
    }
  }

  console.log(' Test 5 OK - Todas las políticas funcionan');
}

console.log('\n   Paso 9 - Tests completados exitosamente!');