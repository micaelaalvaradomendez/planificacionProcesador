# 🏗️ Propuesta de Reorganización del Proyecto

## 📋 **Estructura Actual vs Propuesta**

### 🔴 **Problemas Identificados**

#### 1. **Archivos en la raíz mal organizados:**
```
❌ Raíz actual:
├── demo-exportacion-final.ts
├── demo-gantt-integrado.ts  
├── demo-integrador.ts
├── debug-simple.json
├── ejemplo-fcfs-simple.json
├── eventos.json
├── demo-gantt.json
├── test-exportacion-gantt.json
├── GANTT-IMPLEMENTACION.md
├── README-INTEGRADOR.md
├── RESUMEN-EXPORTACION-GANTT.md
└── (archivos de configuración que SÍ van en raíz)
```

#### 2. **Carpetas vacías:**
- `./salida-test/` 
- `./salida/`
- `./resultados/`
- `./temp/`

#### 3. **Duplicación de funcionalidades:**
- `src/lib/io/` vs `src/lib/infrastructure/`
- `src/lib/sim/` vs `src/lib/core/`

### ✅ **Estructura Propuesta**

```
📁 planificacionProcesador/
├── 📄 package.json                    # ✅ Configuración (queda)
├── 📄 tsconfig.json                   # ✅ Configuración (queda)
├── 📄 vite.config.ts                  # ✅ Configuración (queda)
├── 📄 svelte.config.js                # ✅ Configuración (queda)
├── 📄 README.md                       # ✅ Principal (queda)
│
├── 📁 src/                            # ✅ Código fuente
│   ├── 📁 lib/
│   │   ├── 📁 core/                   # ✅ Motor de simulación
│   │   ├── 📁 domain/                 # ✅ Lógica de negocio
│   │   ├── 📁 application/            # ✅ Casos de uso
│   │   ├── 📁 infrastructure/         # ✅ I/O y persistencia
│   │   ├── 📁 ui/                     # ✅ Componentes Svelte
│   │   └── 📁 utils/                  # ✅ Utilidades
│   └── 📁 routes/                     # ✅ Rutas Svelte
│
├── 📁 tests/                          # ✅ Tests organizados
│   ├── 📁 core/
│   ├── 📁 algorithms/
│   ├── 📁 gantt/
│   └── 📁 integration/
│
├── 📁 demos/                          # 🆕 NUEVA: Archivos de demostración
│   ├── 📄 demo-exportacion-final.ts
│   ├── 📄 demo-gantt-integrado.ts
│   └── 📄 demo-integrador.ts
│
├── 📁 examples/                       # 🆕 NUEVA: Datos de ejemplo
│   ├── 📁 workloads/
│   │   ├── 📄 debug-simple.json
│   │   └── 📄 ejemplo-fcfs-simple.json
│   └── 📁 outputs/                    # Archivos generados
│       ├── 📄 eventos.json
│       ├── 📄 demo-gantt.json
│       └── 📄 test-exportacion-gantt.json
│
├── 📁 docs/                           # 🆕 NUEVA: Documentación consolidada
│   ├── 📄 README-INTEGRADOR.md
│   ├── 📄 GANTT-IMPLEMENTACION.md
│   ├── 📄 RESUMEN-EXPORTACION-GANTT.md
│   └── 📁 research/                   # Documentación de investigación
│       ├── 📄 algoritmos.md
│       ├── 📄 apunte.md
│       ├── 📄 GLOSARIO_CONCEPTOS.md
│       └── 📄 TERMINOLOGIA.md
│
└── 📁 static/                         # ✅ Archivos estáticos
```

## 🔧 **Refactoring de Módulos**

### 1. **Consolidar `src/lib/io/` en `src/lib/infrastructure/`**
```typescript
// Mover funcionalidades de I/O a infrastructure
src/lib/infrastructure/
├── io/
│   ├── eventLogger.ts      # De src/lib/io/
│   ├── ganttBuilder.ts     # De src/lib/io/
│   └── ganttExporter.ts    # De src/lib/io/
├── exporters/              # ✅ Ya existe
└── parsers/                # ✅ Ya existe
```

### 2. **Eliminar `src/lib/sim/` duplicado**
```typescript
// Mover funcionalidades a core/ o domain/
src/lib/sim/events.ts  → src/lib/core/events.ts
src/lib/sim/gantt.ts   → src/lib/domain/events/gantt.ts
```

### 3. **Limpiar duplicaciones en domain/**
```typescript
// Consolidar tipos
src/lib/domain/types.ts + src/lib/model/types.ts
src/lib/domain/utils.ts + src/lib/utils/format.ts
```

## 🗂️ **Plan de Migración**

### Paso 1: Crear nuevas carpetas
- `mkdir demos examples docs/research`

### Paso 2: Mover archivos de demostración
- `demo-*.ts` → `demos/`

### Paso 3: Mover archivos de datos
- `*.json` (ejemplos/outputs) → `examples/`

### Paso 4: Consolidar documentación
- `*.md` → `docs/`

### Paso 5: Refactoring de módulos
- Consolidar `io/` en `infrastructure/`
- Eliminar `sim/` duplicado
- Limpiar duplicaciones

### Paso 6: Limpiar carpetas vacías
- Eliminar `salida-test/`, `salida/`, `resultados/`, `temp/`

### Paso 7: Actualizar imports
- Actualizar todas las referencias de rutas en el código

## ✅ **Beneficios de la Reorganización**

1. **📁 Estructura más clara**: Separación por propósito
2. **🔍 Mejor navegación**: Menos archivos en raíz
3. **🧹 Eliminación de duplicaciones**: Código más limpio
4. **📚 Documentación organizada**: Todo en `docs/`
5. **🚀 Demos fáciles de encontrar**: En `demos/`
6. **📊 Ejemplos organizados**: En `examples/`

## 🚨 **Consideraciones**

- **Importaciones**: Hay que actualizar imports en ~50 archivos
- **Tests**: Actualizar rutas en archivos de test
- **Configuración**: Posibles ajustes en vite.config.ts
- **Git**: Usar `git mv` para conservar historial

¿Procedemos con la reorganización?
