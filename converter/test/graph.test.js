const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMazeText } = require('../src/maze');
const { buildGraphFromMaze } = require('../src/graph');
const { buildMazeText } = require('./helpers');

function findEdge(graph, r1, c1, r2, c2) {
  const v1 = graph.vertexIndexOf(r1, c1);
  const v2 = graph.vertexIndexOf(r2, c2);
  return graph.edges.find(
    (e) => (e.v1 === v1 && e.v2 === v2) || (e.v1 === v2 && e.v2 === v1)
  );
}

test('cardinal edges have weight 1, diagonal edges have weight sqrt(2)', () => {
  // 2x2, all four walls around the shared corner open -> a legal diagonal.
  const text = buildMazeText(2, 2, {
    hOpen: new Set(['0,0']), // (0,0)-(0,1)
    vOpen: new Set(['0,0']), // (0,0)-(1,0)
  });
  const maze = parseMazeText(text);
  const graph = buildGraphFromMaze(maze, { allowDiagonal: true });

  const cardinal = findEdge(graph, 0, 0, 0, 1);
  assert.ok(cardinal);
  assert.equal(cardinal.weight, 1);
  assert.equal(cardinal.kind, 'cardinal');

  const diagonal = findEdge(graph, 0, 0, 1, 1);
  assert.ok(diagonal, 'expected a legal diagonal edge (0,0)-(1,1)');
  assert.equal(diagonal.weight, Math.SQRT2);
  assert.equal(diagonal.kind, 'diagonal');
});

test('graph edges are undirected: no duplicate or mirrored entries', () => {
  const text = buildMazeText(2, 2, {
    hOpen: new Set(['0,0']),
    vOpen: new Set(['0,0']),
  });
  const maze = parseMazeText(text);
  const graph = buildGraphFromMaze(maze);

  const seen = new Set();
  for (const e of graph.edges) {
    const key = [Math.min(e.v1, e.v2), Math.max(e.v1, e.v2)].join('-');
    assert.ok(!seen.has(key), `duplicate/mirrored edge for ${key}`);
    seen.add(key);
    assert.notEqual(e.v1, e.v2, 'no self-loops');
  }
});

test('blocked diagonal corners: a diagonal is excluded unless BOTH orthogonal walls are open', () => {
  // Only one of the two orthogonal segments around the (0,0)-(1,1) corner is open.
  const text = buildMazeText(2, 2, {
    hOpen: new Set(['0,0']), // (0,0)-(0,1) open
    vOpen: new Set([]), // (0,0)-(1,0) CLOSED
  });
  const maze = parseMazeText(text);
  const graph = buildGraphFromMaze(maze, { allowDiagonal: true });

  const diagonal = findEdge(graph, 0, 0, 1, 1);
  assert.equal(diagonal, undefined, 'diagonal must not be legal when one orthogonal wall is closed');
});

test('allowDiagonal: false produces no diagonal edges at all', () => {
  const text = buildMazeText(2, 2, {
    hOpen: new Set(['0,0']),
    vOpen: new Set(['0,0']),
  });
  const maze = parseMazeText(text);
  const graph = buildGraphFromMaze(maze, { allowDiagonal: false });
  assert.ok(graph.edges.every((e) => e.kind !== 'diagonal'));
});
