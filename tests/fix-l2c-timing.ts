import * as fs from 'fs';

// Leer el archivo
const filePath = './src/lib/engine/engine.ts';
const content = fs.readFileSync(filePath, 'utf8');

// Función para reemplazar en una función específica
function replaceInFunction(content: string, functionStart: string, oldPattern: RegExp, newReplacement: string): string {
  const lines = content.split('\n');
  let inTargetFunction = false;
  let braceCount = 0;
  let functionStarted = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detectar inicio de función
    if (line.includes(functionStart)) {
      inTargetFunction = true;
      functionStarted = false;
    }
    
    if (inTargetFunction) {
      // Contar llaves para saber cuándo termina la función
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      
      if (!functionStarted && openBraces > 0) {
        functionStarted = true;
        braceCount = openBraces - closeBraces;
      } else if (functionStarted) {
        braceCount += openBraces - closeBraces;
      }
      
      // Aplicar reemplazo solo dentro de esta función
      if (functionStarted && oldPattern.test(line)) {
        lines[i] = line.replace(oldPattern, newReplacement);
        console.log(`Reemplazado en línea ${i + 1} de ${functionStart}`);
      }
      
      // Si llegamos al final de la función, salir
      if (functionStarted && braceCount <= 0) {
        inTargetFunction = false;
        break;
      }
    }
  }
  
  return lines.join('\n');
}

let modifiedContent = content;

// Reemplazar traceEvent en cada función
const replacements = [
  { func: 'export function runFCFS', pattern: /(\s+)traceEvent\(trace, e\.t, e\.type, e\.pid\);(\s+\/\/ TCP se aplica ANTES del inicio del slice\s+const tStart = e\.t \+ TCP;)/, replacement: '$1// TCP se aplica ANTES del inicio del slice$2$1traceEvent(trace, tStart, \'L→C\', e.pid);' },
  { func: 'export function runRR', pattern: /(\s+)traceEvent\(trace, e\.t, e\.type, e\.pid\);(\s+\/\/ TCP se aplica ANTES del inicio del slice\s+const tStart = e\.t \+ TCP;)/, replacement: '$1// TCP se aplica ANTES del inicio del slice$2$1traceEvent(trace, tStart, \'L→C\', e.pid);' },
  { func: 'export function runSPN', pattern: /(\s+)traceEvent\(trace, e\.t, e\.type, e\.pid\);(\s+\/\/ TCP se aplica ANTES del inicio del slice\s+const tStart = e\.t \+ TCP;)/, replacement: '$1// TCP se aplica ANTES del inicio del slice$2$1traceEvent(trace, tStart, \'L→C\', e.pid);' },
  { func: 'export function runSRTN', pattern: /(\s+)traceEvent\(trace, e\.t, e\.type, e\.pid\);(\s+const tStart = e\.t \+ TCP;)/, replacement: '$1const tStart = e.t + TCP;$1traceEvent(trace, tStart, \'L→C\', e.pid);' },
  { func: 'export function runPriority', pattern: /(\s+)traceEvent\(trace, e\.t, e\.type, e\.pid\);(\s+const tStart = e\.t \+ TCP;)/, replacement: '$1const tStart = e.t + TCP;$1traceEvent(trace, tStart, \'L→C\', e.pid);' }
];

for (const { func, pattern, replacement } of replacements) {
  modifiedContent = replaceInFunction(modifiedContent, func, pattern, replacement);
}

// Guardar el archivo modificado
fs.writeFileSync(filePath, modifiedContent);
console.log('✅ Archivo modificado correctamente');