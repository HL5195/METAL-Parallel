const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMazeText, MazeFormatError } = require('../src/maze');
const { buildMazeText } = require('./helpers');

test('parses a simple maze and exposes correct wall topology', () => {
  const text = buildMazeText(2, 2, {
    hOpen: new Set(['0,0']), // (0,0)-(0,1) open
    vOpen: new Set(['0,1']), // (0,1)-(1,1) open
    start: { row: 0, col: 0 },
    end: { row: 1, col: 1 },
  });
  const maze = parseMazeText(text);
  assert.equal(maze.rows, 2);
  assert.equal(maze.cols, 2);
  assert.deepEqual(maze.start, { row: 0, col: 0 });
  assert.deepEqual(maze.end, { row: 1, col: 1 });
  assert.equal(maze.isOpenH(0, 0), true);
  assert.equal(maze.isOpenV(0, 0), false); // (0,0)-(1,0) closed
  assert.equal(maze.isOpenV(0, 1), true);
  assert.equal(maze.isOpenH(1, 0), false); // (1,0)-(1,1) closed
});

test('flipped wall/open symbol meanings parse to the same topology', () => {
  const normal = buildMazeText(2, 2, {
    hOpen: new Set(['0,0']),
    vOpen: new Set(['0,1']),
    start: { row: 0, col: 0 },
    end: { row: 1, col: 1 },
  });
  // Re-author the same maze with # meaning open and / meaning wall.
  const flipped = buildMazeText(2, 2, {
    hOpen: new Set(['0,0']),
    vOpen: new Set(['0,1']),
    start: { row: 0, col: 0 },
    end: { row: 1, col: 1 },
    wallChar: '/',
    openChar: '#',
  });

  const a = parseMazeText(normal, { wallChar: '#', openChar: '/' });
  const b = parseMazeText(flipped, { wallChar: '/', openChar: '#' });

  for (let r = 0; r < 2; r++) {
    assert.equal(a.isOpenH(r, 0), b.isOpenH(r, 0));
  }
  for (let c = 0; c < 2; c++) {
    assert.equal(a.isOpenV(0, c), b.isOpenV(0, c));
  }
  // and the original bytes were never mutated -- flipped is a distinct string
  assert.notEqual(normal, flipped);
});

test('rejects ragged rows', () => {
  const bad = '#####\n#/  \n#####\n'; // second row too short
  assert.throws(() => parseMazeText(bad), MazeFormatError);
});

test('rejects even grid dimensions', () => {
  const bad = '####\n#/#\n####\n'; // 4 columns, even
  assert.throws(() => parseMazeText(bad), MazeFormatError);
});

test('rejects invalid cell-center character', () => {
  const bad = '###\n#X#\n###\n';
  assert.throws(() => parseMazeText(bad), MazeFormatError);
});

test('rejects invalid wall-segment character', () => {
  const bad = '#X#\n#/#\n###\n';
  assert.throws(() => parseMazeText(bad), MazeFormatError);
});

test('rejects duplicate start markers', () => {
  // 1x2 maze: cell centers sit at grid row 1, grid cols 1 and 3.
  const text = buildMazeText(1, 2, { hOpen: new Set(['0,0']), start: { row: 0, col: 0 } });
  const grid = text.replace(/\n$/, '').split('\n').map((l) => l.split(''));
  assert.equal(grid[1][1], 'S'); // sanity check on the grid layout assumption
  grid[1][3] = 'S'; // inject a second start marker at the other cell
  const bad = grid.map((r) => r.join('')).join('\n') + '\n';
  assert.throws(() => parseMazeText(bad), MazeFormatError);
});
