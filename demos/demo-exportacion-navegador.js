// ===================================================================
// DEMO DEL SISTEMA DE EXPORTACIÓN
// ===================================================================
// Ejecuta este código en la consola del navegador en /resultados
// para probar todas las funciones de exportación con datos reales

console.log('🎯 === DEMO SISTEMA DE EXPORTACIÓN ===');

// Datos de simulación de ejemplo
const datosSimulacionDemo = {
  procesos: [
    { id: 'P1', nombre: 'Proceso1', llegada: 0, rafaga: 5, prioridad: 1 },
    { id: 'P2', nombre: 'Proceso2', llegada: 2, rafaga: 3, prioridad: 2 },
    { id: 'P3', nombre: 'Proceso3', llegada: 4, rafaga: 2, prioridad: 3 }
  ],
  configuracion: {
    policy: 'FCFS',
    tip: 1,
    tfp: 1,
    tcp: 1
  },
  resultados: {
    events: [
      { tiempo: 0, tipo: 'ARRIBO_TRABAJO', proceso: 'P1', extra: 'llega al sistema' },
      { tiempo: 1, tipo: 'INCORPORACION_SISTEMA', proceso: 'P1', extra: 'TIP=1' },
      { tiempo: 2, tipo: 'DESPACHO', proceso: 'P1', extra: 'TCP=1' },
      { tiempo: 2, tipo: 'ARRIBO_TRABAJO', proceso: 'P2', extra: 'llega al sistema' },
      { tiempo: 7, tipo: 'FIN_RAFAGA_CPU', proceso: 'P1', extra: 'ráfaga completada' },
      { tiempo: 8, tipo: 'INICIO_TERMINACION', proceso: 'P1', extra: 'TFP=1' },
      { tiempo: 9, tipo: 'TERMINACION_PROCESO', proceso: 'P1', extra: 'proceso terminado' },
      { tiempo: 9, tipo: 'INCORPORACION_SISTEMA', proceso: 'P2', extra: 'TIP=1' },
      { tiempo: 10, tipo: 'DESPACHO', proceso: 'P2', extra: 'TCP=1' },
      { tiempo: 13, tipo: 'FIN_RAFAGA_CPU', proceso: 'P2', extra: 'ráfaga completada' },
      { tiempo: 14, tipo: 'INICIO_TERMINACION', proceso: 'P2', extra: 'TFP=1' },
      { tiempo: 15, tipo: 'TERMINACION_PROCESO', proceso: 'P2', extra: 'proceso terminado' }
    ],
    metrics: {
      porProceso: [
        { name: 'P1', tiempoRetorno: 9, tiempoRetornoNormalizado: 1.8, tiempoEnListo: 2 },
        { name: 'P2', tiempoRetorno: 13, tiempoRetornoNormalizado: 4.33, tiempoEnListo: 6 },
        { name: 'P3', tiempoRetorno: 8, tiempoRetornoNormalizado: 4.0, tiempoEnListo: 5 }
      ],
      tanda: {
        tiempoRetornoTanda: 30,
        tiempoMedioRetorno: 10,
        cpuOcioso: 3,
        cpuSO: 6,
        cpuProcesos: 10,
        porcentajeCpuOcioso: 15.8,
        porcentajeCpuSO: 31.6,
        porcentajeCpuProcesos: 52.6
      }
    },
    gantt: {
      segmentos: [
        { process: 'P1', tStart: 2, tEnd: 7, kind: 'CPU' },
        { process: 'SO', tStart: 7, tEnd: 8, kind: 'TFP' },
        { process: 'SO', tStart: 8, tEnd: 9, kind: 'TCP' },
        { process: 'P2', tStart: 10, tEnd: 13, kind: 'CPU' },
        { process: 'SO', tStart: 13, tEnd: 14, kind: 'TFP' }
      ],
      tiempoTotal: 15,
      procesos: ['P1', 'P2', 'P3'],
      estadisticas: {
        utilizacionCPU: 68.4,
        tiempoOcioso: 3,
        tiempoSO: 6,
        distribucionTiempos: { 'CPU': 8, 'TFP': 2, 'TCP': 1, 'OCIOSO': 3 }
      }
    }
  },
  timestamp: new Date().toISOString()
};

console.log('📊 Datos de simulación preparados:', datosSimulacionDemo);

// Guardar en localStorage para que la página los detecte
localStorage.setItem('simulation-data', JSON.stringify(datosSimulacionDemo));
localStorage.setItem('simulation-timestamp', datosSimulacionDemo.timestamp);

console.log('✅ Datos guardados en localStorage');

// Instrucciones para el usuario
console.log(`
🎯 === INSTRUCCIONES DE USO ===

1. 🔄 RECARGA LA PÁGINA (/resultados) para cargar los datos demo

2. 📄 PRUEBA EXPORTACIÓN DE EVENTOS:
   - Selecciona formato CSV, TXT o JSON
   - Configura separador (si es CSV)
   - Haz clic en "📄 Exportar Eventos"

3. 📈 PRUEBA EXPORTACIÓN DE MÉTRICAS:
   - Selecciona formato CSV o JSON
   - Haz clic en "📈 Exportar Métricas"

4. 📅 PRUEBA EXPORTACIÓN DE GANTT:
   - Selecciona formato JSON, SVG o ASCII
   - Haz clic en "📅 Exportar Gantt"

5. 📦 PRUEBA EXPORTACIÓN COMPLETA:
   - Haz clic en "📦 Exportar Todo" en el header
   - Se descargarán todos los formatos automáticamente

6. 🔍 VERIFICA LOS ARCHIVOS:
   - Revisa la carpeta de descargas
   - Abre los archivos con el visor apropiado
   - Los CSV se pueden abrir en Excel/LibreOffice
   - Los SVG se pueden ver en navegador
   - Los TXT/ASCII son legibles en cualquier editor

=== NOMENCLATURA DE ARCHIVOS ===
- simulacion_FCFS_${new Date().toISOString().slice(0, 10)}_eventos.csv
- simulacion_FCFS_${new Date().toISOString().slice(0, 10)}_metricas.csv
- simulacion_FCFS_${new Date().toISOString().slice(0, 10)}_gantt.svg

🎉 ¡Disfruta probando el sistema de exportación!
`);

console.log('🚀 ¡Demo lista! Recarga la página para empezar.');

// Si estamos en la página de resultados, intentar recargar automáticamente
if (window.location.pathname.includes('resultados')) {
  console.log('🔄 Recargando página automáticamente...');
  setTimeout(() => {
    window.location.reload();
  }, 2000);
}
