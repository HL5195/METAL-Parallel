// Parser for the "wall-segment" maze .txt format (Milestone 1, Format A).
//
// A maze with R x C cells is written as a grid of exactly (2R+1) rows of
// exactly (2C+1) characters each:
//   - even row, even col -> a cell center: openChar, 'S' (start) or 'E' (end)
//   - exactly one of {even row, even col} -> a wall segment: wallChar or openChar
//   - odd row, odd col   -> a junction, not validated beyond "not alphabetic"
//
// wallChar/openChar default to '#'/'/' but are swappable per upload without
// touching the original text (MAZE_FORMAT_SPEC.md Milestone-1 decision).

class MazeFormatError extends Error {
  constructor(message, { line, col } = {}) {
    super(line != null ? `${message} (line ${line}${col != null ? `, col ${col}` : ''})` : message);
    this.name = 'MazeFormatError';
    this.line = line;
    this.col = col;
  }
}

function parseMazeText(text, { wallChar = '#', openChar = '/' } = {}) {
  if (wallChar === openChar) {
    throw new MazeFormatError(`wallChar and openChar must differ, both were '${wallChar}'`);
  }

  // Normalize line endings, split, and drop a single trailing empty line
  // (common artifact of a file ending in \n) without silently accepting
  // ragged interior blank lines.
  const rawLines = text.replace(/\r\n/g, '\n').split('\n');
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === '') {
    rawLines.pop();
  }

  const gridRows = rawLines.length;
  if (gridRows < 3 || gridRows % 2 === 0) {
    throw new MazeFormatError(
      `expected an odd number of lines >= 3 (got ${gridRows})`
    );
  }
  const gridCols = rawLines[0].length;
  if (gridCols < 3 || gridCols % 2 === 0) {
    throw new MazeFormatError(
      `expected an odd line length >= 3 (got ${gridCols})`,
      { line: 1 }
    );
  }
  for (let r = 0; r < gridRows; r++) {
    if (rawLines[r].length !== gridCols) {
      throw new MazeFormatError(
        `ragged row: expected length ${gridCols}, got ${rawLines[r].length}`,
        { line: r + 1 }
      );
    }
  }

  const rows = (gridRows - 1) / 2;
  const cols = (gridCols - 1) / 2;

  // hWalls[row][c] = wall status between cell (row,c) and (row,c+1), c in [0,cols-2]
  // vWalls[row][col] = wall status between cell (row,col) and (row+1,col), row in [0,rows-2]
  const hWalls = Array.from({ length: rows }, () => new Array(cols - 1).fill(null));
  const vWalls = Array.from({ length: rows - 1 }, () => new Array(cols).fill(null));

  let start = null;
  let end = null;

  const charAt = (gr, gc) => rawLines[gr][gc];

  // Cell centers sit at ODD/ODD grid positions, so that EVEN/EVEN positions
  // are free to represent the maze's own outer boundary wall (row 0, row
  // 2*rows, col 0, col 2*cols) using the exact same "wall segment" meaning
  // as interior walls, rather than needing a separate boundary notation.
  for (let gr = 0; gr < gridRows; gr++) {
    for (let gc = 0; gc < gridCols; gc++) {
      const ch = charAt(gr, gc);
      const rowIsCellLine = gr % 2 === 1;
      const colIsCellLine = gc % 2 === 1;

      if (rowIsCellLine && colIsCellLine) {
        // cell center
        const row = (gr - 1) / 2;
        const col = (gc - 1) / 2;
        if (ch === openChar) {
          continue;
        } else if (ch === 'S') {
          if (start) {
            throw new MazeFormatError('multiple start (S) markers found', { line: gr + 1, col: gc + 1 });
          }
          start = { row, col };
        } else if (ch === 'E') {
          if (end) {
            throw new MazeFormatError('multiple end (E) markers found', { line: gr + 1, col: gc + 1 });
          }
          end = { row, col };
        } else {
          throw new MazeFormatError(
            `invalid cell-center character '${ch}' (expected '${openChar}', 'S' or 'E')`,
            { line: gr + 1, col: gc + 1 }
          );
        }
      } else if (rowIsCellLine !== colIsCellLine) {
        // wall segment (interior, or outer-boundary if gr/gc is 0 or max)
        if (ch !== wallChar && ch !== openChar) {
          throw new MazeFormatError(
            `invalid wall character '${ch}' (expected '${wallChar}' or '${openChar}')`,
            { line: gr + 1, col: gc + 1 }
          );
        }
        const open = ch === openChar;
        if (rowIsCellLine) {
          // horizontal wall segment between (row, c) and (row, c+1);
          // gc even, interior when 2 <= gc <= gridCols-3
          const row = (gr - 1) / 2;
          const c = gc / 2 - 1;
          if (c >= 0 && c < cols - 1) {
            hWalls[row][c] = open;
          }
          // else: outer left/right boundary wall position -- grammar-valid
          // but not tied to any pair of cells, so not recorded as an edge.
        } else {
          // vertical wall segment between (row, col) and (row+1, col);
          // gr even, interior when 2 <= gr <= gridRows-3
          const row = gr / 2 - 1;
          const col = (gc - 1) / 2;
          if (row >= 0 && row < rows - 1) {
            vWalls[row][col] = open;
          }
          // else: outer top/bottom boundary wall position, same as above.
        }
      } else {
        // junction (EVEN/EVEN): not validated beyond rejecting obviously-wrong content
        if (/[A-Za-z]/.test(ch)) {
          throw new MazeFormatError(
            `unexpected letter '${ch}' at junction position`,
            { line: gr + 1, col: gc + 1 }
          );
        }
      }
    }
  }

  return {
    rows,
    cols,
    start,
    end,
    isOpenH(row, c) {
      // wall between (row,c) and (row,c+1)
      if (c < 0 || c >= cols - 1) return false;
      return hWalls[row][c];
    },
    isOpenV(row, col) {
      // wall between (row,col) and (row+1,col)
      if (row < 0 || row >= rows - 1) return false;
      return vWalls[row][col];
    },
    inBounds(row, col) {
      return row >= 0 && row < rows && col >= 0 && col < cols;
    },
  };
}

module.exports = { parseMazeText, MazeFormatError };
