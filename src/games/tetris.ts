import type { GameDefinition } from '../types';
import { animationLoop, canvasSurface, pixelBlock, tetrominoColors } from './shared';

export const TETROMINOES: number[][][] = [
  [[1, 1, 1, 1]], [[1, 1], [1, 1]], [[0, 1, 0], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 0]], [[1, 1, 0], [0, 1, 1]], [[1, 0, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]],
];
export function rotatePiece(piece: number[][]) { return piece[0].map((_, x) => piece.map(row => row[x]).reverse()); }
export function clearLines(board: number[][]) {
  const remaining = board.filter(row => row.some(cell => !cell));
  const cleared = board.length - remaining.length;
  return { board: [...Array.from({ length: cleared }, () => Array(board[0].length).fill(0) as number[]), ...remaining], cleared, score: [0, 100, 300, 500, 800][cleared] ?? cleared * 200 };
}
export function collides(board: number[][], piece: number[][], x: number, y: number) {
  return piece.some((row, dy) => row.some((value, dx) => value && (x + dx < 0 || x + dx >= 10 || y + dy >= board.length || (y + dy >= 0 && board[y + dy][x + dx]))));
}

export const tetrisGame: GameDefinition = {
  id: 'tetris', name: '俄罗斯方块', description: '整整齐齐，消除一点烦恼。',
  instructions: '← → 移动 · ↑ 旋转 · 空格落下',
  defaultTarget: 500, maxTarget: 10000, scoreUnit: '分',
  controls: [
    { action: 'left', symbol: '←', label: '左移' }, { action: 'rotate', symbol: '↻', label: '旋转' },
    { action: 'right', symbol: '→', label: '右移' }, { action: 'drop', symbol: '↓', label: '直接落下' },
  ],
  create(context) {
    const { canvas, ctx } = canvasSurface(context.surface);
    let board: number[][] = Array.from({ length: 16 }, () => Array(10).fill(0));
    let bag: number[] = [];
    const pick = () => {
      if (!bag.length) {
        bag = [0, 1, 2, 3, 4, 5, 6];
        for (let i = 6; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      }
      const index = bag.pop()!;
      return TETROMINOES[index].map(row => row.map(value => value ? index + 1 : 0));
    };
    let piece = pick(), next = pick(), x = 3, y = 0, score = 0, elapsed = 0, lines = 0, active = false;
    const square = (px: number, py: number, value: number) => pixelBlock(ctx, px + 1, py + 1, 10, 10, tetrominoColors[value]);
    const render = () => {
      ctx.fillStyle = '#171717'; ctx.fillRect(0, 0, 268, 192);
      ctx.fillStyle = '#080808'; ctx.fillRect(74, 0, 120, 192);
      ctx.fillStyle = '#202020';
      for (let i = 1; i < 10; i++) ctx.fillRect(74 + i * 12, 0, 1, 192);
      for (let i = 1; i < 16; i++) ctx.fillRect(74, i * 12, 120, 1);
      board.forEach((row, ry) => row.forEach((value, rx) => { if (value) square(74 + rx * 12, ry * 12, value); }));
      let ghost = y; while (!collides(board, piece, x, ghost + 1)) ghost++;
      piece.forEach((row, dy) => row.forEach((value, dx) => { if (value) { ctx.strokeStyle = '#666666'; ctx.lineWidth = 1; ctx.strokeRect(75.5 + (x + dx) * 12, (ghost + dy) * 12 + 1.5, 9, 9); } }));
      piece.forEach((row, dy) => row.forEach((value, dx) => { if (value) square(74 + (x + dx) * 12, (y + dy) * 12, value); }));
      canvas.setAttribute('aria-label', context.t('boardTetris', { lines, col: x + 1, row: y + 1 }));
    };
    const lock = () => {
      piece.forEach((row, dy) => row.forEach((value, dx) => { if (value && y + dy >= 0) board[y + dy][x + dx] = value; }));
      const cleared = clearLines(board); board = cleared.board; score += cleared.score; lines += cleared.cleared;
      piece = next; next = pick(); x = Math.floor((10 - piece[0].length) / 2); y = 0;
      context.reportScore(score);
      if (active && collides(board, piece, x, y)) context.fail(context.t('stackFull'));
    };
    const step = () => { if (!collides(board, piece, x, y + 1)) y++; else lock(); };
    const loop = animationLoop(delta => { elapsed += delta; if (elapsed >= 650) { elapsed = 0; step(); } render(); });
    render();
    return {
      start() { active = true; loop.start(); }, pause() { active = false; loop.stop(); }, resume() { active = true; loop.start(); },
      action(action) {
        if (!active) return;
        if (action === 'left' && !collides(board, piece, x - 1, y)) x--;
        if (action === 'right' && !collides(board, piece, x + 1, y)) x++;
        if (action === 'down') { step(); elapsed = 0; }
        if (action === 'rotate' || action === 'up') {
          const rotated = rotatePiece(piece);
          for (const offset of [0, -1, 1, -2, 2]) if (!collides(board, rotated, x + offset, y)) { piece = rotated; x += offset; break; }
        }
        if (action === 'drop') { while (!collides(board, piece, x, y + 1)) y++; lock(); elapsed = 0; }
        render();
      },
      destroy() { active = false; loop.stop(); canvas.remove(); },
    };
  },
};
