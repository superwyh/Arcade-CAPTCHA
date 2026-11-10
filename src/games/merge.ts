import type { GameAction, GameDefinition } from '../types';
import { listenForSwipe } from './shared';

export function slideLine(line: number[]) {
  const compact = line.filter(Boolean);
  const result: number[] = [];
  let score = 0;
  for (let i = 0; i < compact.length; i++) {
    if (compact[i] === compact[i + 1]) {
      const value = compact[i] * 2;
      result.push(value);
      score += value;
      i++;
    } else result.push(compact[i]);
  }
  return { line: [...result, ...Array(line.length - result.length).fill(0)] as number[], score };
}

export function moveBoard(board: number[], direction: 'left' | 'right' | 'up' | 'down') {
  const next = [...board];
  let score = 0;
  for (let line = 0; line < 4; line++) {
    const indices = Array.from({ length: 4 }, (_, n) => {
      if (direction === 'left') return line * 4 + n;
      if (direction === 'right') return line * 4 + 3 - n;
      if (direction === 'up') return n * 4 + line;
      return (3 - n) * 4 + line;
    });
    const moved = slideLine(indices.map(index => board[index]));
    indices.forEach((index, n) => { next[index] = moved.line[n]; });
    score += moved.score;
  }
  return { board: next, score, changed: next.some((value, i) => value !== board[i]) };
}

export function canMove(board: number[]) {
  return (['left', 'right', 'up', 'down'] as const).some(direction => moveBoard(board, direction).changed);
}

export const mergeGame: GameDefinition = {
  id: '2048', name: '2048', description: '合并数字，凑一点好运气。',
  instructions: '方向键 / 滑动合并',
  defaultTarget: 128, maxTarget: 10000, scoreUnit: '分',
  controls: [
    { action: 'left', symbol: '←', label: '向左合并' },
    { action: 'up', symbol: '↑', label: '向上合并' },
    { action: 'down', symbol: '↓', label: '向下合并' },
    { action: 'right', symbol: '→', label: '向右合并' },
  ],
  create(context) {
    let board: number[] = Array(16).fill(0);
    let score = 0;
    let active = false;
    const grid = document.createElement('div');
    grid.className = 'pg-merge';
    grid.setAttribute('role', 'img');
    const cells = Array.from({ length: 16 }, () => {
      const cell = document.createElement('div'); cell.className = 'pg-tile'; grid.append(cell); return cell;
    });
    context.surface.append(grid);
    const spawn = () => {
      const empty = board.flatMap((value, i) => value === 0 ? [i] : []);
      if (empty.length) board[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < .9 ? 2 : 4;
    };
    const render = () => {
      cells.forEach((cell, i) => {
        cell.textContent = board[i] ? String(board[i]) : '';
        cell.dataset.level = String(board[i] ? Math.min(Math.log2(board[i]), 12) : 0);
        cell.dataset.digits = String(String(board[i]).length);
      });
      grid.setAttribute('aria-label', context.t('board2048', { cells: board.map(value => value || context.t('empty')).join(', ') }));
    };
    const action = (direction: GameAction) => {
      if (!active || !['left', 'right', 'up', 'down'].includes(direction)) return;
      const moved = moveBoard(board, direction as 'left' | 'right' | 'up' | 'down');
      if (!moved.changed) return;
      board = moved.board;
      score += moved.score;
      spawn(); render(); context.reportScore(score);
      if (active && !canMove(board)) context.fail(context.t('noMoves'));
    };
    const cleanup = listenForSwipe(grid, action);
    spawn(); spawn(); render();
    return { start() { active = true; }, pause() { active = false; }, resume() { active = true; }, action, destroy() { active = false; cleanup(); grid.remove(); } };
  },
};
