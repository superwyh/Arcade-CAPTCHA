import type { GameDefinition } from '../types';
import { pixelIcon } from './shared';

const flagIcon = pixelIcon(['........', '...rrr..', '..rrrr..', '...rrr..', '....k...', '....k...', '..kkkk..', '.kkkkkk.'], { r: '#e00000', k: '#151515' });
const mineIcon = pixelIcon(['...k....', '.k.k.k..', '..kkk...', 'kkkkkkk.', '..kwk...', '.kkkkk..', '.k.k.k..', '...k....'], { k: '#111111', w: '#ffffff' });

export class MineBoard {
  readonly width = 8;
  readonly height = 6;
  readonly mineCount = 8;
  mines = new Set<number>();
  revealed = new Set<number>();
  flags = new Set<number>();
  initialized = false;
  constructor(private random: () => number = Math.random) {}
  neighbors(index: number) {
    const result: number[] = [];
    const x = index % this.width, y = Math.floor(index / this.width);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if ((dx || dy) && nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) result.push(ny * this.width + nx);
    }
    return result;
  }
  adjacent(index: number) { return this.neighbors(index).filter(n => this.mines.has(n)).length; }
  seed(first: number) {
    const safe = new Set([first, ...this.neighbors(first)]);
    const candidates = Array.from({ length: 48 }, (_, i) => i).filter(i => !safe.has(i));
    // Preserve normal flood reveal, but reject openings that finish the default challenge.
    for (let attempt = 0; attempt < 64; attempt++) {
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      this.mines = new Set(candidates.slice(0, this.mineCount));
      if (this.opening(first).size < this.width * this.height - this.mineCount) { this.initialized = true; return; }
    }
    // Bounded fallback also works with constant or adversarial random sources.
    const distance = (index: number) => (index % 8 - first % 8) ** 2 + (Math.floor(index / 8) - Math.floor(first / 8)) ** 2;
    candidates.sort((a, b) => distance(a) - distance(b) || a - b);
    this.mines = new Set(candidates.slice(0, this.mineCount));
    this.initialized = true;
  }
  private opening(index: number) {
    const opened = new Set<number>(), queue = [index];
    while (queue.length) {
      const current = queue.pop()!;
      if (opened.has(current)) continue;
      opened.add(current);
      if (!this.adjacent(current)) queue.push(...this.neighbors(current).filter(n => !this.mines.has(n) && !opened.has(n)));
    }
    return opened;
  }
  toggleFlag(index: number) {
    if (this.revealed.has(index)) return;
    if (this.flags.has(index)) this.flags.delete(index);
    else if (this.flags.size < this.mineCount) this.flags.add(index);
  }
  reveal(index: number) {
    if (this.flags.has(index) || this.revealed.has(index)) return true;
    if (!this.initialized) this.seed(index);
    if (this.mines.has(index)) return false;
    const queue = [index];
    while (queue.length) {
      const current = queue.pop()!;
      if (this.revealed.has(current) || this.flags.has(current)) continue;
      this.revealed.add(current);
      if (!this.adjacent(current)) queue.push(...this.neighbors(current).filter(n => !this.mines.has(n) && !this.revealed.has(n)));
    }
    return true;
  }
}

export const minesweeperGame: GameDefinition = {
  id: 'minesweeper', name: '扫雷', description: '小心一点，好奇多一点。',
  instructions: '点击翻格 · 右键 / F 插旗',
  defaultTarget: 40, maxTarget: 40, scoreUnit: '格',
  controls: [{ action: 'flag', symbol: '⚑', label: '切换插旗模式' }, { action: 'reveal', symbol: '↵', label: '翻开选中格子' }],
  create(context) {
    const board = new MineBoard();
    const grid = document.createElement('div');
    grid.className = 'pg-mines';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', context.t('boardMines'));
    let active = false, flagMode = false, selected = 0, lost = false;
    const cells = Array.from({ length: 48 }, (_, i) => {
      const cell = document.createElement('button');
      cell.type = 'button'; cell.className = 'pg-mine-cell'; cell.tabIndex = -1;
      cell.addEventListener('click', () => { if (active) { selected = i; revealOrFlag(); } });
      cell.addEventListener('contextmenu', event => {
        event.preventDefault(); if (!active) return; selected = i; board.toggleFlag(i); render();
      });
      grid.append(cell); return cell;
    });
    context.surface.append(grid);
    const render = () => {
      cells.forEach((cell, i) => {
        const revealed = board.revealed.has(i), mine = lost && board.mines.has(i), flag = board.flags.has(i);
        const adjacent = board.adjacent(i);
        if (mine || flag) cell.innerHTML = mine ? mineIcon : flagIcon;
        else cell.textContent = revealed && adjacent ? String(adjacent) : '';
        cell.dataset.open = String(revealed);
        cell.dataset.selected = String(selected === i);
        cell.dataset.mine = String(mine);
        cell.dataset.number = String(adjacent);
        cell.setAttribute('aria-label', context.t('cell', { row: Math.floor(i / 8) + 1, col: i % 8 + 1, value: context.t(mine ? 'mine' : flag ? 'flagged' : revealed ? 'adjacent' : 'closed', { n: adjacent }) }));
      });
      grid.dataset.flagMode = String(flagMode);
    };
    const revealOrFlag = () => {
      if (flagMode) board.toggleFlag(selected);
      else if (!board.reveal(selected)) {
        lost = true; active = false; render(); context.fail(context.t('hitMine')); return;
      }
      render(); context.reportScore(board.revealed.size);
    };
    render();
    return {
      start() { active = true; }, pause() { active = false; }, resume() { active = true; },
      action(action) {
        if (!active) return;
        if (action === 'flag') { flagMode = !flagMode; context.announce(context.t(flagMode ? 'flagOn' : 'flagOff')); }
        else if (action === 'left') selected = selected % 8 ? selected - 1 : selected;
        else if (action === 'right') selected = selected % 8 < 7 ? selected + 1 : selected;
        else if (action === 'up') selected = Math.max(0, selected - 8);
        else if (action === 'down') selected = Math.min(47, selected + 8);
        else if (action === 'reveal' || action === 'drop') revealOrFlag();
        render();
      },
      destroy() { active = false; grid.remove(); },
    };
  },
};
