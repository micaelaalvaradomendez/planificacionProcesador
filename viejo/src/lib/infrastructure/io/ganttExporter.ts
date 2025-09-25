/**
 * Exportador de Diagramas de Gantt para Infrastructure/IO
 * 
 * Genera exportaciones del diagrama de Gantt en múltiples formatos:
 * - JSON de tramos (estructura detallada)
 * - SVG (imagen vectorial)
 * - ASCII (representación textual)
 * - Datos para gráficas externas
 */

import type { GanttSlice } from '../../domain/types';

/**
 * Estructura simplificada para construcción de Gantt desde eventos
 */
export interface DiagramaGantt {
  segmentos: GanttSlice[];
  tiempoTotal: number;
  procesos: string[];
  estadisticas: {
    utilizacionCPU: number;
    tiempoOcioso: number;
    tiempoSO: number;
    distribucionTiempos: Record<string, number>;
  };
  validacion?: {
    sinSolapes: boolean;
    errores: string[];
    advertencias: string[];
  };
}

/**
 * Estructura de un tramo del diagrama de Gantt para exportación
 */
export interface TramoGantt {
  id: string;
  proceso: string;
  tiempoInicio: number;
  tiempoFin: number;
  duracion: number;
  tipo: 'CPU' | 'ES' | 'TIP' | 'TFP' | 'TCP' | 'OCIOSO';
  descripcion: string;
  color?: string;
  nivel?: number; // Para visualización multi-nivel
}

/**
 * Formato JSON completo del diagrama de Gantt
 */
export interface GanttJSON {
  metadata: {
    titulo: string;
    algoritmo: string;
    tiempoTotal: number;
    fechaGeneracion: string;
    version: string;
    procesos: string[];
  };
  tramos: TramoGantt[];
  estadisticas: {
    utilizacionCPU: number;
    tiempoOcioso: number;
    tiempoSistemaOperativo: number;
    distribucionPorTipo: Record<string, number>;
    distribucionPorProceso: Record<string, number>;
  };
  timeline: {
    marcas: number[];
    unidadTiempo: string;
    escala: number;
  };
  validacion: {
    sinSolapes: boolean;
    continuidadTemporal: boolean;
    errores: string[];
    advertencias: string[];
  };
}

/**
 * Paleta de colores para diferentes tipos de actividad
 */
const COLORES_GANTT = {
  'CPU': '#FF6B6B',      // Rojo - Ejecución en CPU
  'ES': '#4ECDC4',       // Turquesa - Entrada/Salida
  'TIP': '#45B7D1',      // Azul - Tiempo Incorporación Proceso
  'TFP': '#96CEB4',      // Verde - Tiempo Finalización Proceso
  'TCP': '#FECA57',      // Amarillo - Tiempo Cambio Proceso
  'OCIOSO': '#DDD6FE'    // Lila claro - CPU ociosa
} as const;

/**
 * Exporta el diagrama de Gantt como JSON estructurado de tramos
 */
