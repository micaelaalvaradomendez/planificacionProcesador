/**
 * 📋 FORMATOS CORRECTOS DE ARCHIVOS
 * Guía completa de los formatos esperados por el sistema
 */

console.log('📋 FORMATOS CORRECTOS DE ARCHIVOS');
console.log('==================================');

interface FormatExample {
  tipo: string;
  descripcion: string;
  ejemplo: string;
  columnas: string[];
  notas: string[];
}

const formatosEjemplos: FormatExample[] = [
  {
    tipo: 'JSON - Formato Simplificado',
    descripcion: 'Array de objetos con campos cortos (usado en ejemplos)',
    ejemplo: `[
  {"id": "P1", "TIP": 0, "TFP": 4, "TCP": 3, "Prioridad": 1},
  {"id": "P2", "TIP": 1, "TFP": 7, "TCP": 2, "Prioridad": 2}
]`,
    columnas: ['id/nombre', 'TIP (tiempo arribo)', 'TFP (ráfagas CPU)', 'TCP (duración CPU)', 'Prioridad'],
    notas: [
      '✅ Acepta "id" o "nombre" para el identificador',
      '✅ Campos cortos para facilidad de escritura',
      '⚠️ No incluye duración de I/O (se usa TCP por defecto)',
      '📁 Archivo: ejemplo_5procesos.json'
    ]
  },
  {
    tipo: 'JSON - Formato Completo',
    descripcion: 'Array de objetos con campos descriptivos completos',
    ejemplo: `[
  {
    "name": "P1",
    "arrivalTime": 0,
    "cpuBursts": 3,
    "cpuBurstDuration": 5,
    "ioBurstDuration": 4,
    "priority": 50
  }
]`,
    columnas: ['name', 'arrivalTime', 'cpuBursts', 'cpuBurstDuration', 'ioBurstDuration', 'priority'],
    notas: [
      '✅ Campos descriptivos y claros',
      '✅ Incluye duración de I/O separada',
      '✅ Prioridades en rango 1-100 (mayor = más prioridad)',
      '📁 Archivo: ejemplo_5procesos_completo.json'
    ]
  },
  {
    tipo: 'CSV - Formato Tabular',
    descripcion: 'Archivo CSV con headers y datos separados por comas',
    ejemplo: `name,tiempoArribo,rafagasCPU,duracionRafagaCPU,duracionRafagaES,prioridad
P1,0,3,5,4,50
P2,1,2,6,3,60`,
    columnas: ['name', 'tiempoArribo', 'rafagasCPU', 'duracionRafagaCPU', 'duracionRafagaES', 'prioridad'],
    notas: [
      '✅ Compatible con Excel y hojas de cálculo',
      '✅ Primer línea debe contener headers exactos',
      '✅ Separado por comas',
      '📁 Archivo: ejemplo_5procesos.csv'
    ]
  },
  {
    tipo: 'TXT - Formato Separado por Tabs',
    descripcion: 'Archivo de texto con datos separados por tabs (sin headers)',
    ejemplo: `P1	0	3	5	4	50
P2	1	2	6	3	60
P3	2	1	4	2	40`,
    columnas: ['nombre', 'tiempo_arribo', 'cantidad_rafagas_cpu', 'duracion_rafaga_cpu', 'duracion_rafaga_es', 'prioridad_externa'],
    notas: [
      '✅ Separado por tabs (\\t)',
      '✅ Sin línea de headers',
      '✅ Orden fijo de columnas',
      '📁 Archivo: ejemplo_5procesos.txt'
    ]
  }
];

function mostrarFormatos(): void {
  console.log('\\n📋 FORMATOS SOPORTADOS\\n');
  
  for (let i = 0; i < formatosEjemplos.length; i++) {
    const formato = formatosEjemplos[i];
    console.log(`${i + 1}. ${formato.tipo}`);
    console.log(`   📄 ${formato.descripcion}\\n`);
    
    console.log('   📝 Ejemplo:');
    console.log(formato.ejemplo.split('\\n').map(line => `   ${line}`).join('\\n'));
    
    console.log('\\n   📋 Columnas (en orden):');
    for (let j = 0; j < formato.columnas.length; j++) {
      console.log(`      ${j + 1}. ${formato.columnas[j]}`);
    }
    
    console.log('\\n   📌 Notas:');
    for (const nota of formato.notas) {
      console.log(`      ${nota}`);
    }
    
    if (i < formatosEjemplos.length - 1) {
      console.log('\\n' + '─'.repeat(60) + '\\n');
    }
  }
}

