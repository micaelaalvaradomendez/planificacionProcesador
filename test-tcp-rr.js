import { AdaptadorSimuladorDominio } from './src/lib/core/adaptadorSimuladorDominio.js';

function testTCPRoundRobin() {
  console.log('🔍 ANÁLISIS TCP EN ROUND ROBIN');
  console.log('==============================');
  
  const workloadRR = {
    processes: [
      { id: 'P1', arribo: 0, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 1 },
      { id: 'P2', arribo: 0, rafagasCPU: 1, duracionCPU: 3, duracionIO: 0, prioridad: 1 }
    ],
    config: { tip: 0, tcp: 1, tfp: 0, quantum: 2, policy: 'RR' }
  };

  console.log('📋 Configuración:');
  console.log('P1: 1×3u CPU, arribo=0');
  console.log('P2: 1×3u CPU, arribo=0'); 
  console.log('Quantum=2, TCP=1, TIP=0, TFP=0');
  console.log('');

  try {
    const adaptador = new AdaptadorSimuladorDominio(workloadRR);
    const resultado = adaptador.ejecutar();
    
    console.log('📊 MÉTRICAS FINALES:');
    console.log('CPU SO:', resultado.estadoFinal.contadoresCPU.sistemaOperativo);
    console.log('CPU Usuario:', resultado.estadoFinal.contadoresCPU.procesos);
    console.log('Tiempo Total:', resultado.estadoFinal.tiempoActual);
    console.log('');
    
    // Analizar eventos relevantes
    const despachos = resultado.eventosInternos.filter(e => e.tipo === 'Despacho');
    const expropiaciones = resultado.eventosInternos.filter(e => e.tipo === 'AgotamientoQuantum');
    
    console.log('📋 EVENTOS DE INTERÉS:');
    console.log('Despachos:', despachos.length);
    console.log('Expropiaciones:', expropiaciones.length);
    console.log('');
    
    console.log('⏰ SECUENCIA COMPLETA:');
    const todosEventos = resultado.eventosInternos
      .filter(e => e.tipo === 'Despacho' || e.tipo === 'AgotamientoQuantum')
      .sort((a, b) => a.tiempo - b.tiempo);
    
    todosEventos.forEach((evento, i) => {
      const tcpInfo = evento.tipo === 'Despacho' ? ' [+1 TCP]' : '';
      console.log(`  ${i+1}. T=${evento.tiempo} | ${evento.tipo} | ${evento.proceso}${tcpInfo}`);
    });
    
    console.log('');
    console.log('🧮 VERIFICACIÓN TCP:');
    console.log('TCP esperado por despachos:', despachos.length, '×1 =', despachos.length);
    console.log('TCP real en sistema:', resultado.estadoFinal.contadoresCPU.sistemaOperativo);
    
    if (resultado.estadoFinal.contadoresCPU.sistemaOperativo === despachos.length) {
      console.log('✅ TCP CORRECTO: Cada despacho cobra exactamente 1 TCP');
    } else {
      console.log('❌ TCP INCORRECTO:');
      const diferencia = resultado.estadoFinal.contadoresCPU.sistemaOperativo - despachos.length;
      if (diferencia > 0) {
        console.log(`   Sobrecobro de ${diferencia} TCP(s)`);
      } else {
        console.log(`   Falta de ${Math.abs(diferencia)} TCP(s)`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testTCPRoundRobin();