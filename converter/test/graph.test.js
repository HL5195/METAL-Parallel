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

test('cardinal edges have weight 1', () => {
  const text = buildMazeText(2, 2, {
    hOpen: new Set(['0,0']), // (0,0)-(0,1)
    vOpen: new Set(['0,0']), // (0,0)-(1,0)
  });
  const maze = parseMazeText(text);
  const graph = buildGraphFromMaze(maze);

  const cardinal = findEdge(graph, 0, 0, 0, 1);
  assert.ok(cardinal);
  assert.equal(cardinal.weight, 1);
});

test('no diagonal edges are ever produced, even when a corner is fully open', () => {
  // All four walls around the (0,0)-(1,1) corner open -- a diagonal shortcut
  // would be tempting here, but only cardinal movement is supported.
  const text = buildMazeText(2, 2, {
    hOpen: new Set(['0,0']),
    vOpen: new Set(['0,0']),
  });
  const maze = parseMazeText(text);
  const graph = buildGraphFromMaze(maze);
  assert.equal(findEdge(graph, 0, 0, 1, 1), undefined);
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
