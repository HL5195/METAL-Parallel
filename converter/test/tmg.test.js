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
  const graph = buildGraphFromMaze(maze, { allowDiagonal: true });
  const tmgText = emitTmg(graph);

  assert.match(tmgText, /^TMG 3\.0 custom\n/);

  const parsed = readTmg(tmgText);
  assert.equal(parsed.numV, graph.vertices.length);
  assert.equal(parsed.numE, graph.edges.length);
  assert.deepEqual(parsed.vFields, ['row', 'col']);
  assert.deepEqual(parsed.eFields, ['kind']);

  // every vertex's (row,col) custom fields round-trip to the original graph
  for (let i = 0; i < graph.vertices.length; i++) {
    assert.equal(Number(parsed.vertices[i].row), graph.vertices[i].row);
    assert.equal(Number(parsed.vertices[i].col), graph.vertices[i].col);
  }

  // every edge's endpoints and kind round-trip
  for (let i = 0; i < graph.edges.length; i++) {
    assert.equal(parsed.edges[i].v1, graph.edges[i].v1);
    assert.equal(parsed.edges[i].v2, graph.edges[i].v2);
    assert.equal(parsed.edges[i].kind, graph.edges[i].kind);
  }
});

test('coordinate spacing keeps diagonal length close to sqrt(2) times cardinal length under plain Euclidean distance', () => {
  // This checks the converter's own coordinate-assignment policy
  // independent of HDX's actual distance function (which still needs
  // confirming live in Milestone 3) -- see tmg.js header comment.
  const text = buildMazeText(2, 2, {
    hOpen: new Set(['0,0']),
    vOpen: new Set(['0,0']),
  });
  const maze = parseMazeText(text);
  const graph = buildGraphFromMaze(maze, { allowDiagonal: true });
  const tmgText = emitTmg(graph);
  const parsed = readTmg(tmgText);

  const byRowCol = new Map(parsed.vertices.map((v) => [`${v.row},${v.col}`, v]));
  const a = byRowCol.get('0,0');
  const b = byRowCol.get('0,1'); // cardinal neighbor
  const d = byRowCol.get('1,1'); // diagonal neighbor

  const planarDist = (p, q) => Math.hypot(p.lat - q.lat, p.lon - q.lon);
  const cardinalLen = planarDist(a, b);
  const diagonalLen = planarDist(a, d);

  assert.ok(cardinalLen > 0);
  const ratio = diagonalLen / cardinalLen;
  assert.ok(Math.abs(ratio - Math.SQRT2) < 1e-6, `expected ratio sqrt(2), got ${ratio}`);
});
