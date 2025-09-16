/**
 * Script para generar datos de prueba en localStorage desde el navegador
 * Ejecuta este script en la consola del navegador en http://localhost:5174/
 */

// Datos de prueba para TablaResumenComparativa
const datosSimulacionPrueba = {
  procesos: [
    { nombre: 'P1', llegada: 0, rafaga: 5, prioridad: 2 },
    { nombre: 'P2', llegada: 1, rafaga: 3, prioridad: 1 },
    { nombre: 'P3', llegada: 2, rafaga: 8, prioridad: 3 }
  ],
  configuracion: {
    policy: 'PRIORITY',
    tip: 1,
    tfp: 1,
    tcp: 2,
    quantum: 4
  },
  resultados: {
    events: Array.from({length: 16}, (_, i) => ({
      tiempo: i,
      tipo: 'TEST_EVENT',
      proceso: `P${(i % 3) + 1}`,
      extra: 'Evento de prueba'
    })),
    metrics: {
      porProceso: [
        { name: 'P1', tiempoRetorno: 21, tiempoRetornoNormalizado: 4.2, tiempoEnListo: 12 },
        { name: 'P2', tiempoRetorno: 25, tiempoRetornoNormalizado: 8.33, tiempoEnListo: 20 },
        { name: 'P3', tiempoRetorno: 12, tiempoRetornoNormalizado: 1.5, tiempoEnListo: 2 }
      ],
      tanda: {
        tiempoRetornoTanda: 26,
        tiempoMedioRetorno: 19.33,
        cpuOcioso: 4,
        cpuSO: 6,
        cpuProcesos: 16,
        porcentajeCpuOcioso: 15.38,
        porcentajeCpuSO: 23.08,
        porcentajeCpuProcesos: 61.54
      }
    },
    warnings: [],
    tiempoTotal: 26,
    gantt: {
      segmentos: [
        { process: 'P3', tStart: 4, tEnd: 13, kind: 'CPU' },
        { process: 'P1', tStart: 14, tEnd: 20, kind: 'CPU' },
        { process: 'P2', tStart: 21, tEnd: 25, kind: 'CPU' }
      ],
      tiempoTotal: 26,
      procesos: ['P1', 'P2', 'P3']
    }
  },
  timestamp: new Date().toISOString()
};

// Función para guardar en localStorage (ejecutar en consola del navegador)
function guardarDatosPrueba() {
  localStorage.setItem('simulacion-datos', JSON.stringify(datosSimulacionPrueba));
  console.log('✅ Datos de prueba guardados en localStorage');
  console.log('🌐 Ve a /resultados para ver el componente TablaResumenComparativa');
  console.log('📊 Datos guardados:', datosSimulacionPrueba);
}

// Ejecutar automáticamente si estamos en el navegador
if (typeof window !== 'undefined' && window.localStorage) {
  guardarDatosPrueba();
}

// Para usar en consola manualmente:
console.log('Para generar datos de prueba, ejecuta: guardarDatosPrueba()');
