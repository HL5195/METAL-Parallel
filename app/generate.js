/*
 * Description: Generates a random "perfect" maze (exactly one path between
 * any two cells, no loops) using the randomized depth-first "recursive
 * backtracker" algorithm, and serializes it directly into the wall-segment
 * .txt format that maze.js parses.
 *
 * Referenced METAL: No -- plain from-scratch implementation.
 *
 * Author: Howard Li
 */

// Builds an R x C maze and returns it as wall-segment .txt text.
function generateMazeText(rows, cols) {
  const hOpen = Array.from({ length: rows }, () => new Array(cols - 1).fill(false)); // carved horizontal openings
  const vOpen = Array.from({ length: rows - 1 }, () => new Array(cols).fill(false)); // carved vertical openings
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));

  // Returns the not-yet-visited cells next to (r, c), each paired with a
  // closure that carves (opens) the wall between (r, c) and that neighbor.
  function unvisitedNeighbors(r, c) {
    const out = [];
    if (r > 0 && !visited[r - 1][c]) out.push({ r: r - 1, c, wall: () => { vOpen[r - 1][c] = true; } });
    if (r < rows - 1 && !visited[r + 1][c]) out.push({ r: r + 1, c, wall: () => { vOpen[r][c] = true; } });
    if (c > 0 && !visited[r][c - 1]) out.push({ r, c: c - 1, wall: () => { hOpen[r][c - 1] = true; } });
    if (c < cols - 1 && !visited[r][c + 1]) out.push({ r, c: c + 1, wall: () => { hOpen[r][c] = true; } });
    return out;
  }

  // Randomized DFS: walk to a random unvisited neighbor, carving a wall as
  // we go, and backtrack (pop the stack) whenever a cell has no unvisited
  // neighbors left -- this is what makes the maze "perfect" (one unique path
  // between any two cells, no loops).
  const stack = [{ r: 0, c: 0 }];
  visited[0][0] = true;
  while (stack.length > 0) {
    const { r, c } = stack[stack.length - 1];
    const options = unvisitedNeighbors(r, c);
    if (options.length === 0) { stack.pop(); continue; } // dead end, backtrack
    const pick = options[Math.floor(Math.random() * options.length)];
    pick.wall(); // carve the wall between current cell and the pick
    visited[pick.r][pick.c] = true;
    stack.push({ r: pick.r, c: pick.c });
  }

  // Serialize hOpen/vOpen into the (2R+1) x (2C+1) wall-segment character grid.
  const gridRows = 2 * rows + 1;
  const gridCols = 2 * cols + 1;
  const grid = Array.from({ length: gridRows }, () => new Array(gridCols).fill('#')); // start fully walled
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) grid[2 * r + 1][2 * c + 1] = '/'; // cell centers are always open
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (hOpen[r][c]) grid[2 * r + 1][2 * c + 2] = '/';
    }
  }
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      if (vOpen[r][c]) grid[2 * r + 2][2 * c + 1] = '/';
    }
  }
  grid[1][1] = 'S'; // top-left cell
  grid[2 * rows - 1][2 * cols - 1] = 'E'; // bottom-right cell

  return grid.map((row) => row.join('')).join('\n') + '\n';
}
