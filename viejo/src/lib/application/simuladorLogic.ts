/**
 * Módulo para manejar la lógica de la página principal del simulador
 * Usa únicamente tipos e infraestructura ya definida en el dominio
 */

import { cargarArchivo } from '$lib/infrastructure/parsers/workloadParser';
import { parseJsonToWorkload } from '$lib/infrastructure/parsers/jsonParser';
import { parseTxtToWorkload } from '$lib/infrastructure/parsers/txtParser';
import { ejecutarSimulacion as ejecutarSimulacionCore } from '$lib/application/usecases/runSimulation';
import { GanttBuilder, type DiagramaGantt } from '$lib/domain/services';
import type { Policy, Workload, ProcessSpec, RunConfig, SimEvent, Metrics } from '$lib/domain/types';

// Tipos simples para la UI usando los tipos del dominio
export interface ProcesoSimple {
  nombre: string;
  llegada: number;
  rafaga: number;
  prioridad: number;
}

export interface ConfiguracionSimulacion {
  policy: Policy;
  tip: number;
  tfp: number;
  tcp: number;
  quantum?: number;
}

export interface ResultadoSimulacion {
  events: SimEvent[];
  metrics: Metrics;
  warnings: string[];
  tiempoTotal: number;
  gantt?: DiagramaGantt;
}

export interface DatosSimulacionCompleta {
  procesos: ProcesoSimple[];
  configuracion: ConfiguracionSimulacion;
  resultados: ResultadoSimulacion;
  timestamp: string;
}

/**
 * Estructura versionada para persistencia en localStorage
 * Previene problemas de compatibilidad al cambiar esquemas
 */
export interface DatosVersionados {
  version: string;                    // Versión del esquema de datos
  data: DatosSimulacionCompleta;     // Datos reales de la simulación
  metadata: {
    timestamp: string;               // Cuándo se guardó
    appVersion?: string;             // Versión de la aplicación que lo guardó
  };
}

// Versión actual del esquema de datos
export const SCHEMA_VERSION = '1.0.0';

/**
 * Detecta el tipo de archivo basado en la extensión
 */
function detectarTipoArchivo(filename: string): 'json' | 'csv' {
  const extension = filename.toLowerCase().split('.').pop();
  return extension === 'json' ? 'json' : 'csv';
}

/**
 * Maneja la carga de archivos usando la infraestructura existente
 */
export async function cargarArchivoProcesos(file: File): Promise<{
  procesos: ProcesoSimple[];
  error?: string;
}> {
  try {
    const tipoArchivo = detectarTipoArchivo(file.name);
    console.log(`🔍 Archivo: "${file.name}", Tipo detectado: ${tipoArchivo}, Tamaño: ${file.size} bytes`);
    
    let workload: Workload;
    
    // Usar el parser apropiado según el tipo de archivo
    if (tipoArchivo === 'json') {
      console.log('📄 Usando parser JSON (parseJsonToWorkload)...');
      workload = await parseJsonToWorkload(file);
    } else {
      console.log('📄 Usando parser TXT/CSV (parseTxtToWorkload)...');
      const content = await file.text();
      workload = parseTxtToWorkload(content, {
        separator: ',',
        policy: 'FCFS', // Default policy, será actualizada después
        tip: 1,
        tfp: 1,
        tcp: 1
      }, file.name);
    }
    
    console.log('📋 Resultado del parser:', workload);
    
    if (workload.processes && workload.processes.length > 0) {
      const procesos: ProcesoSimple[] = workload.processes.map((p: ProcessSpec) => {
        console.log('    Convirtiendo proceso:', p);
        return {
          nombre: p.id,
          llegada: p.arribo,
          rafaga: p.duracionCPU,
          prioridad: p.prioridad
        };
      });
      
      console.log(`  ${procesos.length} procesos convertidos exitosamente:`, procesos);
      return { procesos };
    } else {
      console.warn('⚠️ No se encontraron procesos en el resultado:', workload);
      return { 
        procesos: [], 
        error: 'No se encontraron procesos válidos en el archivo' 
      };
    }
  } catch (error) {
    console.error('   Error detallado al procesar archivo:', {
      error,
      mensaje: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      archivo: file.name,
      tamaño: file.size
    });
    
    return { 
      procesos: [], 
      error: `Error al procesar archivo: ${error}` 
    };
  }
}

/**
 * Valida que la configuración esté completa
 */
export function validarConfiguracion(config: ConfiguracionSimulacion): {
  valida: boolean;
  errores: string[];
} {
  const errores: string[] = [];
  
  if (!config.policy) {
    errores.push('Debe seleccionar un algoritmo de planificación');
  }
  
  if (config.tip < 0) {
    errores.push('TIP no puede ser negativo');
  }
  
  if (config.tfp < 0) {
    errores.push('TFP no puede ser negativo');
  }
  
  if (config.tcp < 0) {
    errores.push('TCP no puede ser negativo');
  }
  
  if (config.policy === 'RR' && (!config.quantum || config.quantum < 1)) {
    errores.push('Quantum debe ser mayor a 0 para Round Robin');
  }
  
  return {
    valida: errores.length === 0,
    errores
  };
}

