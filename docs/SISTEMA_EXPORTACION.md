# 💾 Sistema de Exportación de Datos - Documentación

## Descripción General

El sistema de exportación permite descargar todos los resultados de la simulación en diferentes formatos para análisis posterior, presentación o almacenamiento. El componente **PanelExportacion** proporciona una interfaz intuitiva para configurar y descargar los datos.

## 🎯 Funcionalidades Implementadas

### 1. **Exportación de Eventos**
- **Formatos disponibles**: CSV, TXT, JSON
- **Configuración**: Separadores personalizables, inclusión de encabezados
- **Contenido**: Cronología completa de eventos de la simulación

### 2. **Exportación de Métricas**
- **Formatos disponibles**: CSV, JSON
- **Contenido**: Estadísticas por proceso y de la tanda completa
- **Cálculos**: Incluye porcentajes automáticos de utilización

### 3. **Exportación de Gantt**
- **Formatos disponibles**: JSON, SVG, ASCII
- **JSON**: Datos estructurados para análisis posterior
- **SVG**: Imagen vectorial escalable para documentos
- **ASCII**: Representación textual para reportes simples

### 4. **Exportación Completa**
- **Función "Exportar Todo"**: Descarga automática de todos los formatos
- **Nomenclatura consistente**: Archivos nombrados con algoritmo y fecha

## 📋 Estructura de Archivos Exportados

### Eventos CSV
```csv
tiempo;tipoEvento;proceso;extra
0;ARRIBO_TRABAJO;P1;llega al sistema
1;INCORPORACION_SISTEMA;P1;TIP=1
2;DESPACHO;P1;TCP=1
```

### Métricas CSV
```csv
=== MÉTRICAS DE LA TANDA ===
Concepto;Valor;Unidad
Tiempo Retorno Tanda;14;unidades
Tiempo Medio Retorno;7;unidades
CPU Procesos;8;unidades
```

### Gantt ASCII
```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                    FCFS                                        │
├────────────────────────────────────────────────────────────────────────────────┤
│P1      │█████████████████████████████████                                     │
│P2      │                                        ████████████████████          │
└────────────────────────────────────────────────────────────────────────────────┘
```

## 🛠️ Uso del Componente

### Importación
```svelte
import PanelExportacion from '$lib/ui/components/PanelExportacion.svelte';
```

### Uso
```svelte
<PanelExportacion {datosSimulacion} />
```

### Propiedades
- `datosSimulacion: DatosSimulacionCompleta` - Datos completos de la simulación

## ⚙️ Configuración Disponible

### Eventos
- **Formato**: CSV, TXT, JSON
- **Separador** (solo CSV): `;` (punto y coma), `,` (coma), `\t` (tabulación)
- **Encabezados**: Incluir/omitir línea de encabezados

### Métricas
- **Formato**: CSV, JSON
- **Contenido automático**: Métricas por proceso y de tanda
- **Porcentajes**: Calculados automáticamente

### Gantt
- **Formato**: JSON, SVG, ASCII
- **SVG**: Imagen de 800x400px con colores diferenciados
- **ASCII**: Representación de 80 caracteres de ancho

## 🔧 Arquitectura Técnica

### Módulos Principales

#### 1. **exportEvents.ts**
```typescript
// Funciones principales
export function exportarEventosComoCSV(eventos: SimEvent[], config: ConfiguracionExportacion): Blob
export function exportarEventosComoTXT(eventos: SimEvent[], config: ConfiguracionExportacion): Blob
```

#### 2. **exportMetrics.ts**
```typescript
// Funciones principales
export function exportarMetricasCSV(metrics: Metrics, separador?: string): string
export function conPorcentajes(m: Metrics): Metrics
```

#### 3. **ganttExporter.ts**
```typescript
// Funciones principales
export function exportarGanttSVG(gantt: any): string
export function exportarGanttASCII(gantt: any): string
```

#### 4. **fileDownloader.ts**
```typescript
// Utilidades de descarga
export function descargarTexto(contenido: string, nombreArchivo: string, mimeType?: string): void
export function descargarMetricas(metrics: Metrics, workloadName?: string): void
export function descargarGanttJSON(gantt: any, nombreBase: string): void
```

### Flujo de Datos
1. Usuario selecciona formato y configuración
2. Componente llama a función de exportación correspondiente
3. Se genera el contenido en el formato solicitado
4. Se crea un Blob y se descarga automáticamente

## 🎨 Diseño Visual

### Características
- **Header gradiente**: Turquesa a cian con información del panel
- **Cards organizadas**: Cada tipo de exportación en su propia tarjeta
- **Botón "Exportar Todo"**: Destacado en el header para exportación completa
- **Indicadores de estado**: Spinner durante la generación de archivos
- **Responsive**: Adaptado para móviles y escritorio

### Colores y Estados
- **Botones normales**: Turquesa intenso con hover animado
- **Botones deshabilitados**: Gris claro
- **Indicadores de proceso**: Spinner turquesa
- **Cards hover**: Sombra y borde turquesa

## 📝 Casos de Uso

### 1. **Análisis Académico**
- Exportar eventos CSV para análisis estadístico
- Descargar métricas JSON para comparaciones
- Obtener Gantt SVG para documentos de presentación

### 2. **Desarrollo y Debug**
- Exportar eventos TXT para debugging legible
- Obtener Gantt ASCII para logs de texto
- Descargar todos los formatos para pruebas completas

### 3. **Presentaciones**
- Gantt SVG para slides y documentos
- Métricas CSV para tablas y gráficos
- ASCII Gantt para reportes de texto simple

## 🧪 Testing y Validación

### Script de Prueba
```bash
npx tsx test-exportacion.ts
```

### Funciones Validadas
- ✅ Exportación CSV de eventos con configuración personalizable
- ✅ Exportación TXT de eventos con formato legible
- ✅ Exportación CSV de métricas con cálculos automáticos
- ✅ Generación SVG de Gantt con colores y leyenda
- ✅ Generación ASCII de Gantt para texto plano
- ✅ Descarga automática de archivos en navegador

## 🔮 Mejoras Futuras Posibles

### Filtros Avanzados
- Filtrar eventos por tipo o proceso
- Rango temporal específico para exportación
- Selección de métricas específicas

### Formatos Adicionales
- Excel (XLSX) para métricas
- PNG/JPEG para Gantt
- PDF para reportes completos

### Personalización
- Plantillas de exportación
- Configuración de colores en SVG
- Estilos personalizados para ASCII

## 📞 Soporte y Mantenimiento

### Errores Comunes
1. **"No hay datos de Gantt"**: Verificar que la simulación generó cronograma
2. **Descarga no inicia**: Revisar permisos del navegador para descargas
3. **Archivo vacío**: Verificar que hay datos de simulación cargados

### Logs de Debug
Los módulos de exportación generan logs detallados en consola:
- 📊 Cantidad de elementos exportados
- ⏱️ Tiempo de generación
- 📁 Tamaño de archivos generados

### Compatibilidad
- **Navegadores**: Chrome, Firefox, Safari, Edge (últimas versiones)
- **Sistemas**: Windows, macOS, Linux
- **Dispositivos**: Desktop, tablet, móvil (con diseño responsive)
