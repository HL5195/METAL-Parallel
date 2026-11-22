// Test-only helper to build maze .txt text programmatically from a wall
// spec, instead of hand-typing (2R+1)x(2C+1) character grids (error-prone).
// This is test scaffolding, not part of the converter itself.

function buildMazeText(rows, cols, { hOpen = new Set(), vOpen = new Set(), start, end, wallChar = '#', openChar = '/' } = {}) {
  const gridRows = 2 * rows + 1;
  const gridCols = 2 * cols + 1;
  const grid = Array.from({ length: gridRows }, () => new Array(gridCols).fill(wallChar));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      grid[2 * row + 1][2 * col + 1] = openChar;
    }
  }
  if (start) grid[2 * start.row + 1][2 * start.col + 1] = 'S';
  if (end) grid[2 * end.row + 1][2 * end.col + 1] = 'E';

  for (const key of hOpen) {
    const [row, c] = key.split(',').map(Number);
    grid[2 * row + 1][2 * c + 2] = openChar;
  }
  for (const key of vOpen) {
    const [row, col] = key.split(',').map(Number);
    grid[2 * row + 2][2 * col + 1] = openChar;
  }

  return grid.map((r) => r.join('')).join('\n') + '\n';
}

// Independent Dijkstra over a converter-produced graph object (graph.js
// output), used ONLY in tests to cross-check against src/reference.js's
// separately-derived answer. Deliberately duplicated rather than imported
// from reference.js.
function dijkstraOverGraph(graph, startRow, startCol, endRow, endCol) {
  const startV = graph.vertexIndexOf(startRow, startCol);
  const endV = graph.vertexIndexOf(endRow, endCol);
  const adj = new Map();
  for (const e of graph.edges) {
    if (!adj.has(e.v1)) adj.set(e.v1, []);
    if (!adj.has(e.v2)) adj.set(e.v2, []);
    adj.get(e.v1).push({ to: e.v2, weight: e.weight });
    adj.get(e.v2).push({ to: e.v1, weight: e.weight }); // undirected
  }
  const dist = new Map([[startV, 0]]);
  const visited = new Set();
  while (true) {
    let bestV = null;
    let bestD = Infinity;
    for (const [v, d] of dist.entries()) {
      if (!visited.has(v) && d < bestD) {
        bestD = d;
        bestV = v;
      }
    }
    if (bestV === null) break;
    visited.add(bestV);
    if (bestV === endV) break;
    for (const { to, weight } of adj.get(bestV) || []) {
      const nd = bestD + weight;
      if (!dist.has(to) || nd < dist.get(to)) dist.set(to, nd);
    }
  }
  return dist.has(endV) ? dist.get(endV) : Infinity;
}

module.exports = { buildMazeText, dijkstraOverGraph };
