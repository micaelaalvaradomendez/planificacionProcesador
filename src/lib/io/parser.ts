// src/lib/io/parser.ts
import type { Proceso } from '../model/proceso';

/**
 * Estructura de tandas JSON externa (procesos_tanda_*.json)
 */
export interface ProcesoTanda {
  nombre: string;                // "P1"
  tiempo_arribo: number;         // 0,1,2...
  cantidad_rafagas_cpu: number;  // N
  duracion_rafaga_cpu: number;   // k
  duracion_rafaga_es?: number;   // IGNORAR en Paso 9 (usamos costos.bloqueoES global)
  prioridad_externa?: number;    // menor = mayor prioridad
}

/**
 * Extrae el PID numérico del nombre legacy "P1", "P2", etc.
 */
function parsePidFromNombre(nombre: string): number {
  const m = /^P(\d+)$/.exec(nombre.trim());
  if (!m) throw new Error(`nombre inválido: ${nombre}. Esperado formato P1, P2, etc.`);
  return Number(m[1]);
}

/**
 * Parser que convierte tandas JSON al modelo del core
 * 
 * Mapeo:
 * - nombre "P1" → pid=1, label="P1"
 * - tiempo_arribo → arribo
 * - cantidad_rafagas_cpu + duracion_rafaga_cpu → rafagasCPU (array repetido N veces)
 * - prioridad_externa → prioridadBase (para PRIORITY+aging)
 * - duracion_rafaga_es → para extraer bloqueoES global
 * 
 * @param items Array de procesos en formato tanda
 * @returns Array de procesos en formato del core
 */
export function parseTandaJSON(items: ProcesoTanda[]): Proceso[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Se requiere un array no vacío de procesos');
  }

  return items.map((it, index) => {
    try {
      const pid = parsePidFromNombre(it.nombre);
      
      // Validaciones anti-regresión
      if (!(it.tiempo_arribo >= 0)) {
        throw new Error(`arribo inválido: ${it.tiempo_arribo}. Debe ser >= 0`);
      }
      if (!(it.cantidad_rafagas_cpu > 0)) {
        throw new Error(`cantidad_rafagas_cpu inválida: ${it.cantidad_rafagas_cpu}. Debe ser > 0`);
      }
      if (!(it.duracion_rafaga_cpu > 0)) {
        throw new Error(`duracion_rafaga_cpu inválida: ${it.duracion_rafaga_cpu}. Debe ser > 0`);
      }
      
      // Validar prioridad si está presente
      if (it.prioridad_externa !== undefined && it.prioridad_externa < 1) {
        throw new Error(`prioridad_externa inválida: ${it.prioridad_externa}. Debe ser >= 1 (menor número = mayor prioridad)`);
      }

      // Construir array de ráfagas CPU
      const rafagasCPU = Array.from(
        { length: it.cantidad_rafagas_cpu }, 
        () => it.duracion_rafaga_cpu
      );

      return {
        pid,
        label: it.nombre,
        arribo: it.tiempo_arribo,
        rafagasCPU,
        prioridadBase: it.prioridad_externa,
        estado: 'N' as const,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Error en proceso ${index + 1} (${it.nombre}): ${msg}`);
    }
  });
}

/**
 * Extrae el valor común de duracion_rafaga_es para usar como bloqueoES global
 * Si hay valores diferentes, devuelve el primero y emite warning
 */
export function extractBloqueoESGlobal(items: ProcesoTanda[]): { bloqueoES: number; warning?: string } {
  const valoresES = items
    .map(it => it.duracion_rafaga_es)
    .filter(val => val !== undefined) as number[];
  
  if (valoresES.length === 0) {
    return { bloqueoES: 25 }; // default del sistema
  }
  
  const primerValor = valoresES[0];
  const todosIguales = valoresES.every(val => val === primerValor);
  
  if (!todosIguales) {
    const unicos = [...new Set(valoresES)].sort((a, b) => a - b);
    return {
      bloqueoES: primerValor,
      warning: `Valores diferentes de duracion_rafaga_es encontrados: [${unicos.join(', ')}]. Se usará ${primerValor} como bloqueoES global.`
    };
  }
  
  return { bloqueoES: primerValor };
}