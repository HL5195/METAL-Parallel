/*
 * Description: Plain, from-scratch maze-solving algorithms (BFS, DFS,
 * Dijkstra, A*). Pure functions over a graph adjacency list -- no DOM, no
 * dependency on anything else in this app. Runs inside a Web Worker (see
 * worker.js) so each panel's computation is genuine, separate-thread
 * parallelism, not just concurrent animation.
 *
 * Every algorithm returns the same shape:
 *   { order: [{ vertex, from, cost }, ...], path: [vertex, ...], found: bool }
 * `order` is the sequence of vertices in the order they were FINALIZED
 * (settled), used by the main thread to animate discovery; `path` is the
 * start->end route once found (empty if not found).
 *
 * Referenced METAL: No -- plain from-scratch implementation.
 *
 * Author: Howard Li
 */

// Walks the parent map backwards from end to start to rebuild the actual path.
function reconstructPath(parent, start, end) {
  if (!parent.has(end) && end !== start) return []; // end was never reached
  const path = [end];
  let cur = end;
  while (cur !== start) {
    const p = parent.get(cur);
    if (p === undefined) return [];
    path.push(p);
    cur = p;
  }
  return path.reverse();
}

// Breadth-first search: explores in expanding "rings" one move away at a
// time, so the first time it reaches `end` is guaranteed to be the shortest
// path by number of moves.
function bfs(graph, start, end) {
  const { adjacency } = graph;
  const visited = new Set([start]);
  const parent = new Map();
  const order = [];
  const queue = [start]; // FIFO: process in the order discovered
  let qi = 0;
  while (qi < queue.length) {
    const v = queue[qi++];
    order.push({ vertex: v, from: parent.has(v) ? parent.get(v) : -1, cost: order.length ? order[order.length - 1].cost + 1 : 0 });
    if (v === end) break;
    for (const { to } of adjacency[v]) {
      if (!visited.has(to)) {
        visited.add(to);
        parent.set(to, v);
        queue.push(to);
      }
    }
  }
  const found = visited.has(end);
  return { order, path: found ? reconstructPath(parent, start, end) : [], found };
}

// Depth-first search: dives down one branch as far as it goes before
// backtracking, so it finds *a* path to `end`, not necessarily the shortest.
function dfs(graph, start, end) {
  const { adjacency } = graph;
  const visited = new Set([start]);
  const parent = new Map();
  const order = [];
  const stack = [start]; // LIFO: always process the most recently discovered vertex
  while (stack.length > 0) {
    const v = stack.pop();
    order.push({ vertex: v, from: parent.has(v) ? parent.get(v) : -1, cost: order.length });
    if (v === end) break;
    for (const { to } of adjacency[v]) {
      if (!visited.has(to)) {
        visited.add(to);
        parent.set(to, v);
        stack.push(to);
      }
    }
  }
  const found = visited.has(end);
  return { order, path: found ? reconstructPath(parent, start, end) : [], found };
}

// Dijkstra's algorithm: always settles the closest not-yet-settled vertex
// next, which guarantees shortest total weighted cost. Simple O(V^2)
// linear-scan version -- plenty fast for maze-sized graphs, and easy to
// read; a binary heap would speed this up but isn't needed here.
function dijkstra(graph, start, end) {
  const { adjacency } = graph;
  const dist = new Map([[start, 0]]);
  const parent = new Map();
  const settled = new Set();
  const order = [];

  while (true) {
    // pick the unsettled vertex with the smallest known distance
    let u = null;
    let best = Infinity;
    for (const [v, d] of dist) {
      if (!settled.has(v) && d < best) { best = d; u = v; }
    }
    if (u === null) break; // nothing left reachable
    settled.add(u);
    order.push({ vertex: u, from: parent.has(u) ? parent.get(u) : -1, cost: best });
    if (u === end) break;
    for (const { to, weight } of adjacency[u]) {
      const nd = best + weight;
      if (!dist.has(to) || nd < dist.get(to)) {
        dist.set(to, nd); // found a cheaper way to reach `to`
        parent.set(to, u);
      }
    }
  }

  const found = settled.has(end);
  return { order, path: found ? reconstructPath(parent, start, end) : [], found };
}

// A*: same structure as Dijkstra, but priority = cost-so-far + heuristic
// instead of cost-so-far alone, so it favors vertices that also look close
// to the goal. Heuristic = straight-line (Euclidean) distance in grid
// units, which is admissible here (cardinal moves cost 1): it never
// overestimates the true remaining cost, so the result is still optimal.
function astar(graph, start, end) {
  const { adjacency, vertexRowCol } = graph;
  const endRC = vertexRowCol(end);
  const h = (v) => {
    const rc = vertexRowCol(v);
    return Math.hypot(rc.row - endRC.row, rc.col - endRC.col);
  };

  const gScore = new Map([[start, 0]]); // cost-so-far from start
  const parent = new Map();
  const settled = new Set();
  const order = [];

  while (true) {
    // pick the unsettled vertex with the smallest f = g + h
    let u = null;
    let bestF = Infinity;
    for (const [v, g] of gScore) {
      if (settled.has(v)) continue;
      const f = g + h(v);
      if (f < bestF) { bestF = f; u = v; }
    }
    if (u === null) break;
    settled.add(u);
    order.push({ vertex: u, from: parent.has(u) ? parent.get(u) : -1, cost: gScore.get(u) });
    if (u === end) break;
    for (const { to, weight } of adjacency[u]) {
      const ng = gScore.get(u) + weight;
      if (!gScore.has(to) || ng < gScore.get(to)) {
        gScore.set(to, ng); // found a cheaper way to reach `to`
        parent.set(to, u);
      }
    }
  }

  const found = settled.has(end);
  return { order, path: found ? reconstructPath(parent, start, end) : [], found };
}

// Looked up by name in worker.js so the Worker can dispatch on the
// `algorithm` string it receives from the main thread.
const ALGORITHMS = { bfs, dfs, dijkstra, astar };