function mostrarErroresComunes(): void {
  console.log('\\n⚠️ ERRORES COMUNES Y SOLUCIONES');
  console.log('================================\\n');
  
  const errores = [
    {
      error: 'CSV: falta columna name',
      causa: 'El CSV usa "ID" en lugar de "name"',
      solucion: 'Cambiar primera columna a "name" en el CSV',
      ejemplo: 'name,tiempoArribo,rafagasCPU,... (no ID,TIP,TFP,...)'
    },
    {
      error: 'CSV: falta columna tiempoArribo',
      causa: 'El CSV usa "TIP" en lugar de "tiempoArribo"',
      solucion: 'Usar nombres completos de columnas en CSV',
      ejemplo: 'tiempoArribo (no TIP)'
    },
    {
      error: 'Archivo JSON inválido',
      causa: 'Sintaxis JSON incorrecta (comas, corchetes, comillas)',
      solucion: 'Validar JSON en editor o validador online',
      ejemplo: 'Verificar que todas las comillas sean dobles "text"'
    },
    {
      error: 'TXT: campos insuficientes',
      causa: 'Faltan columnas en el archivo TXT',
      solucion: 'Asegurar 6 campos separados por tabs',
      ejemplo: 'P1\\t0\\t3\\t5\\t4\\t50 (6 campos exactos)'
    }
  ];
  
  for (const err of errores) {
    console.log(`❌ ${err.error}`);
    console.log(`   🔍 Causa: ${err.causa}`);
    console.log(`   ✅ Solución: ${err.solucion}`);
    console.log(`   💡 Ejemplo: ${err.ejemplo}\\n`);
  }
}

function mostrarArchivosEjemplo(): void {
  console.log('\\n📁 ARCHIVOS DE EJEMPLO DISPONIBLES');
  console.log('====================================\\n');
  
  const archivos = [
    {
      nombre: 'ejemplo_5procesos.json',
      tipo: 'JSON Simplificado',
      descripcion: 'Formato corto con id, TIP, TFP, TCP, Prioridad'
    },
    {
      nombre: 'ejemplo_5procesos_completo.json',
      tipo: 'JSON Completo',
      descripcion: 'Formato descriptivo con name, arrivalTime, etc.'
    },
    {
      nombre: 'ejemplo_5procesos.csv',
      tipo: 'CSV con Headers',
      descripcion: 'Formato tabular con columnas name,tiempoArribo,etc.'
    },
    {
      nombre: 'ejemplo_5procesos.txt',
      tipo: 'TXT Separado por Tabs',
      descripcion: 'Formato plano con 6 campos por línea'
    }
  ];
  
  for (const archivo of archivos) {
    console.log(`📄 ${archivo.nombre}`);
    console.log(`   🏷️ Tipo: ${archivo.tipo}`);
    console.log(`   📋 Descripción: ${archivo.descripcion}\\n`);
  }
}

function mostrarInstruccionesUso(): void {
  console.log('\\n🎯 INSTRUCCIONES DE USO');
  console.log('========================\\n');
  
  console.log('1. 🎛️ Seleccionar tipo de archivo en la UI:');
  console.log('   • "Archivo JSON" para formatos .json');
  console.log('   • "Archivo CSV/TXT" para formatos .csv y .txt\\n');
  
  console.log('2. 📄 Ver formato esperado:');
  console.log('   • La UI muestra el formato según el tipo seleccionado');
  console.log('   • Incluye ejemplo de columnas y estructura\\n');
  
  console.log('3. 📁 Seleccionar archivo:');
  console.log('   • El filtro se ajusta al tipo seleccionado');
  console.log('   • Solo acepta extensiones apropiadas\\n');
  
  console.log('4. ✅ Cargar:');
  console.log('   • El sistema usa el parser correcto');
  console.log('   • Errores específicos si hay problemas de formato');
}

// Ejecutar toda la documentación
mostrarFormatos();
mostrarErroresComunes();
mostrarArchivosEjemplo();
mostrarInstruccionesUso();

console.log('\\n====================================');
console.log('📌 RESUMEN IMPORTANTE');
console.log('JSON: Acepta ambos formatos (simplificado y completo)');
console.log('CSV: Requiere headers exactos (name, tiempoArribo, etc.)');
console.log('TXT: 6 campos separados por tabs, sin headers');
console.log('====================================');
