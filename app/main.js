/*
 * Description: Page orchestration for the simple multi-panel maze
 * visualizer. Each panel spawns its own Worker (see worker.js) so solving
 * genuinely happens on separate OS threads in parallel, not just
 * interleaved in one event loop; this file only handles wiring, drawing,
 * and animating the results each worker sends back.
 *
 * Referenced METAL: No -- plain from-scratch implementation.
 *
 * Author: Howard Li
 */

const panelsEl = document.getElementById('panels');
const rowsInput = document.getElementById('rowsInput');
const colsInput = document.getElementById('colsInput');
const speedSlider = document.getElementById('speedSlider');

let mazes = { A: null, B: null }; // { maze, graph }, shared by every panel pointed at that key
let panels = [];
let nextPanelId = 1;

// Generates one fresh random maze (at the toolbar's current size) and its graph.
function buildMaze() {
  const rows = Number(rowsInput.value);
  const cols = Number(colsInput.value);
  const text = generateMazeText(rows, cols);
  const maze = parseMazeText(text);
  const graph = buildAdjacency(maze); // cardinal moves only
  return { maze, graph };
}

// Stops any run in progress and puts a panel back into its not-run state --
// shared by maze regeneration, maze upload, and switching a panel's maze.
function resetPanelRunState(panel) {
  if (panel.timer) clearInterval(panel.timer); // stop any in-progress animation
  panel.timer = null;
  panel.paused = false;
  panel.animIndex = 0;
  panel.result = null;
  panel.visitedSoFar = null;
  panel.currentVertex = null;
  panel.showPath = false;
  panel.pauseBtn.disabled = true;
  panel.pauseBtn.textContent = 'Pause';
  panel.metricsEl.textContent = 'Not run yet.';
  drawPanel(panel);
}

// Rebuilds Maze A and Maze B and resets every panel back to its not-run state.
function regenerateMazes() {
  mazes.A = buildMaze();
  mazes.B = buildMaze();
  panels.forEach(resetPanelRunState);
}

// Parses uploaded/pasted maze text and installs it as Maze A or Maze B,
// resetting whichever panels are pointed at that slot. Throws
// MazeFormatError (bad grid) or a plain Error (missing S/E) on bad input --
// the caller is expected to show that message to the user.
function loadMazeIntoSlot(slot, text) {
  const maze = parseMazeText(text);
  if (!maze.start || !maze.end) throw new Error('maze text must mark exactly one S (start) and one E (end)');
  const graph = buildAdjacency(maze);
  mazes[slot] = { maze, graph };
  for (const panel of panels) {
    if (panel.mazeKey === slot) resetPanelRunState(panel);
  }
}

// Picks a pixel size per cell so any maze size fits in roughly the same canvas footprint.
function cellSizeFor(maze) {
  return Math.max(4, Math.min(24, Math.floor(420 / Math.max(maze.rows, maze.cols))));
}

