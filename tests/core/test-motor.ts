import { AdaptadorSimuladorDominio } from '../../src/lib/core/adaptadorSimuladorDominio.js';
import type { Workload } from '../../src/lib/domain/types.js';

async function pruebaRapida() {
  console.log('🔍 Ejecutando prueba rápida...');
  
  try {
    const workload: Workload = {
      processes: [
        { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 10, duracionIO: 0, prioridad: 1 }
      ],
      config: { policy: 'FCFS', tip: 1, tfp: 2, tcp: 0 }
    };
    
    const adaptador = new AdaptadorSimuladorDominio(workload);
    const resultado = adaptador.ejecutar();
    
    if (!resultado.exitoso) {
      console.log(`❌ Error en simulación: ${resultado.error}`);
      return false;
    }
    
    const exitoso = resultado.estadoFinal.tiempoActual === 13; // TIP + CPU + TFP = 1 + 10 + 2 = 13
    console.log(exitoso ? '✅ Prueba rápida exitosa' : '❌ Prueba rápida falló - Revisar implementación');
    return exitoso;
  } catch (error) {
    console.log('❌ Error en prueba rápida:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando validación del motor de simulación...\n');
  
  // Ejecutar prueba rápida primero
  const pruebaBasicaExitosa = await pruebaRapida();
  
  if (pruebaBasicaExitosa) {
    console.log('\n✅ Motor de simulación funcionando correctamente');
  } else {
    console.log('\n⚠️  Prueba básica falló. No se ejecutarán más pruebas.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
