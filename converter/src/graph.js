// Builds a fine-grained graph (one vertex per maze cell) from a parsed
// maze, per the Milestone-0 recommendation. Cardinal edges have weight 1;
// diagonal edges have weight sqrt(2) and are only added when both
// orthogonal wall segments adjacent to the diagonal are open (no illegal
// corner cutting).

const SQRT2 = Math.SQRT2;

function vertexIndexOf(cols, row, col) {
  return row * cols + col;
}

function buildGraphFromMaze(maze, { allowDiagonal = true } = {}) {
  const { rows, cols } = maze;
  const vertices = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      vertices.push({ row, col });
    }
  }

  const edges = [];
  const addEdge = (r1, c1, r2, c2, weight, kind) => {
    edges.push({
      v1: vertexIndexOf(cols, r1, c1),
      v2: vertexIndexOf(cols, r2, c2),
      weight,
      kind,
    });
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // cardinal: right neighbor
      if (col + 1 < cols && maze.isOpenH(row, col)) {
        addEdge(row, col, row, col + 1, 1, 'cardinal');
      }
      // cardinal: down neighbor
      if (row + 1 < rows && maze.isOpenV(row, col)) {
        addEdge(row, col, row + 1, col, 1, 'cardinal');
      }

      if (!allowDiagonal) continue;

      // Diagonal rule: a diagonal move is legal only when BOTH of the
      // moving cell's own orthogonal walls toward the two shared-corner
      // cells are open (no illegal corner cutting). Must match
      // reference.js's independently-coded restatement of this same rule.

      // down-right diagonal: mover is (row,col); its own right & down walls
      if (row + 1 < rows && col + 1 < cols &&
          maze.isOpenH(row, col) && maze.isOpenV(row, col)) {
        addEdge(row, col, row + 1, col + 1, SQRT2, 'diagonal');
      }
      // down-left diagonal: mover is (row,col+1); its own left & down walls
      if (row + 1 < rows && col + 1 < cols &&
          maze.isOpenH(row, col) && maze.isOpenV(row, col + 1)) {
        addEdge(row, col + 1, row + 1, col, SQRT2, 'diagonal');
      }
    }
  }

  return {
    rows,
    cols,
    vertices,
    edges,
    vertexIndexOf: (row, col) => vertexIndexOf(cols, row, col),
  };
}

module.exports = { buildGraphFromMaze, vertexIndexOf };
