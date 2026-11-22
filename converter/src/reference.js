// Independent reference solver used ONLY to cross-check the converter's
// output (Milestone-2 requirement: "verify output against a separately
// checked expected answer"). Deliberately does NOT import graph.js or
// reuse its adjacency logic -- it re-derives neighbors straight from the
// maze's wall data with its own code, so a shared bug in graph.js can't
// hide behind a test that uses the same logic to check itself.

const SQRT2 = Math.SQRT2;

// Re-derives the legal moves out of (row,col), independently of graph.js.
function neighborsOf(maze, row, col, { allowDiagonal = true } = {}) {
  const out = [];
  const { rows, cols } = maze;

  const open = {
    right: col + 1 < cols && maze.isOpenH(row, col),
    left: col - 1 >= 0 && maze.isOpenH(row, col - 1),
    down: row + 1 < rows && maze.isOpenV(row, col),
    up: row - 1 >= 0 && maze.isOpenV(row - 1, col),
  };

  if (open.right) out.push({ row, col: col + 1, weight: 1 });
  if (open.left) out.push({ row, col: col - 1, weight: 1 });
  if (open.down) out.push({ row: row + 1, col, weight: 1 });
  if (open.up) out.push({ row: row - 1, col, weight: 1 });

  if (!allowDiagonal) return out;

  // Diagonal rule (must match graph.js's rule exactly, since both are meant
  // to implement the same Milestone-1 spec -- only the code is independent):
  // a diagonal move out of the cell being visited is legal only when BOTH of
  // that cell's own orthogonal walls toward the two shared-corner cells are
  // open. E.g. for down-right, the shared-corner cells are the right
  // neighbor and the down neighbor, so both open.right and open.down must
  // hold -- not any wall measured from the far side of the diagonal.
  if (open.right && open.down) {
    out.push({ row: row + 1, col: col + 1, weight: SQRT2 }); // down-right
  }
  if (open.left && open.down) {
    out.push({ row: row + 1, col: col - 1, weight: SQRT2 }); // down-left
  }
  if (open.right && open.up) {
    out.push({ row: row - 1, col: col + 1, weight: SQRT2 }); // up-right
  }
  if (open.left && open.up) {
    out.push({ row: row - 1, col: col - 1, weight: SQRT2 }); // up-left
  }

  return out;
}

// Dijkstra from start to end (or BFS-equivalent if all weights are 1,
// but we always run weighted Dijkstra here since diagonals may be present).
// Returns { reachable, cost, path: [{row,col}, ...] } with path from start to end inclusive.
function shortestPath(maze, start, end, { allowDiagonal = true } = {}) {
  const { rows, cols } = maze;
  const key = (r, c) => r * cols + c;
  const dist = new Map();
  const prev = new Map();
  const visited = new Set();
  dist.set(key(start.row, start.col), 0);

  // simple O(V^2) Dijkstra -- fine for PoC-sized mazes, and deliberately
  // not the same implementation style as any METAL/HDX code.
  while (true) {
    let bestKey = null;
    let bestDist = Infinity;
    for (const [k, d] of dist.entries()) {
      if (!visited.has(k) && d < bestDist) {
        bestDist = d;
        bestKey = k;
      }
    }
    if (bestKey === null) break;
    visited.add(bestKey);
    const row = Math.floor(bestKey / cols);
    const col = bestKey % cols;
    if (row === end.row && col === end.col) break;

    for (const n of neighborsOf(maze, row, col, { allowDiagonal })) {
      const nk = key(n.row, n.col);
      const nd = bestDist + n.weight;
      if (!dist.has(nk) || nd < dist.get(nk)) {
        dist.set(nk, nd);
        prev.set(nk, bestKey);
      }
    }
  }

  const endKey = key(end.row, end.col);
  if (!dist.has(endKey)) {
    return { reachable: false, cost: Infinity, path: [] };
  }

  const path = [];
  let cur = endKey;
  while (cur !== undefined) {
    path.unshift({ row: Math.floor(cur / cols), col: cur % cols });
    if (cur === key(start.row, start.col)) break;
    cur = prev.get(cur);
  }

  return { reachable: true, cost: dist.get(endKey), path };
}

// Finds all cells reachable from `start` (for disconnected-component tests).
function reachableSet(maze, start, { allowDiagonal = true } = {}) {
  const { cols } = maze;
  const key = (r, c) => r * cols + c;
  const seen = new Set([key(start.row, start.col)]);
  const stack = [start];
  while (stack.length > 0) {
    const { row, col } = stack.pop();
    for (const n of neighborsOf(maze, row, col, { allowDiagonal })) {
      const nk = key(n.row, n.col);
      if (!seen.has(nk)) {
        seen.add(nk);
        stack.push(n);
      }
    }
  }
  return seen;
}

module.exports = { neighborsOf, shortestPath, reachableSet };
