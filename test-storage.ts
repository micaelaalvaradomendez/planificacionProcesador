/**
 * Test de simulación completo con guardado en localStorage (simulado)
 */

import { ejecutarSimulacion, guardarDatosSimulacion } from './src/lib/application/simuladorLogic.js';

// Mock localStorage para Node.js
const mockLocalStorage = {
  data: {} as Record<string, string>,
  setItem(key: string, value: string) {
    this.data[key] = value;
    console.log(`📦 localStorage.setItem('${key}', ...)`);
  },
  getItem(key: string) {
    const value = this.data[key] || null;
    console.log(`📦 localStorage.getItem('${key}') => ${value ? 'FOUND' : 'NULL'}`);
    return value;
  },
  removeItem(key: string) {
    delete this.data[key];
    console.log(`📦 localStorage.removeItem('${key}')`);
  }
};

// Establecer mock
(globalThis as any).localStorage = mockLocalStorage;

async function testSimulacionConStorage() {
  console.log('🧪 Test de simulación con localStorage simulado');
  console.log('==================================================');

  try {
    // 1. Datos como los que vienen de la UI
    const procesos = [
      { nombre: 'P1', llegada: 0, rafaga: 3, prioridad: 1 },
      { nombre: 'P2', llegada: 1, rafaga: 2, prioridad: 2 }
    ];
    
    const configuracion = {
      policy: 'FCFS' as const,
      tip: 1,
      tfp: 1,
      tcp: 1
    };

    console.log('🚀 Ejecutando simulación...');
    const resultado = await ejecutarSimulacion(procesos, configuracion);
    
    console.log('✅ Resultado obtenido:', {
      eventos: resultado.events.length,
      tieneGantt: !!resultado.gantt,
      segmentosGantt: resultado.gantt?.segmentos.length || 0
    });

    // 2. Crear datos completos como lo hace la UI
    const datosCompletos = {
      procesos,
      configuracion,
      resultados: resultado,
      timestamp: new Date().toISOString()
    };

    // 3. Guardar en localStorage
    console.log('💾 Guardando en localStorage...');
    guardarDatosSimulacion(datosCompletos);

    // 4. Simular lo que hace la página de resultados
    console.log('📊 Simulando carga en página de resultados...');
    const datosRecuperados = JSON.parse(mockLocalStorage.getItem('ultimaSimulacion') || '{}');
    
    console.log('🔍 Datos recuperados:');
    console.log('  - Tiene resultados:', !!datosRecuperados.resultados);
    console.log('  - Tiene gantt:', !!datosRecuperados.resultados?.gantt);
    console.log('  - Segmentos gantt:', datosRecuperados.resultados?.gantt?.segmentos?.length || 0);
    console.log('  - Tiempo total gantt:', datosRecuperados.resultados?.gantt?.tiempoTotal || 0);
    console.log('  - Procesos gantt:', datosRecuperados.resultados?.gantt?.procesos?.length || 0);

    if (datosRecuperados.resultados?.gantt?.segmentos) {
      console.log('📋 Segmentos detallados:');
      datosRecuperados.resultados.gantt.segmentos.forEach((seg: any, i: number) => {
        console.log(`  ${i + 1}. ${seg.process} [${seg.tStart}-${seg.tEnd}] (${seg.kind})`);
      });
    }

    console.log('\n🎉 Test con localStorage exitoso');

  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

// Ejecutar test
testSimulacionConStorage();
