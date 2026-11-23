// Emits a TMG 3.0 "custom" format file from a fine-grained maze graph.
//
// "custom" (not "simple") is used deliberately so that each vertex can
// carry its original (row, col) maze position as a custom field -- this
// is the "companion metadata" the Milestone-0 report called for, folded
// directly into the .tmg rather than a separate file. Unmodified HDX
// ignores fields it doesn't know about and just displays them as extra
// data-table columns.
//
// Coordinates are placed on a tiny grid at the equator (lat/lon both near
// 0) so that degenerate equirectangular/haversine distance approximates
// planar Euclidean distance at this scale -- see MAZE_FORMAT_SPEC notes /
// Milestone-0 report section 5. This is a hypothesis to be confirmed
// against the real HDX/tmlib distance function in Milestone 3, not an
// assumption baked in silently.

const DEFAULT_SPACING_DEGREES = 0.0001; // ~11m at the equator

function vertexLabel(row, col) {
  return `r${row}c${col}`;
}

function emitTmg(graph, { spacing = DEFAULT_SPACING_DEGREES } = {}) {
  const lines = [];
  lines.push(`TMG 3.0 custom`);
  lines.push(`${graph.vertices.length} ${graph.edges.length}`);
  lines.push(`row col`); // vertex custom fields
  lines.push(``); // edge custom fields -- none (no per-edge data to carry)

  for (const v of graph.vertices) {
    const lat = (-v.row * spacing).toFixed(7);
    const lon = (v.col * spacing).toFixed(7);
    lines.push(`${vertexLabel(v.row, v.col)} ${lat} ${lon} ${v.row} ${v.col}`);
  }

  for (const e of graph.edges) {
    lines.push(`${e.v1} ${e.v2} maze`);
  }

  return lines.join('\n') + '\n';
}

// Minimal, independent TMG reader (does NOT reuse HDX's parseTMGContents)
// used only to round-trip-validate our own emitted files in tests.
function readTmg(text) {
  // Only drop the one trailing blank line produced by emitTmg's final '\n'
  // -- NOT every blank line, since a "custom" file with no edge fields has
  // a legitimately blank eFields declaration line in the middle of the file.
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  const header = lines[0].split(' ');
  if (header[0] !== 'TMG') throw new Error('not a TMG file');
  const version = header[1];
  const type = header[2];
  const [numV, numE] = lines[1].split(' ').map(Number);
  let offset = 2;
  let vFields = [];
  let eFields = [];
  if (type === 'custom') {
    vFields = lines[2].split(' ').filter(Boolean);
    eFields = lines[3].split(' ').filter(Boolean);
    offset = 4;
  }
  const vertices = [];
  for (let i = 0; i < numV; i++) {
    const parts = lines[offset + i].split(' ');
    const [label, lat, lon, ...extra] = parts;
    const vertex = { label, lat: Number(lat), lon: Number(lon) };
    vFields.forEach((f, idx) => {
      vertex[f] = extra[idx];
    });
    vertices.push(vertex);
  }
  const edges = [];
  for (let i = 0; i < numE; i++) {
    const parts = lines[offset + numV + i].split(' ');
    const [v1, v2, label, ...extra] = parts;
    const edge = { v1: Number(v1), v2: Number(v2), label };
    eFields.forEach((f, idx) => {
      edge[f] = extra[idx];
    });
    edges.push(edge);
  }
  return { version, type, numV, numE, vFields, eFields, vertices, edges };
}

module.exports = { emitTmg, readTmg, vertexLabel, DEFAULT_SPACING_DEGREES };