// Redraws one panel's canvas: background, visited/current/path cell fills,
// start/end markers, then the maze's walls on top.
function drawPanel(panel) {
  const { maze } = mazes[panel.mazeKey];
  const size = cellSizeFor(maze);
  const canvas = panel.canvas;
  canvas.width = maze.cols * size;
  canvas.height = maze.rows * size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // cell fills from the current animation frame, if any
  if (panel.visitedSoFar) {
    ctx.fillStyle = '#3a6fd1';
    for (const v of panel.visitedSoFar) {
      const { row, col } = mazes[panel.mazeKey].graph.vertexRowCol(v);
      ctx.fillRect(col * size, row * size, size, size);
    }
  }
  if (panel.currentVertex != null) {
    const { row, col } = mazes[panel.mazeKey].graph.vertexRowCol(panel.currentVertex);
    ctx.fillStyle = '#ffb020';
    ctx.fillRect(col * size, row * size, size, size);
  }
  if (panel.showPath && panel.result && panel.result.path) {
    ctx.fillStyle = '#35c46a';
    for (const v of panel.result.path) {
      const { row, col } = mazes[panel.mazeKey].graph.vertexRowCol(v);
      ctx.fillRect(col * size, row * size, size, size);
    }
  }

  // start/end markers
  if (maze.start) { ctx.fillStyle = '#35c46a'; ctx.fillRect(maze.start.col * size, maze.start.row * size, size, size); }
  if (maze.end) { ctx.fillStyle = '#e0486b'; ctx.fillRect(maze.end.col * size, maze.end.row * size, size, size); }

  // walls -- drawn straight from the maze's own isOpenH/isOpenV, so this is
  // the original maze geometry, not an approximation of it
  ctx.strokeStyle = '#eee';
  ctx.lineWidth = Math.max(1, size * 0.15);
  const drawWall = (c1, r1, c2, r2) => {
    ctx.beginPath();
    ctx.moveTo(c1 * size, r1 * size);
    ctx.lineTo(c2 * size, r2 * size);
    ctx.stroke();
  };
  for (let row = 0; row < maze.rows; row++) {
    drawWall(0, row, 0, row + 1); // left border
    for (let col = 0; col < maze.cols - 1; col++) {
      if (!maze.isOpenH(row, col)) drawWall(col + 1, row, col + 1, row + 1);
    }
    drawWall(maze.cols, row, maze.cols, row + 1); // right border
  }
  for (let col = 0; col < maze.cols; col++) drawWall(col, 0, col + 1, 0); // top border
  for (let row = 0; row < maze.rows - 1; row++) {
    for (let col = 0; col < maze.cols; col++) {
      if (!maze.isOpenV(row, col)) drawWall(col, row + 1, col + 1, row + 1);
    }
  }
  for (let col = 0; col < maze.cols; col++) drawWall(col, maze.rows, col + 1, maze.rows); // bottom border
}

// Creates one panel's DOM (maze/algorithm pickers, Run/Pause buttons,
// canvas, metrics), wires up its event listeners, and adds it to `panels`.
function createPanel(mazeKey, algorithm) {
  const id = nextPanelId++;
  const el = document.createElement('div');
  el.className = 'panel';
  el.innerHTML = `
    <button class="remove">x</button>
    <h3>Panel ${id}</h3>
    <label>Maze:
      <select class="mazeSelect"><option value="A">A</option><option value="B">B</option></select>
    </label>
    <label>Algorithm:
      <select class="algoSelect">
        <option value="bfs">BFS</option>
        <option value="dfs">DFS</option>
        <option value="dijkstra">Dijkstra</option>
        <option value="astar">A*</option>
      </select>
    </label>
    <button class="runOne">Run</button>
    <button class="pauseOne" disabled>Pause</button>
    <canvas></canvas>
    <div class="metrics">Not run yet.</div>
  `;
  panelsEl.appendChild(el);

  const panel = {
    id,
    mazeKey,
    algorithm,
    el,
    canvas: el.querySelector('canvas'),
    metricsEl: el.querySelector('.metrics'),
    pauseBtn: el.querySelector('.pauseOne'),
    result: null,
    visitedSoFar: null,
    currentVertex: null,
    showPath: false,
    timer: null,
    paused: false,
    animIndex: 0,
  };

  el.querySelector('.mazeSelect').value = mazeKey;
  el.querySelector('.algoSelect').value = algorithm;
  el.querySelector('.mazeSelect').addEventListener('change', (e) => {
    panel.mazeKey = e.target.value;
    resetPanelRunState(panel);
  });
  el.querySelector('.algoSelect').addEventListener('change', (e) => { panel.algorithm = e.target.value; });
  el.querySelector('.runOne').addEventListener('click', () => runPanel(panel));
  el.querySelector('.pauseOne').addEventListener('click', () => togglePause(panel));
  el.querySelector('.remove').addEventListener('click', () => {
    if (panel.timer) clearInterval(panel.timer);
    panels = panels.filter((p) => p !== panel);
    el.remove();
  });

  panels.push(panel);
  drawPanel(panel);
  return panel;
}

