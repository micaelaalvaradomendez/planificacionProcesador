// Comparadores con orden estable. Ajustado a la estructura real del proyecto.
export function sortGanttSlices(a: any, b: any) {
  return (a.start - b.start) || (a.end - b.end) || (a.pid - b.pid) || String(a.type || '').localeCompare(String(b.type || ''));
}

export function normalizeGantt(g: any) {
  const tracks = g?.tracks?.map((track: any) => ({
    ...track,
    segments: [...(track.segments ?? [])].sort(sortGanttSlices)
  })) ?? [];
  
  return { ...g, tracks };
}

export function normalizeTrace(t: any) {
  const events = [...(t?.events ?? [])].sort((x, y) => 
    (x.t - y.t) || (x.type.localeCompare(y.type)) || ((x.pid ?? 0) - (y.pid ?? 0))
  );
  
  const slices = [...(t?.slices ?? [])].sort((x, y) => 
    (x.start - y.start) || (x.end - y.end) || ((x.pid ?? 0) - (y.pid ?? 0))
  );
  
  const overheads = [...(t?.overheads ?? [])].sort((x, y) => 
    (x.t0 - y.t0) || (x.t1 - y.t1) || (x.pid - y.pid) || x.kind.localeCompare(y.kind)
  );
  
  return { ...t, events, slices, overheads };
}