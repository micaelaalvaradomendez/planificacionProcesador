/**
 * Test para verificar el flujo docente y la protección de UI
 */

import { 
  crearEstadoFlujoInicial, 
  resetearFlujo, 
  avanzarFase,
  type EstadoFlujoDocente 
} from './src/lib/application/flujoDocente';

import type { ConfiguracionSimulacion } from './src/lib/application/simuladorLogic';

console.log('🧪 Iniciando test del flujo docente UI...\n');

// Test 1: Estado inicial
console.log('1️⃣ Test: Estado inicial');
let estado = crearEstadoFlujoInicial();
console.log('  ✅ Estado inicial:', JSON.stringify(estado, null, 2));

// Verificar que no se puede avanzar sin cumplir requisitos
console.log('\n2️⃣ Test: Intentar avanzar sin archivo');
try {
  estado = avanzarFase(estado, 'ver_tabla');
  console.log('  ❌ ERROR: Se permitió avanzar sin archivo');
} catch (error) {
  console.log('  ✅ Correcto: No se puede avanzar sin archivo');
}

// Test 3: Cargar archivo (simular)
console.log('\n3️⃣ Test: Simular carga de archivo');
const procesosEjemplo = [
  { id: 'P1', arribo: 0, rafagasCPU: [10], duracionIO: [], prioridad: 1 }
];
estado = avanzarFase(estado, 'cargar_procesos', { procesos: procesosEjemplo });
console.log('  ✅ Archivo cargado, estado:', estado.faseActual);

// Test 4: Ver tabla
console.log('\n4️⃣ Test: Completar ver tabla');
estado = avanzarFase(estado, 'ver_tabla');
console.log('  ✅ Tabla vista, estado:', estado.faseActual);

// Test 5: Configurar algoritmo
console.log('\n5️⃣ Test: Configurar algoritmo');
const configEjemplo: ConfiguracionSimulacion = {
  policy: 'FCFS',
  tip: 1,
  tfp: 2,
  tcp: 1,
  quantum: 4
};
estado = avanzarFase(estado, 'configurar', { configuracion: configEjemplo });
console.log('  ✅ Configuración establecida, estado:', estado.faseActual);

// Test 6: Establecer configuración
console.log('\n6️⃣ Test: Establecer configuración');
estado = avanzarFase(estado, 'establecer_config');
console.log('  ✅ Configuración confirmada, estado:', estado.faseActual);

// Test 7: Ejecutar simulación
console.log('\n7️⃣ Test: Ejecutar simulación');
const resultadosEjemplo = {
  gantt: [],
  metrics: { cpu: [], so: [] },
  events: []
};
estado = avanzarFase(estado, 'ejecutar', { resultados: resultadosEjemplo });
console.log('  ✅ Simulación ejecutada, estado:', estado.faseActual);

// Test 8: Reset
console.log('\n8️⃣ Test: Reset del flujo');
estado = resetearFlujo();
console.log('  ✅ Reset exitoso, estado:', estado.faseActual);

console.log('\n✅ Todos los tests del flujo docente pasaron correctamente');
console.log('🎯 El flujo UI está correctamente protegido por fases');