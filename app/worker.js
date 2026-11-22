/*
 * Description: Web Worker entry point. Runs exactly one algorithm instance
 * on its own OS thread, genuinely in parallel with every other panel's
 * worker (not just concurrent in the main thread's event loop). Pure
 * computation only -- no DOM access (Workers can't touch it anyway).
 *
 * Referenced METAL: No -- plain from-scratch implementation.
 *
 * Author: Howard Li
 */

importScripts('algorithms.js'); // loads ALGORITHMS into this worker's own scope

// Handles one solve request from the main thread and posts back the result.
self.onmessage = (event) => {
  const { id, graph, start, end, algorithm } = event.data;
  const fn = ALGORITHMS[algorithm];
  if (!fn) {
    self.postMessage({ id, error: `unknown algorithm: ${algorithm}` });
    return;
  }
  // `graph` crossed postMessage's structured-clone boundary, which drops
  // functions -- vertexRowCol (needed by astar's heuristic) has to be
  // rebuilt here rather than reused from the main thread's copy.
  graph.vertexRowCol = (v) => ({ row: Math.floor(v / graph.cols), col: v % graph.cols });
  const t0 = performance.now();
  const result = fn(graph, start, end); // runs to completion, not step-by-step
  const elapsedMs = performance.now() - t0;
  self.postMessage({ id, ...result, elapsedMs });
};