export function exportarGanttComoJSON(
  diagrama: DiagramaGantt,
  algoritmo: string = 'Desconocido',
  titulo: string = 'Diagrama de Gantt'
): GanttJSON {
  
  console.log(`📊 Exportando Gantt como JSON: ${diagrama.segmentos.length} segmentos`);

  // Generar tramos con identificadores únicos
  const tramos: TramoGantt[] = diagrama.segmentos.map((segmento, index) => ({
    id: `tramo_${index + 1}`,
    proceso: segmento.process,
    tiempoInicio: segmento.tStart,
    tiempoFin: segmento.tEnd,
    duracion: segmento.tEnd - segmento.tStart,
    tipo: segmento.kind,
    descripcion: generarDescripcionTramo(segmento),
    color: COLORES_GANTT[segmento.kind] || '#CCCCCC',
    nivel: calcularNivelVisualizacion(segmento.process, diagrama.procesos)
  }));

  // Calcular marcas de timeline
  const marcas = generarMarcasTiempo(diagrama.tiempoTotal);

  // Calcular distribución por proceso
  const distribucionPorProceso = calcularDistribucionPorProceso(tramos);

  const ganttJSON: GanttJSON = {
    metadata: {
      titulo,
      algoritmo,
      tiempoTotal: diagrama.tiempoTotal,
      fechaGeneracion: new Date().toISOString(),
      version: '1.0',
      procesos: [...diagrama.procesos].sort()
    },
    tramos,
    estadisticas: {
      utilizacionCPU: diagrama.estadisticas.utilizacionCPU,
      tiempoOcioso: diagrama.estadisticas.tiempoOcioso,
      tiempoSistemaOperativo: diagrama.estadisticas.tiempoSO,
      distribucionPorTipo: diagrama.estadisticas.distribucionTiempos,
      distribucionPorProceso
    },
    timeline: {
      marcas,
      unidadTiempo: 'unidades',
      escala: Math.max(1, Math.floor(diagrama.tiempoTotal / 20))
    },
    validacion: {
      sinSolapes: diagrama.validacion?.sinSolapes ?? true,
      continuidadTemporal: (diagrama.validacion?.errores?.length ?? 0) === 0,
      errores: diagrama.validacion?.errores ?? [],
      advertencias: diagrama.validacion?.advertencias ?? []
    }
  };

  console.log(`  JSON generado: ${tramos.length} tramos, ${marcas.length} marcas de tiempo`);
  return ganttJSON;
}

/**
 * Exporta el diagrama de Gantt como imagen SVG
 */
