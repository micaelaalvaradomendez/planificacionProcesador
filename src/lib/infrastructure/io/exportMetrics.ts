import type { Metrics } from '../../domain/types';

export function exportarMetricasJson(m: Metrics): Blob {
  return new Blob([JSON.stringify(m, null, 2)], { type: 'application/json' });
}

export function conPorcentajes(m: Metrics): Metrics {
  const total = m.tanda.cpuOcioso + m.tanda.cpuSO + m.tanda.cpuProcesos || 0;
  const pct = (x: number) => (total > 0 ? +(100 * x / total).toFixed(2) : 0);
  return {
    ...m,
    tanda: {
      ...m.tanda,
      porcentajeCpuOcioso: pct(m.tanda.cpuOcioso),
      porcentajeCpuSO: pct(m.tanda.cpuSO),
      porcentajeCpuProcesos: pct(m.tanda.cpuProcesos)
    }
  };
}

/**
 * Exporta métricas en formato CSV
 */
export function exportarMetricasCSV(metrics: Metrics, separador: string = ';'): string {
  const metricas = conPorcentajes(metrics);
  
  let csv = '';
  
  // Encabezado
  csv += '=== MÉTRICAS DE LA TANDA ===\n';
  csv += `Concepto${separador}Valor${separador}Unidad\n`;
  
  // Métricas de la tanda
  csv += `Tiempo Retorno Tanda${separador}${metricas.tanda.tiempoRetornoTanda}${separador}unidades\n`;
  csv += `Tiempo Medio Retorno${separador}${metricas.tanda.tiempoMedioRetorno}${separador}unidades\n`;
  csv += `CPU Procesos${separador}${metricas.tanda.cpuProcesos}${separador}unidades\n`;
  csv += `CPU Sistema Operativo${separador}${metricas.tanda.cpuSO}${separador}unidades\n`;
  csv += `CPU Ocioso${separador}${metricas.tanda.cpuOcioso}${separador}unidades\n`;
  csv += `% CPU Procesos${separador}${metricas.tanda.porcentajeCpuProcesos || 0}${separador}%\n`;
  csv += `% CPU Sistema${separador}${metricas.tanda.porcentajeCpuSO || 0}${separador}%\n`;
  csv += `% CPU Ocioso${separador}${metricas.tanda.porcentajeCpuOcioso || 0}${separador}%\n`;
  
  // Métricas por proceso
  csv += '\n=== MÉTRICAS POR PROCESO ===\n';
  csv += `Proceso${separador}T.Retorno${separador}T.Retorno Norm.${separador}T.En Listo\n`;
  
  for (const proceso of metricas.porProceso) {
    csv += `${proceso.name}${separador}`;
    csv += `${proceso.tiempoRetorno}${separador}`;
    csv += `${proceso.tiempoRetornoNormalizado}${separador}`;
    csv += `${proceso.tiempoEnListo}\n`;
  }
  
  return csv;
}
