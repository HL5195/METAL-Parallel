/*
 * Description: Parses the maze .txt wall-segment format into a maze object
 * (cells, walls, start/end), and builds a graph adjacency list from it
 * (4 cardinal directions only) for the solving algorithms to search over.
 *
 * Format: a maze with R x C cells is a grid of (2R+1) x (2C+1) characters.
 * Cell centers sit at ODD row/col positions ('/' open, 'S' start, 'E' end);
 * positions with exactly one odd coordinate are wall segments ('#' wall,
 * '/' open), including the maze's own outer border; both-even positions
 * are unused junctions.
 *
 * Referenced METAL: No -- plain from-scratch implementation, no METAL/HDX
 * or TMG code.
 *
 * Author: Howard Li
 */

// Thrown when a maze .txt string doesn't match the wall-segment grid format.
class MazeFormatError extends Error {}

// Parses maze .txt text into { rows, cols, start, end, isOpenH, isOpenV, inBounds }.
function parseMazeText(text, { wallChar = '#', openChar = '/' } = {}) {
  const rawLines = text.replace(/\r\n/g, '\n').split('\n'); // normalize line endings
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === '') rawLines.pop(); // drop trailing blank line

  const gridRows = rawLines.length;
  const gridCols = rawLines[0].length;
  // grid must be (2R+1) x (2C+1), so both dimensions must be odd
  if (gridRows < 3 || gridRows % 2 === 0) throw new MazeFormatError('bad row count');
  if (gridCols < 3 || gridCols % 2 === 0) throw new MazeFormatError('bad column count');
  for (const line of rawLines) {
    if (line.length !== gridCols) throw new MazeFormatError('ragged row');
  }

  const rows = (gridRows - 1) / 2;
  const cols = (gridCols - 1) / 2;
  const hWalls = Array.from({ length: rows }, () => new Array(cols - 1).fill(false)); // walls between horizontally adjacent cells
  const vWalls = Array.from({ length: rows - 1 }, () => new Array(cols).fill(false)); // walls between vertically adjacent cells
  let start = null;
  let end = null;

  for (let gr = 0; gr < gridRows; gr++) {
    for (let gc = 0; gc < gridCols; gc++) {
      const ch = rawLines[gr][gc];
      const cellRow = gr % 2 === 1;
      const cellCol = gc % 2 === 1;
      if (cellRow && cellCol) {
        // odd/odd: this character is a cell center
        const row = (gr - 1) / 2;
        const col = (gc - 1) / 2;
        if (ch === 'S') start = { row, col };
        else if (ch === 'E') end = { row, col };
        else if (ch !== openChar) throw new MazeFormatError(`bad cell char '${ch}'`);
      } else if (cellRow !== cellCol) {
        // exactly one odd coordinate: this character is a wall segment
        if (ch !== wallChar && ch !== openChar) throw new MazeFormatError(`bad wall char '${ch}'`);
        const open = ch === openChar;
        if (cellRow) {
          const row = (gr - 1) / 2;
          const c = gc / 2 - 1;
          if (c >= 0 && c < cols - 1) hWalls[row][c] = open;
        } else {
          const row = gr / 2 - 1;
          const col = (gc - 1) / 2;
          if (row >= 0 && row < rows - 1) vWalls[row][col] = open;
        }
      }
      // both-even positions are unused junctions, nothing to record
    }
  }

  return {
    rows,
    cols,
    start,
    end,
    isOpenH(row, c) { return c >= 0 && c < cols - 1 && hWalls[row][c]; },
    isOpenV(row, col) { return row >= 0 && row < rows - 1 && vWalls[row][col]; },
    inBounds(row, col) { return row >= 0 && row < rows && col >= 0 && col < cols; },
  };
}

// Builds an adjacency list: adjacency[v] = [{ to, weight }, ...], with v
// indexed as row*cols+col. Only the 4 cardinal moves (up/down/left/right)
// are added, each with weight 1 -- no diagonals, so there's no need for any
// corner-cutting rule.
function buildAdjacency(maze) {
  const { rows, cols } = maze;
  const idx = (row, col) => row * cols + col; // flatten (row, col) to a single vertex id
  const adjacency = Array.from({ length: rows * cols }, () => []);
  const add = (a, b, w) => {
    // undirected edge: record it in both directions
    adjacency[a].push({ to: b, weight: w });
    adjacency[b].push({ to: a, weight: w });
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (col + 1 < cols && maze.isOpenH(row, col)) add(idx(row, col), idx(row, col + 1), 1); // right
      if (row + 1 < rows && maze.isOpenV(row, col)) add(idx(row, col), idx(row + 1, col), 1); // down
    }
  }

  return { rows, cols, adjacency, vertexIndexOf: idx, vertexRowCol: (v) => ({ row: Math.floor(v / cols), col: v % cols }) };
}