export function exportarGanttComoSVG(
  diagrama: DiagramaGantt,
  opciones: {
    ancho?: number;
    alto?: number;
    algoritmo?: string;
    titulo?: string;
    mostrarEtiquetas?: boolean;
  } = {}
): string {
  
  const {
    ancho = 800,
    alto = 400,
    algoritmo = 'Planificador',
    titulo = 'Diagrama de Gantt',
    mostrarEtiquetas = true
  } = opciones;

  console.log(`🎨 Generando SVG: ${ancho}x${alto} para ${diagrama.segmentos.length} segmentos`);

  const margenIzquierdo = 120;
  const margenSuperior = 60;
  const margenInferior = 80;
  const altoTramo = 40;
  const espacioEntreTramos = 10;

  const anchoUtil = ancho - margenIzquierdo - 40;
  const escalaX = anchoUtil / diagrama.tiempoTotal;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${ancho}" height="${alto}" xmlns="http://www.w3.org/2000/svg">
  <!-- Estilos -->
  <style>
    .titulo { font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; }
    .subtitulo { font-family: Arial, sans-serif; font-size: 12px; fill: #666; }
    .etiqueta-proceso { font-family: Arial, sans-serif; font-size: 11px; }
    .etiqueta-tiempo { font-family: Arial, sans-serif; font-size: 10px; fill: #333; }
    .linea-grid { stroke: #E0E0E0; stroke-width: 1; }
    .tramo { stroke: #333; stroke-width: 1; rx: 2; }
    .texto-tramo { font-family: Arial, sans-serif; font-size: 9px; fill: #000; }
  </style>

  <!-- Fondo -->
  <rect width="${ancho}" height="${alto}" fill="#FAFAFA"/>

  <!-- Título -->
  <text x="${ancho/2}" y="25" text-anchor="middle" class="titulo">${titulo}</text>
  <text x="${ancho/2}" y="45" text-anchor="middle" class="subtitulo">Algoritmo: ${algoritmo} | Tiempo Total: ${diagrama.tiempoTotal} unidades</text>
`;

  // Líneas de grid vertical (tiempo)
  for (let t = 0; t <= diagrama.tiempoTotal; t += Math.max(1, Math.floor(diagrama.tiempoTotal / 20))) {
    const x = margenIzquierdo + (t * escalaX);
    svg += `  <line x1="${x}" y1="${margenSuperior}" x2="${x}" y2="${alto - margenInferior}" class="linea-grid"/>\n`;
    svg += `  <text x="${x}" y="${alto - margenInferior + 15}" text-anchor="middle" class="etiqueta-tiempo">${t}</text>\n`;
  }

  // Etiquetas de procesos y tramos
  const procesosPosiciones = new Map<string, number>();
  let yActual = margenSuperior + 20;

  for (const proceso of diagrama.procesos) {
    procesosPosiciones.set(proceso, yActual);
    
    // Etiqueta del proceso
    svg += `  <text x="${margenIzquierdo - 10}" y="${yActual + altoTramo/2 + 4}" text-anchor="end" class="etiqueta-proceso">${proceso}</text>\n`;
    
    yActual += altoTramo + espacioEntreTramos;
  }

  // Dibujar tramos
  for (const segmento of diagrama.segmentos) {
    const x = margenIzquierdo + (segmento.tStart * escalaX);
    const anchoSegmento = (segmento.tEnd - segmento.tStart) * escalaX;
    const y = procesosPosiciones.get(segmento.process) || yActual;
    
    const color = COLORES_GANTT[segmento.kind] || '#CCCCCC';
    
    // Rectángulo del tramo
    svg += `  <rect x="${x}" y="${y}" width="${anchoSegmento}" height="${altoTramo}" fill="${color}" class="tramo"/>\n`;
    
    // Etiqueta del tramo (si hay espacio)
    if (mostrarEtiquetas && anchoSegmento > 30) {
      const textoX = x + anchoSegmento/2;
      const textoY = y + altoTramo/2 + 3;
      const etiqueta = segmento.kind === 'CPU' ? segmento.process : segmento.kind;
      svg += `  <text x="${textoX}" y="${textoY}" text-anchor="middle" class="texto-tramo">${etiqueta}</text>\n`;
    }
  }

  // Leyenda de colores
  let leyendaY = alto - 60;
  const tiposUsados = Array.from(new Set(diagrama.segmentos.map(s => s.kind))).sort();
  
  svg += `  <text x="20" y="${leyendaY - 15}" class="subtitulo">Leyenda:</text>\n`;
  
  tiposUsados.forEach((tipo, index) => {
    const x = 20 + (index * 100);
    if (x < ancho - 80) {
      svg += `  <rect x="${x}" y="${leyendaY}" width="15" height="15" fill="${COLORES_GANTT[tipo] || '#CCC'}"/>\n`;
      svg += `  <text x="${x + 20}" y="${leyendaY + 12}" class="subtitulo">${tipo}</text>\n`;
    }
  });

  svg += `</svg>`;

  console.log(`  SVG generado: ${svg.length} caracteres`);
  return svg;
}

/**
 * Exporta el diagrama de Gantt como representación ASCII
 */
export function exportarGanttComoASCII(
  diagrama: DiagramaGantt,
  opciones: {
    ancho?: number;
    algoritmo?: string;
    mostrarLeyenda?: boolean;
  } = {}
): string {
  
  const { ancho = 80, algoritmo = 'Planificador', mostrarLeyenda = true } = opciones;
  
  console.log(`📝 Generando ASCII Gantt: ancho ${ancho}`);

  const caracteres = {
    'CPU': '█',
    'ES': '▓',
    'TIP': '░',
    'TFP': '▒',
    'TCP': '▢',
    'OCIOSO': '·'
  };

  let ascii = `\n┌${'─'.repeat(ancho)}┐\n`;
  ascii += `│${' '.repeat(Math.floor((ancho - algoritmo.length) / 2))}${algoritmo}${' '.repeat(ancho - Math.floor((ancho - algoritmo.length) / 2) - algoritmo.length)}│\n`;
  ascii += `├${'─'.repeat(ancho)}┤\n`;

  const escala = diagrama.tiempoTotal / (ancho - 20);
  
  for (const proceso of diagrama.procesos) {
    const linea = Array(ancho - 10).fill(' ');
    
    // Marcar segmentos de este proceso
    for (const segmento of diagrama.segmentos) {
      if (segmento.process === proceso) {
        const inicio = Math.floor(segmento.tStart / escala);
        const fin = Math.floor(segmento.tEnd / escala);
        const caracter = caracteres[segmento.kind] || '?';
        
        for (let i = inicio; i < fin && i < linea.length; i++) {
          linea[i] = caracter;
        }
      }
    }
    
    ascii += `│${proceso.padEnd(8)}│${linea.join('')}│\n`;
  }

  ascii += `└${'─'.repeat(ancho)}┘\n`;

  // Escala de tiempo
  ascii += `   Tiempo: 0${' '.repeat(ancho - 20)}${diagrama.tiempoTotal}\n`;

  // Leyenda
  if (mostrarLeyenda) {
    ascii += `\nLeyenda:\n`;
    Object.entries(caracteres).forEach(([tipo, char]) => {
      ascii += `  ${char} = ${tipo}\n`;
    });
  }

  console.log(`  ASCII generado: ${ascii.split('\n').length} líneas`);
  return ascii;
}

/**
 * Descarga el diagrama de Gantt como archivo JSON
 */
export function descargarGanttJSON(
  diagrama: DiagramaGantt,
  nombreArchivo: string,
  algoritmo: string = 'Planificador'
): void {
  const ganttJSON = exportarGanttComoJSON(diagrama, algoritmo);
  const json = JSON.stringify(ganttJSON, null, 2);
  
  import('./fileDownloader').then(({ descargarTexto }) => {
    descargarTexto(json, `${nombreArchivo}-gantt.json`, 'application/json;charset=utf-8');
  });
}

/**
 * Descarga el diagrama de Gantt como archivo SVG
 */
export function descargarGanttSVG(
  diagrama: DiagramaGantt,
  nombreArchivo: string,
  algoritmo: string = 'Planificador'
): void {
  const svg = exportarGanttComoSVG(diagrama, { algoritmo });
  
  import('./fileDownloader').then(({ descargarTexto }) => {
    descargarTexto(svg, `${nombreArchivo}-gantt.svg`, 'image/svg+xml;charset=utf-8');
  });
}

/**
 * Descarga el diagrama de Gantt como archivo de texto ASCII
 */
export function descargarGanttASCII(
  diagrama: DiagramaGantt,
  nombreArchivo: string,
  algoritmo: string = 'Planificador'
): void {
  const ascii = exportarGanttComoASCII(diagrama, { algoritmo });
  
  import('./fileDownloader').then(({ descargarTexto }) => {
    descargarTexto(ascii, `${nombreArchivo}-gantt.txt`, 'text/plain;charset=utf-8');
  });
}

/**
 * Funciones de exportación simplificadas para uso directo
 */
export function exportarGanttSVG(gantt: any): string {
  return exportarGanttComoSVG(gantt);
}

export function exportarGanttASCII(gantt: any): string {
  return exportarGanttComoASCII(gantt);
}

// FUNCIONES AUXILIARES

function generarDescripcionTramo(segmento: GanttSlice): string {
  switch (segmento.kind) {
    case 'CPU': return `${segmento.process} ejecutando en CPU`;
    case 'ES': return `${segmento.process} realizando E/S`;
    case 'TIP': return `${segmento.process} siendo incorporado al sistema`;
    case 'TFP': return `${segmento.process} en proceso de terminación`;
    case 'TCP': return `Cambio de contexto para ${segmento.process}`;
    case 'OCIOSO': return 'CPU ociosa';
    default: return `${segmento.process} - ${segmento.kind}`;
  }
}

function calcularNivelVisualizacion(proceso: string, procesos: string[]): number {
  const indice = procesos.indexOf(proceso);
  return indice >= 0 ? indice : procesos.length;
}

function generarMarcasTiempo(tiempoTotal: number): number[] {
  const marcas: number[] = [];
  const paso = Math.max(1, Math.ceil(tiempoTotal / 20));
  
  for (let t = 0; t <= tiempoTotal; t += paso) {
    marcas.push(t);
  }
  
  // Asegurar que el tiempo final esté incluido
  if (marcas[marcas.length - 1] !== tiempoTotal) {
    marcas.push(tiempoTotal);
  }
  
  return marcas;
}

function calcularDistribucionPorProceso(tramos: TramoGantt[]): Record<string, number> {
  const distribucion: Record<string, number> = {};
  
  for (const tramo of tramos) {
    if (tramo.tipo === 'CPU') { // Solo contar tiempo de CPU
      distribucion[tramo.proceso] = (distribucion[tramo.proceso] || 0) + tramo.duracion;
    }
  }
  
  return distribucion;
}
