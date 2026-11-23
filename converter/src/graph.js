// Builds a fine-grained graph (one vertex per maze cell) from a parsed
// maze. Only the 4 cardinal directions (up/down/left/right) are used, each
// edge weight 1 -- no diagonal movement.

function vertexIndexOf(cols, row, col) {
  return row * cols + col;
}

function buildGraphFromMaze(maze) {
  const { rows, cols } = maze;
  const vertices = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      vertices.push({ row, col });
    }
  }

  const edges = [];
  const addEdge = (r1, c1, r2, c2, weight) => {
    edges.push({
      v1: vertexIndexOf(cols, r1, c1),
      v2: vertexIndexOf(cols, r2, c2),
      weight,
    });
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (col + 1 < cols && maze.isOpenH(row, col)) addEdge(row, col, row, col + 1, 1); // right neighbor
      if (row + 1 < rows && maze.isOpenV(row, col)) addEdge(row, col, row + 1, col, 1); // down neighbor
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
