// Generates a JSON bundle of maze fixtures + their independently-computed
// expected answers, for the Milestone-3 live-HDX integration check
// (hdx-harness/live-test.js). This script is NOT part of the converter
// itself -- it's a one-off generator bridging Node-side fixtures to the
// browser-side harness, which has no access to require().

const fs = require('fs');
const path = require('path');
const { buildMazeText } = require('./helpers');
const { parseMazeText } = require('../src/maze');
const { buildGraphFromMaze } = require('../src/graph');
const { emitTmg } = require('../src/tmg');
const { shortestPath, reachableSet } = require('../src/reference');

function makeCase(name, rows, cols, opts, startEnd) {
  const text = buildMazeText(rows, cols, { ...opts, ...startEnd });
  const maze = parseMazeText(text);
  const graph = buildGraphFromMaze(maze, { allowDiagonal: true });
  const tmgText = emitTmg(graph);
  const weighted = shortestPath(maze, maze.start, maze.end, { allowDiagonal: true });
  const cardinalOnly = shortestPath(maze, maze.start, maze.end, { allowDiagonal: false });
  return {
    name,
    text,
    tmgText,
    numVertices: graph.vertices.length,
    numEdges: graph.edges.length,
    start: maze.start,
    end: maze.end,
    startV: graph.vertexIndexOf(maze.start.row, maze.start.col),
    endV: graph.vertexIndexOf(maze.end.row, maze.end.col),
    expected: {
      weightedReachable: weighted.reachable,
      weightedCost: weighted.reachable ? weighted.cost : null,
      cardinalOnlyReachable: cardinalOnly.reachable,
      cardinalOnlyCost: cardinalOnly.reachable ? cardinalOnly.cost : null,
    },
  };
}

const cases = [
  makeCase(
    'solvable-3x3',
    3, 3,
    { hOpen: new Set(['0,0', '0,1', '1,0']), vOpen: new Set(['0,0', '1,1', '0,2', '1,2']) },
    { start: { row: 0, col: 0 }, end: { row: 2, col: 2 } }
  ),
  makeCase(
    'unsolvable-2x2',
    2, 2,
    { hOpen: new Set(['0,0']), vOpen: new Set([]) },
    { start: { row: 0, col: 0 }, end: { row: 1, col: 1 } }
  ),
  makeCase(
    'alternative-routes-ring-3x3',
    3, 3,
    {
      hOpen: new Set(['0,0', '0,1', '2,0', '2,1']),
      vOpen: new Set(['0,0', '0,2', '1,0', '1,2']),
    },
    { start: { row: 0, col: 0 }, end: { row: 2, col: 2 } }
  ),
  makeCase(
    'dead-end-1x3',
    2, 3,
    { hOpen: new Set(['0,0', '0,1']), vOpen: new Set(['0,1']) },
    { start: { row: 0, col: 0 }, end: { row: 0, col: 2 } }
  ),
  makeCase(
    'diagonal-sensitive-2x2',
    2, 2,
    { hOpen: new Set(['0,0']), vOpen: new Set(['0,0']) },
    { start: { row: 0, col: 0 }, end: { row: 1, col: 1 } }
  ),
  makeCase(
    'blocked-diagonal-corner-2x2',
    2, 2,
    { hOpen: new Set(['0,0']), vOpen: new Set([]) },
    { start: { row: 0, col: 0 }, end: { row: 1, col: 1 } }
  ),
  makeCase(
    'alternate-start-end-3x3',
    3, 3,
    { hOpen: new Set(['1,0', '1,1']), vOpen: new Set([]) },
    { start: { row: 1, col: 0 }, end: { row: 1, col: 2 } }
  ),
];

const outPath = path.join(__dirname, '..', '..', 'hdx-harness', 'fixtures.json');
fs.writeFileSync(outPath, JSON.stringify(cases, null, 2));
console.log(`Wrote ${cases.length} cases to ${outPath}`);
for (const c of cases) {
  console.log(`- ${c.name}: V=${c.numVertices} E=${c.numEdges} weightedReachable=${c.expected.weightedReachable} weightedCost=${c.expected.weightedCost}`);
}
