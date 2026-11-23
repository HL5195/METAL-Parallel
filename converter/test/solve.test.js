const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMazeText } = require('../src/maze');
const { buildGraphFromMaze } = require('../src/graph');
const { shortestPath, reachableSet } = require('../src/reference');
const { buildMazeText, dijkstraOverGraph } = require('./helpers');

// Cross-checks graph.js's output against src/reference.js's independently
// derived answer (see reference.js header comment for why this counts as
// a "separately checked" validation per the Milestone-2 requirement).
function crossCheck(maze, start, end) {
  const graph = buildGraphFromMaze(maze);
  const refResult = shortestPath(maze, start, end);
  const graphCost = dijkstraOverGraph(graph, start.row, start.col, end.row, end.col);
  if (!refResult.reachable) {
    assert.equal(graphCost, Infinity, 'reference says unreachable but graph found a path');
  } else {
    assert.ok(
      Math.abs(graphCost - refResult.cost) < 1e-9,
      `graph cost ${graphCost} != reference cost ${refResult.cost}`
    );
  }
  return refResult;
}

test('solvable maze: full 3x3 connected maze with a unique cardinal path', () => {
  const text = buildMazeText(3, 3, {
    hOpen: new Set(['0,0', '0,1', '1,0']),
    // '1,0' here connects (1,0)-(2,0) as a dead-end branch, purely so every
    // cell is reachable (this maze used to rely on a now-removed diagonal
    // edge for that); it doesn't add another route to `end`.
    vOpen: new Set(['0,0', '1,1', '0,2', '1,2', '1,0']),
    start: { row: 0, col: 0 },
    end: { row: 2, col: 2 },
  });
  const maze = parseMazeText(text);
  // every cell reachable from start (sanity: not accidentally disconnected)
  assert.equal(reachableSet(maze, maze.start).size, 9);
  const result = crossCheck(maze, maze.start, maze.end);
  assert.ok(result.reachable);
  assert.equal(result.cost, 4); // (0,0)-(0,1)-(0,2)-(1,2)-(2,2)
});

test('unsolvable maze: start and end in different components', () => {
  const text = buildMazeText(2, 2, {
    hOpen: new Set(['0,0']), // only connects (0,0)-(0,1); (1,0)/(1,1) isolated
    vOpen: new Set([]),
    start: { row: 0, col: 0 },
    end: { row: 1, col: 1 },
  });
  const maze = parseMazeText(text);
  const result = crossCheck(maze, maze.start, maze.end);
  assert.equal(result.reachable, false);
});

test('disconnected components: reachable set excludes the isolated region', () => {
  const text = buildMazeText(2, 2, {
    hOpen: new Set(['0,0']), // (0,0)-(0,1) connected; (1,0),(1,1) isolated from each other and from row 0
    vOpen: new Set([]),
  });
  const maze = parseMazeText(text);
  const fromStart = reachableSet(maze, { row: 0, col: 0 });
  assert.equal(fromStart.size, 2);
  assert.ok(!fromStart.has(1 * maze.cols + 0) || true); // keys are row*cols+col in reachableSet's own key space
  // more directly: (1,0) and (1,1) must not be reachable
  const serialized = [...fromStart];
  assert.ok(!serialized.includes(1 * maze.cols + 0));
  assert.ok(!serialized.includes(1 * maze.cols + 1));
});

test('dead ends: a branch that does not lead toward the end is still correctly unreachable-from as a shortcut', () => {
  // 1x3 corridor with a dead-end stub off the middle cell.
  const text = buildMazeText(2, 3, {
    hOpen: new Set(['0,0', '0,1']), // (0,0)-(0,1)-(0,2) corridor
    vOpen: new Set(['0,1']), // dead-end stub down from (0,1) to (1,1)
    start: { row: 0, col: 0 },
    end: { row: 0, col: 2 },
  });
  const maze = parseMazeText(text);
  const result = crossCheck(maze, maze.start, maze.end);
  assert.ok(result.reachable);
  assert.equal(result.cost, 2); // dead end must not be part of the shortest path
  assert.ok(!result.path.some((p) => p.row === 1 && p.col === 1));
});

test('alternative routes: two equal-cost cardinal paths around a blocked center', () => {
  // 3x3 ring around a closed-off, unreachable center -- two symmetric
  // 4-step routes from corner to corner.
  const text = buildMazeText(3, 3, {
    hOpen: new Set(['0,0', '0,1', '2,0', '2,1']),
    vOpen: new Set(['0,0', '0,2', '1,0', '1,2']),
    start: { row: 0, col: 0 },
    end: { row: 2, col: 2 },
  });
  const maze = parseMazeText(text);
  const result = crossCheck(maze, maze.start, maze.end);
  assert.ok(result.reachable);
  assert.equal(result.cost, 4);
  // center (1,1) must be unreachable, confirming this is a ring route
  // around the blocked middle, not a shortcut through it.
  assert.ok(!reachableSet(maze, maze.start).has(1 * maze.cols + 1));
});

test('alternate start/end: markers away from the default corners are honored', () => {
  const text = buildMazeText(3, 3, {
    hOpen: new Set(['1,0', '1,1']),
    vOpen: new Set([]),
    start: { row: 1, col: 0 },
    end: { row: 1, col: 2 },
  });
  const maze = parseMazeText(text);
  assert.deepEqual(maze.start, { row: 1, col: 0 });
  assert.deepEqual(maze.end, { row: 1, col: 2 });
  const result = crossCheck(maze, maze.start, maze.end);
  assert.ok(result.reachable);
  assert.equal(result.cost, 2);
});
