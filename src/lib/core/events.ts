/**
 * ARCHIVO DEPRECATED - NO USAR
 * 
 * Las funciones de exportación se han movido a infrastructure/io/
 * 
 * ⚠️  NO IMPLEMENTAR EXPORTACIONES AQUÍ
 * ✅  USAR: infrastructure/io/exportEvents.ts
 * ✅  USAR: infrastructure/io/exportMetrics.ts
 * ✅  USAR: infrastructure/io/ganttExporter.ts
 */

import type { SimEvent } from '../domain/types';

/**
 * @deprecated USAR infrastructure/io/exportEvents.ts en su lugar
 */
export function exportarEventosComoCSV(): never {
  throw new Error('DEPRECATED: Usar infrastructure/io/exportEvents.ts en su lugar');
}

/**
 * @deprecated USAR infrastructure/io/exportMetrics.ts en su lugar
 */
export function exportarMetricasCSV(): never {
  throw new Error('DEPRECATED: Usar infrastructure/io/exportMetrics.ts en su lugar');
}

/**
 * @deprecated USAR infrastructure/io/ganttExporter.ts en su lugar
 */
export function exportarGantt(): never {
  throw new Error('DEPRECATED: Usar infrastructure/io/ganttExporter.ts en su lugar');
}

// Re-export tipos del dominio para compatibilidad
export type { SimEvent } from '../domain/types';
