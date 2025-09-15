/**
 * Tests de equivalencia entre entidades del dominio y del core
 * Verifican que ambas implementaciones producen los mismos resultados
 */

import { Proceso } from '../../src/lib/domain/entities/Proceso';
import { AdaptadorEntidadesDominio } from '../../src/lib/core/adaptadorEntidadesDominio';
import type { ProcesoRT } from '../../src/lib/core/state';
import type { ProcesData } from '../../src/lib/domain/types';

// Test de conversión bidireccional
function testConversionBidireccional() {
  console.log('🧪 Test Conversión Bidireccional Proceso <-> ProcesoRT');
  
  // Datos de prueba
  const procesoOriginal: ProcesData = {
    nombre: 'P1',
    arribo: 0,
    rafagasCPU: 3,
    duracionCPU: 5,
    duracionIO: 2,
    prioridad: 1
  };
  
  // Crear proceso del dominio
  const procesoDominio = new Proceso(procesoOriginal);
  
  // Simular algunos cambios de estado
  procesoDominio.iniciarTIP(0);
  procesoDominio.finalizarTIP(1);
  procesoDominio.activar(2);
  procesoDominio.procesarCPU(2); // Ejecutar por 2 unidades
  
  // Convertir a ProcesoRT
  const procesoRT = AdaptadorEntidadesDominio.procesoAProcesoRT(procesoDominio);
  
  // Convertir de vuelta a Proceso
  const procesoConvertido = AdaptadorEntidadesDominio.procesoRTAProceso(procesoRT);
  
  // Verificar equivalencia
  const equivalencias = [
    { propiedad: 'id/name', original: procesoDominio.id, convertido: procesoConvertido.id },
    { propiedad: 'arribo', original: procesoDominio.arribo, convertido: procesoConvertido.arribo },
    { propiedad: 'rafagasCPU', original: procesoDominio.rafagasCPU, convertido: procesoConvertido.rafagasCPU },
    { propiedad: 'duracionCPU', original: procesoDominio.duracionCPU, convertido: procesoConvertido.duracionCPU },
    { propiedad: 'restanteCPU', original: procesoDominio.restanteCPU, convertido: procesoConvertido.restanteCPU },
    { propiedad: 'estado', original: procesoDominio.estado, convertido: procesoConvertido.estado },
    { propiedad: 'inicioTIP', original: procesoDominio.inicioTIP, convertido: procesoConvertido.inicioTIP },
    { propiedad: 'finTIP', original: procesoDominio.finTIP, convertido: procesoConvertido.finTIP }
  ];
  
  let todoExitoso = true;
  
  for (const { propiedad, original, convertido } of equivalencias) {
    const equivale = original === convertido;
    console.log(`${equivale ? '✅' : '❌'} ${propiedad}: ${original} === ${convertido}`);
    if (!equivale) todoExitoso = false;
  }
  
  return todoExitoso;
}

// Test de estados y transiciones
function testEstadosYTransiciones() {
  console.log('\n🧪 Test Estados y Transiciones');
  
  const procesoDominio = new Proceso({
    nombre: 'P_Test',
    arribo: 0,
    rafagasCPU: 2,
    duracionCPU: 4,
    duracionIO: 1,
    prioridad: 5
  });
  
  const transiciones = [
    { accion: 'inicial', estadoEsperado: 'NUEVO' },
    { accion: 'iniciarTIP(0)', estadoEsperado: 'NUEVO' },
    { accion: 'finalizarTIP(1)', estadoEsperado: 'LISTO' },
    { accion: 'activar(2)', estadoEsperado: 'CORRIENDO' },
    { accion: 'expropiar(5)', estadoEsperado: 'LISTO' },
    { accion: 'activar(6)', estadoEsperado: 'CORRIENDO' },
  ];
  
  let todoExitoso = true;
  
  for (const { accion, estadoEsperado } of transiciones) {
    // Ejecutar acción
    switch (accion) {
      case 'inicial':
        break;
      case 'iniciarTIP(0)':
        procesoDominio.iniciarTIP(0);
        break;
      case 'finalizarTIP(1)':
        procesoDominio.finalizarTIP(1);
        break;
      case 'activar(2)':
        procesoDominio.activar(2);
        break;
      case 'expropiar(5)':
        procesoDominio.expropiar(5);
        break;
      case 'activar(6)':
        procesoDominio.activar(6);
        break;
    }
    
    // Verificar estado
    const estadoActual = procesoDominio.estado;
    const correcto = estadoActual === estadoEsperado;
    console.log(`${correcto ? '✅' : '❌'} ${accion} → Estado: ${estadoActual} (esperado: ${estadoEsperado})`);
    
    if (!correcto) todoExitoso = false;
  }
  
  return todoExitoso;
}

// Test de métricas y tiempos
function testMetricasYTiempos() {
  console.log('\n🧪 Test Métricas y Tiempos');
  
  const procesoDominio = new Proceso({
    nombre: 'P_Metricas',
    arribo: 0,
    rafagasCPU: 1,
    duracionCPU: 10,
    duracionIO: 0,
    prioridad: 1
  });
  
  // Simular ejecución completa
  procesoDominio.iniciarTIP(0);           // TIP desde t=0
  procesoDominio.finalizarTIP(2);         // TIP hasta t=2, ahora en LISTO
  procesoDominio.activar(5);              // Activar en t=5 (esperó 3 unidades)
  procesoDominio.procesarCPU(10);         // Procesar todo el CPU
  procesoDominio.completarCPU(15);        // Completar en t=15
  procesoDominio.terminar(17);            // TFP completo en t=17
  
  // Convertir a ProcesoRT y verificar métricas
  const procesoRT = AdaptadorEntidadesDominio.procesoAProcesoRT(procesoDominio);
  
  const metricas = [
    { metrica: 'TIP', dominio: procesoDominio.finTIP! - procesoDominio.inicioTIP!, core: procesoRT.finTIP! - procesoRT.inicioTIP! },
    { metrica: 'Tiempo en Listo', dominio: procesoDominio.tiempoListoTotal, core: procesoRT.tiempoListoAcumulado },
    { metrica: 'Estado Final (mapeado)', dominio: 'Terminado', core: procesoRT.estado }, // Comparar estado mapeado
    { metrica: 'Ráfagas Restantes', dominio: procesoDominio.rafagasRestantes, core: procesoRT.rafagasRestantes }
  ];
  
  let todoExitoso = true;
  
  for (const { metrica, dominio, core } of metricas) {
    const equivale = dominio === core;
    console.log(`${equivale ? '✅' : '❌'} ${metrica}: Dominio=${dominio}, Core=${core}`);
    if (!equivale) todoExitoso = false;
  }
  
  return todoExitoso;
}

// Función principal
export function testEquivalenciaEntidades() {
  console.log('🚀 Iniciando tests de equivalencia entre entidades...\n');

  const test1 = testConversionBidireccional();
  const test2 = testEstadosYTransiciones();
  const test3 = testMetricasYTiempos();

  const todosExitosos = test1 && test2 && test3;

  console.log(`\n${todosExitosos ? '🎉' : '❌'} Tests equivalencia entidades: ${todosExitosos ? 'EXITOSOS' : 'FALLOS DETECTADOS'}`);
  return todosExitosos;
}

// Ejecutar directamente
testEquivalenciaEntidades();
