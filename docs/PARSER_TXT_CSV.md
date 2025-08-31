# Parser TXT/CSV - Documentación

## 📋 Resumen

El parser TXT/CSV permite cargar workloads de procesos desde archivos de texto plano, usando exactamente los **6 campos** requeridos por el simulador.

## 🗂️ Formato de Archivo

### **Campos Requeridos (en orden)**

1. **nombre**: Identificador del proceso (string, debe empezar con letra)
2. **tiempo_arribo**: Momento de llegada al sistema (número ≥ 0)
3. **cantidad_rafagas_cpu**: Número de ráfagas de CPU (entero ≥ 1)
4. **duracion_rafaga_cpu**: Duración de cada ráfaga de CPU (número > 0)
5. **duracion_rafaga_es**: Duración de cada operación E/S (número ≥ 0)
6. **prioridad_externa**: Prioridad del proceso (entero 1-100, mayor = más prioridad)

### **Separadores Soportados**

- **Comas** (`,`) - formato CSV estándar
- **Espacios** (` `) - formato TXT simple
- **Tabulaciones** (`\t`) - formato TSV
- **Auto-detección** - detecta automáticamente el separador más probable

### **Características**

- ✅ **Auto-detección de headers**: Omite automáticamente líneas de encabezado
- ✅ **Comentarios**: Líneas que empiecen con `#` son ignoradas
- ✅ **Validaciones**: Nombres únicos, números válidos, rangos correctos
- ✅ **Errores informativos**: Muestra línea y campo específico del error

## 📝 Ejemplos de Formato

### **CSV con headers**
```csv
nombre,tiempo_arribo,cantidad_rafagas_cpu,duracion_rafaga_cpu,duracion_rafaga_es,prioridad_externa
P1,0,3,5,4,2
P2,1,2,6,3,1
P3,3,4,3,2,3
```

### **TXT con comentarios**
```txt
# Ejemplo de archivo TXT con procesos
# Formato: nombre, tiempo_arribo, cantidad_rafagas_cpu, duracion_rafaga_cpu, duracion_rafaga_es, prioridad_externa
P1, 0, 3, 5, 4, 2
P2, 1, 2, 6, 3, 1  
P3, 3, 4, 3, 2, 3
```

### **TSV (separado por tabs)**
```tsv
P1	0	1	10	0	50
P2	2	1	3	0	60
P3	4	1	8	0	90
```

## 💻 Uso Programático

### **Importar funciones**
```typescript
import { 
  parseTxtToWorkload, 
  parseTxtToProcesses,
  createDefaultConfig,
  TxtParseError 
} from '../src/lib/infrastructure/parsers/txtParser';
```

### **Parsear solo procesos**
```typescript
const contenido = readFileSync('procesos.txt', 'utf-8');
const procesos = parseTxtToProcesses(contenido);

console.log(`Procesos encontrados: ${procesos.length}`);
for (const proc of procesos) {
  console.log(`${proc.name}: arribo=${proc.tiempoArribo}, CPU=${proc.duracionRafagaCPU}`);
}
```

### **Crear workload completo**
```typescript
const config = createDefaultConfig('RR');
config.quantum = 4;
config.tip = 1;
config.tfp = 1;
config.tcp = 1;

const workload = parseTxtToWorkload(contenido, config, 'archivo.csv');

// Ejecutar simulación
const resultado = await ejecutarSimulacionCompleta(workload);
```

### **Configuración personalizada**
```typescript
const config = {
  policy: 'PRIORITY' as Policy,
  tip: 2,
  tfp: 1,
  tcp: 1,
  separator: ','  // Forzar separador específico
};
```

## 🛡️ Validaciones Implementadas

### **Nombres de Procesos**
- Debe empezar con letra (a-z, A-Z)
- Solo puede contener letras, números y guiones bajos
- No puede estar vacío
- Debe ser único en el archivo

### **Valores Numéricos**
- `tiempo_arribo`: ≥ 0
- `cantidad_rafagas_cpu`: entero ≥ 1
- `duracion_rafaga_cpu`: > 0
- `duracion_rafaga_es`: ≥ 0
- `prioridad_externa`: entero entre 1 y 100

### **Estructura**
- Exactamente 6 campos por línea
- Al menos un proceso válido
- Formato numérico correcto

## ⚠️ Manejo de Errores

### **Errores Comunes**
```typescript
try {
  const procesos = parseTxtToProcesses(contenido);
} catch (error) {
  if (error instanceof TxtParseError) {
    console.log(`Error en línea ${error.line}: ${error.message}`);
    if (error.field) {
      console.log(`Campo problemático: ${error.field}`);
    }
  }
}
```

### **Mensajes de Error Típicos**
- `"Se esperan exactamente 6 campos, se encontraron X"`
- `"Nombre de proceso debe empezar con letra"`
- `"tiempo_arribo debe ser un número válido"`
- `"Nombres de procesos duplicados: P1, P2"`

## 🎯 Compatibilidad

### **Con JSON existente**
El parser genera exactamente el mismo formato que los archivos JSON existentes:

**JSON** → **TXT/CSV**
```json
{
  "nombre": "P1",
  "tiempo_arribo": 0,
  "cantidad_rafagas_cpu": 3,
  "duracion_rafaga_cpu": 5,
  "duracion_rafaga_es": 4,
  "prioridad_externa": 2
}
```
↓
```csv
P1,0,3,5,4,2
```

### **Con tipos del sistema**
```typescript
interface ProcessSpec {
  name: string;           // ← nombre
  tiempoArribo: number;   // ← tiempo_arribo
  rafagasCPU: number;     // ← cantidad_rafagas_cpu
  duracionRafagaCPU: number; // ← duracion_rafaga_cpu
  duracionRafagaES: number;  // ← duracion_rafaga_es
  prioridad: number;      // ← prioridad_externa
}
```

## 🧪 Tests y Validación

**Ubicación**: `tests/parsers/test-txt-parser.ts`
**Demo**: `demos/demo-parser-txt.ts`

### **Ejecutar tests**
```bash
npx tsx tests/parsers/test-txt-parser.ts
```

### **Ejecutar demo**
```bash
npx tsx demos/demo-parser-txt.ts
```

## ✅ Estado de Implementación

- ✅ **Parser TXT/CSV funcional** con 6 campos exactos
- ✅ **Auto-detección de separadores** (comas, espacios, tabs)
- ✅ **Manejo de headers** automático
- ✅ **Validaciones exhaustivas** con errores informativos
- ✅ **Compatibilidad completa** con sistema existente
- ✅ **Tests completos** con casos de éxito y error
- ✅ **Demos funcionales** con archivos reales
- ✅ **Documentación completa** con ejemplos de uso

El parser TXT/CSV está **completamente implementado** y listo para uso en producción.