/**
 * Ejecuta la simulación usando la infraestructura existente
 */
export async function ejecutarSimulacion(
  procesos: ProcesoSimple[],
  configuracion: ConfiguracionSimulacion
): Promise<ResultadoSimulacion> {
  
  // Crear workload en el formato esperado por el simulador
  const workload: Workload = {
    workloadName: 'Simulación Manual',
    processes: procesos.map((p): ProcessSpec => ({
      id: p.nombre,
      arribo: p.llegada,
      rafagasCPU: 1,
      duracionCPU: p.rafaga,
      duracionIO: 0,
      prioridad: p.prioridad
    })),
    config: {
      policy: configuracion.policy,
      tip: configuracion.tip,
      tfp: configuracion.tfp,
      tcp: configuracion.tcp,
      quantum: configuracion.quantum
    } as RunConfig
  };
  
  try {
    console.log('🚀 Ejecutando simulación con workload:', workload);
    
    // Usar la función ejecutarSimulacion que ya tiene la lógica de Gantt corregida
    const resultado = await ejecutarSimulacionCore(workload);
    
    console.log('  Simulación completada:', resultado);
    
    // Generar diagrama de Gantt
    console.log('🎨 Generando diagrama de Gantt...');
    const gantt = GanttBuilder.construirDiagramaGantt(resultado.eventos, workload.config);
    console.log('📊 Gantt generado:', {
      segmentos: gantt.segmentos.length,
      tiempoTotal: gantt.tiempoTotal,
      procesos: gantt.procesos.length
    });
    
    return {
      events: resultado.eventos,
      metrics: resultado.metricas,
      warnings: [],
      tiempoTotal: 0, // No tenemos este dato en el resultado simplificado
      gantt
    };
  } catch (error) {
    console.error('   Error en simulación:', error);
    throw new Error(`Error en simulación: ${error}`);
  }
}

/**
 * Guarda los datos de simulación en localStorage con versionado de esquema
 */
export function guardarDatosSimulacion(datos: DatosSimulacionCompleta): void {
  try {
    const datosVersionados: DatosVersionados = {
      version: SCHEMA_VERSION,
      data: datos,
      metadata: {
        timestamp: new Date().toISOString(),
        appVersion: '1.0.0' // TODO: obtener desde package.json
      }
    };
    
    localStorage.setItem('ultimaSimulacion', JSON.stringify(datosVersionados));
    console.log(`💾 Datos guardados en localStorage (schema v${SCHEMA_VERSION})`);
  } catch (error) {
    console.error('   Error al guardar datos de simulación:', error);
  }
}

/**
 * Carga los datos de simulación desde localStorage con validación de esquema
 */
export function cargarDatosSimulacion(): DatosSimulacionCompleta | null {
  try {
    const rawData = localStorage.getItem('ultimaSimulacion');
    if (!rawData) {
      console.log('💾 No hay datos guardados en localStorage');
      return null;
    }
    
    const parsed = JSON.parse(rawData);
    
    // Verificar si es el formato versionado nuevo
    if (parsed.version && parsed.data) {
      const datosVersionados = parsed as DatosVersionados;
      
      if (datosVersionados.version !== SCHEMA_VERSION) {
        console.warn(`⚠️ Esquema incompatible: guardado v${datosVersionados.version}, actual v${SCHEMA_VERSION}`);
        console.warn('🗑️ Invalidando datos antiguos para evitar errores');
        localStorage.removeItem('ultimaSimulacion');
        return null;
      }
      
      console.log(`💾 Datos cargados desde localStorage (schema v${datosVersionados.version})`);
      return datosVersionados.data;
    }
    
    // Formato legacy (sin versionado) - migrar automáticamente
    if (parsed.procesos && parsed.configuracion && parsed.resultados) {
      console.warn('    Detectado formato legacy, migrando a formato versionado...');
      
      const datosLegacy = parsed as DatosSimulacionCompleta;
      
      // Guardar en formato versionado
      guardarDatosSimulacion(datosLegacy);
      
      console.log('  Migración completada');
      return datosLegacy;
    }
    
    // Formato desconocido
    console.error('   Formato de datos no reconocido, limpiando localStorage');
    localStorage.removeItem('ultimaSimulacion');
    return null;
    
  } catch (error) {
    console.error('   Error al cargar datos de simulación:', error);
    console.warn('🗑️ Limpiando localStorage por error de parseo');
    localStorage.removeItem('ultimaSimulacion');
    return null;
  }
}

/**
 * Limpia los datos de simulación guardados
 */
export function limpiarDatosSimulacion(): void {
  try {
    localStorage.removeItem('ultimaSimulacion');
    console.log('🗑️ Datos de simulación limpiados');
  } catch (error) {
    console.error('   Error al limpiar datos de simulación:', error);
  }
}
