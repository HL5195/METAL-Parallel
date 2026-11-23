const { parseMazeText } = require('./maze');
const { buildGraphFromMaze } = require('./graph');
const { emitTmg } = require('./tmg');

// Full TXT -> TMG pipeline. Returns the maze, graph, and tmg text together
// so callers (tests, CLI) can inspect any stage.
function convertMazeText(text, { wallChar = '#', openChar = '/', spacing } = {}) {
  const maze = parseMazeText(text, { wallChar, openChar });
  const graph = buildGraphFromMaze(maze);
  const tmgText = emitTmg(graph, { spacing });
  return { maze, graph, tmgText };
}

module.exports = { convertMazeText };
