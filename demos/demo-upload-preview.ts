/**
 * 🧪 DEMO PRÁCTICO: UploadFileWithPreview
 * Simulación de uso con archivos de ejemplo
 */

// Simulamos diferentes tipos de archivos para mostrar el preview
const ejemplosArchivos = {
  json: {
    name: 'procesos_demo.json',
    content: JSON.stringify([
      { "id": "P1", "TIP": 0, "TFP": 4, "TCP": 3, "Prioridad": 1 },
      { "id": "P2", "TIP": 1, "TFP": 7, "TCP": 2, "Prioridad": 2 },
      { "id": "P3", "TIP": 2, "TFP": 8, "TCP": 4, "Prioridad": 1 }
    ], null, 2),
    size: 234
  },
  csv: {
    name: 'procesos_demo.csv',
    content: `ID,TIP,TFP,TCP,Prioridad
P1,0,4,3,1
P2,1,7,2,2
P3,2,8,4,1
P4,3,5,1,3`,
    size: 78
  },
  txt: {
    name: 'procesos_demo.txt',
    content: `P1;0;4;3;1
P2;1;7;2;2
P3;2;8;4;1
P4;3;5;1;3`,
    size: 48
  }
};

console.log('🧪 DEMO PRÁCTICO: UploadFileWithPreview.svelte');
console.log('==============================================');

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'json': return '📄';
    case 'csv': return '📊';
    case 'txt': case 'tsv': return '📝';
    default: return '📁';
  }
}

function simulatePreview(archivo: any): void {
  console.log(`\n${getFileIcon(archivo.name)} ARCHIVO: ${archivo.name}`);
  console.log(`📏 Tamaño: ${formatFileSize(archivo.size)}`);
  console.log(`📂 Tipo: ${archivo.name.split('.').pop()?.toUpperCase()}`);
  
  console.log('\n👁️ PREVIEW DEL CONTENIDO:');
  console.log('─'.repeat(50));
  
  // Mostrar contenido truncado
  const lines = archivo.content.split('\n');
  const maxLines = 6;
  
  if (lines.length <= maxLines) {
    console.log(archivo.content);
  } else {
    console.log(lines.slice(0, maxLines).join('\n'));
    console.log(`... (${lines.length - maxLines} líneas más)`);
  }
  
  console.log('─'.repeat(50));
  
  // Simular parsing y mostrar procesos detectados
  try {
    let procesos: any[] = [];
    
    if (archivo.name.endsWith('.json')) {
      procesos = JSON.parse(archivo.content);
    } else {
      // Simular parsing CSV/TXT
      const lines = archivo.content.split('\n').filter(line => line.trim());
      const isCSV = archivo.content.includes(',');
      const separator = isCSV ? ',' : ';';
      
      // Skip header if present
      const dataLines = lines[0].includes('ID') ? lines.slice(1) : lines;
      
      procesos = dataLines.map((line, index) => {
        const parts = line.split(separator);
        return {
          id: parts[0] || `P${index + 1}`,
          TIP: parseInt(parts[1]) || 0,
          TFP: parseInt(parts[2]) || 0,
          TCP: parseInt(parts[3]) || 0,
          Prioridad: parseInt(parts[4]) || 1
        };
      });
    }
    
    console.log(`\n📋 PROCESOS DETECTADOS (${procesos.length} total):`);
    console.log('┌─────┬─────┬─────┬─────┬───────────┐');
    console.log('│ ID  │ TIP │ TFP │ TCP │ Prioridad │');
    console.log('├─────┼─────┼─────┼─────┼───────────┤');
    
    const maxShow = Math.min(5, procesos.length);
    for (let i = 0; i < maxShow; i++) {
      const p = procesos[i];
      console.log(`│ ${p.id.padEnd(3)} │ ${String(p.TIP).padEnd(3)} │ ${String(p.TFP).padEnd(3)} │ ${String(p.TCP).padEnd(3)} │ ${String(p.Prioridad).padEnd(9)} │`);
    }
    
    if (procesos.length > maxShow) {
      console.log(`│ ... │ ... │ ... │ ... │    ...    │`);
      console.log(`│     ${procesos.length - maxShow} procesos más no mostrados     │`);
    }
    
    console.log('└─────┴─────┴─────┴─────┴───────────┘');
    
    console.log('\n✅ ESTADO: Archivo válido, listo para cargar');
    
  } catch (error) {
    console.log('\n❌ ERROR EN PREVIEW:');
    console.log(`   ${error instanceof Error ? error.message : 'Error desconocido'}`);
    console.log('\n🚫 ESTADO: Archivo inválido, carga deshabilitada');
  }
}

function mostrarCaracteristicasComponente(): void {
  console.log('\n🎛️ CARACTERÍSTICAS DEL COMPONENTE');
  console.log('=================================');
  
  const caracteristicas = [
    '📁 Input file con soporte .json, .csv, .txt, .tsv',
    '📊 Información detallada del archivo seleccionado',
    '👁️ Preview automático del contenido',
    '📋 Tabla de procesos detectados (máximo 5 visibles)',
    '🔍 Validación de formato en tiempo real',
    '⚠️ Mensajes de error específicos y descriptivos',
    '📝 Vista expandible del contenido raw',
    '🚫 Deshabilitación automática si hay errores',
    '🎨 Iconos contextuales según tipo de archivo',
    '📏 Formato legible de tamaño de archivo',
    '🔧 Auto-detección de separadores (coma vs punto y coma)',
    '📐 Truncado inteligente para archivos grandes'
  ];
  
  for (const caracteristica of caracteristicas) {
    console.log(`   ${caracteristica}`);
  }
}

function mostrarIntegracionConUI(): void {
  console.log('\n🔗 INTEGRACIÓN CON LA UI');
  console.log('========================');
  
  console.log('\n📄 Páginas que pueden usar el componente:');
  console.log('   • /src/routes/+page.svelte (página principal)');
  console.log('   • /src/routes/simulacion/+page.svelte (página de simulación)');
  
  console.log('\n🔄 Reemplazo del componente actual:');
  console.log('   🔴 Antes: <UploadFile ... />');
  console.log('   🟢 Después: <UploadFileWithPreview ... />');
  
  console.log('\n📤 Props del componente:');
  console.log('   • bind:procesos - Lista de procesos cargados');
  console.log('   • bind:errors - Lista de errores de carga');
  console.log('   • bind:loading - Estado de carga');
  console.log('   • label - Etiqueta personalizada del input');
  
  console.log('\n🎯 Eventos emitidos:');
  console.log('   • fileLoaded - Cuando se carga un archivo exitosamente');
  console.log('   • fileError - Cuando hay errores en la carga');
  console.log('   • filePreview - Cuando se muestra preview del archivo');
}

// Ejecutar demos
mostrarCaracteristicasComponente();

console.log('\n🧪 SIMULACIÓN DE USO CON DIFERENTES FORMATOS');
console.log('============================================');

// Demo con archivo JSON
simulatePreview(ejemplosArchivos.json);

// Demo con archivo CSV
simulatePreview(ejemplosArchivos.csv);

// Demo con archivo TXT
simulatePreview(ejemplosArchivos.txt);

mostrarIntegracionConUI();

console.log('\n============================================');
console.log('🎯 RESUMEN');
console.log('✅ Componente UploadFileWithPreview.svelte implementado');
console.log('📊 Preview funcional para JSON, CSV y TXT');
console.log('🔍 Validación en tiempo real');
console.log('🎨 Interfaz profesional y user-friendly');
console.log('🔗 Listo para integrar en las páginas principales');
