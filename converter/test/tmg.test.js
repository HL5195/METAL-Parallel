const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMazeText } = require('../src/maze');
const { buildGraphFromMaze } = require('../src/graph');
const { emitTmg, readTmg } = require('../src/tmg');
const { buildMazeText } = require('./helpers');

test('TMG round-trip preserves vertex count, edge count, and row/col mapping', () => {
  const text = buildMazeText(3, 3, {
    hOpen: new Set(['0,0', '0,1', '1,0']),
    vOpen: new Set(['0,0', '1,1', '0,2', '1,2']),
    start: { row: 0, col: 0 },
    end: { row: 2, col: 2 },
  });
  const maze = parseMazeText(text);
  const graph = buildGraphFromMaze(maze);
  const tmgText = emitTmg(graph);

  assert.match(tmgText, /^TMG 3\.0 custom\n/);

  const parsed = readTmg(tmgText);
  assert.equal(parsed.numV, graph.vertices.length);
  assert.equal(parsed.numE, graph.edges.length);
  assert.deepEqual(parsed.vFields, ['row', 'col']);
  assert.deepEqual(parsed.eFields, []);

  // every vertex's (row,col) custom fields round-trip to the original graph
  for (let i = 0; i < graph.vertices.length; i++) {
    assert.equal(Number(parsed.vertices[i].row), graph.vertices[i].row);
    assert.equal(Number(parsed.vertices[i].col), graph.vertices[i].col);
  }

  // every edge's endpoints round-trip
  for (let i = 0; i < graph.edges.length; i++) {
    assert.equal(parsed.edges[i].v1, graph.edges[i].v1);
    assert.equal(parsed.edges[i].v2, graph.edges[i].v2);
  }
});