// Spawns a dedicated Worker for this panel and hands it the solve request;
// this is the actual parallel part -- each call runs on its own OS thread.
function runPanel(panel) {
  if (panel.timer) clearInterval(panel.timer); // cancel any previous run's animation
  panel.result = null;
  panel.visitedSoFar = new Set();
  panel.currentVertex = null;
  panel.showPath = false;
  panel.paused = false;
  panel.animIndex = 0;
  panel.pauseBtn.disabled = true;
  panel.pauseBtn.textContent = 'Pause';
  panel.metricsEl.textContent = 'Computing...';

  const { maze, graph } = mazes[panel.mazeKey];
  const start = graph.vertexIndexOf(maze.start.row, maze.start.col);
  const end = graph.vertexIndexOf(maze.end.row, maze.end.col);

  const worker = new Worker('worker.js'); // separate OS thread, own JS engine
  const t0 = performance.now();
  worker.onmessage = (event) => {
    panel.wallMs = performance.now() - t0; // includes thread spin-up + message copy, not just compute
    panel.result = event.data;
    worker.terminate();
    panel.pauseBtn.disabled = false;
    startAnimTimer(panel);
  };
  worker.postMessage({
    id: panel.id,
    graph: { rows: graph.rows, cols: graph.cols, adjacency: graph.adjacency }, // structured-clone copy, not shared memory
    start,
    end,
    algorithm: panel.algorithm,
  });
}

// Starts (or resumes, after a pause) the setInterval that reveals
// panel.result.order one chunk at a time. Pausing just clearIntervals this
// timer -- the already-computed result isn't touched, so resuming picks up
// exactly where panel.animIndex left off.
function startAnimTimer(panel) {
  if (panel.timer) clearInterval(panel.timer);
  const { order, found, path, elapsedMs } = panel.result;
  const stepsPerTick = Math.max(1, Math.ceil(order.length / 60)); // keep long runs from crawling
  const delay = Math.max(10, 310 - Number(speedSlider.value) * 28);

  panel.timer = setInterval(() => {
    // reveal the next chunk of already-computed vertices
    for (let k = 0; k < stepsPerTick && panel.animIndex < order.length; k++, panel.animIndex++) {
      panel.visitedSoFar.add(order[panel.animIndex].vertex);
      panel.currentVertex = order[panel.animIndex].vertex;
    }
    drawPanel(panel);
    if (panel.animIndex >= order.length) {
      clearInterval(panel.timer); // animation finished
      panel.timer = null;
      panel.currentVertex = null;
      panel.showPath = found;
      panel.pauseBtn.disabled = true;
      drawPanel(panel);
      panel.metricsEl.textContent =
        `${found ? 'Path found' : 'No path'}\n` +
        `Visited: ${order.length}\n` +
        `Path length: ${found ? path.length : '-'}\n` +
        `Compute time: ${elapsedMs.toFixed(2)} ms (worker)\n` +
        `Wall time incl. thread handoff: ${panel.wallMs.toFixed(2)} ms`;
    }
  }, delay);
}

// Pauses a running animation (stopping its timer, keeping its progress) or
// resumes a paused one (restarting the timer from where it left off).
function togglePause(panel) {
  if (!panel.result) return; // nothing computed yet, nothing to pause
  if (panel.timer) {
    clearInterval(panel.timer);
    panel.timer = null;
    panel.paused = true;
    panel.pauseBtn.textContent = 'Resume';
  } else if (panel.paused) {
    panel.paused = false;
    panel.pauseBtn.textContent = 'Pause';
    startAnimTimer(panel);
  }
}

document.getElementById('regenBtn').addEventListener('click', regenerateMazes);
document.getElementById('runBtn').addEventListener('click', () => panels.forEach(runPanel));
document.getElementById('addPanelBtn').addEventListener('click', () => createPanel('A', 'bfs'));

// Reads the chosen .txt file and loads it into whichever slot (A/B) the
// uploadTarget dropdown is set to.
document.getElementById('mazeFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const slot = document.getElementById('uploadTarget').value;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      loadMazeIntoSlot(slot, reader.result);
    } catch (err) {
      alert(`Could not load maze into ${slot}: ${err.message}`);
    }
  };
  reader.readAsText(file);
  e.target.value = ''; // clear so re-selecting the same file still fires 'change'
});

// Loads whatever maze text is in the paste textarea into the chosen slot,
// the same way a file upload does -- textarea content is left in place so
// it can be tweaked and reloaded.
document.getElementById('loadPasteBtn').addEventListener('click', () => {
  const slot = document.getElementById('uploadTarget').value;
  const text = document.getElementById('mazePasteInput').value;
  try {
    loadMazeIntoSlot(slot, text);
  } catch (err) {
    alert(`Could not load maze into ${slot}: ${err.message}`);
  }
});

regenerateMazes();
createPanel('A', 'bfs');
createPanel('A', 'dfs');
createPanel('B', 'bfs');
createPanel('B', 'dfs');
