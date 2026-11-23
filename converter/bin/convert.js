#!/usr/bin/env node
// CLI: node bin/convert.js <maze.txt> [output.tmg] [--wall=#] [--open=/]
const fs = require('fs');
const path = require('path');
const { convertMazeText } = require('../src/convert');

function main(argv) {
  const args = argv.slice(2);
  const positional = args.filter((a) => !a.startsWith('--'));
  const flags = Object.fromEntries(
    args
      .filter((a) => a.startsWith('--'))
      .map((a) => {
        const [k, v] = a.slice(2).split('=');
        return [k, v === undefined ? true : v];
      })
  );

  if (positional.length < 1) {
    console.error('Usage: convert.js <maze.txt> [output.tmg] [--wall=#] [--open=/]');
    process.exit(2);
  }

  const inputPath = positional[0];
  const outputPath = positional[1];
  const text = fs.readFileSync(inputPath, 'utf8');

  const { maze, graph, tmgText } = convertMazeText(text, {
    wallChar: flags.wall || '#',
    openChar: flags.open || '/',
  });

  console.error(
    `Parsed ${maze.rows}x${maze.cols} maze -> ${graph.vertices.length} vertices, ` +
      `${graph.edges.length} edges ` +
      `(start=${maze.start ? `${maze.start.row},${maze.start.col}` : 'none'}, ` +
      `end=${maze.end ? `${maze.end.row},${maze.end.col}` : 'none'})`
  );

  if (outputPath) {
    fs.writeFileSync(outputPath, tmgText);
    console.error(`Wrote ${outputPath}`);
  } else {
    process.stdout.write(tmgText);
  }
}

main(process.argv);
