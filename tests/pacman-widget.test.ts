// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameCaptcha, registerGame, getGames } from '../src/core';
import { pacmanGame } from '../src/games/pacman';
import { PACMAN_TARGET, mazeNeighbor, type PacmanModel, type MazeCell, type MazeDirection } from '../src/games/pacman-model';
import { locales } from '../src/i18n';

const rendered = vi.hoisted(() => ({ model: undefined as PacmanModel | undefined }));
vi.mock('../src/games/pacman-renderer', () => ({ renderPacman: (_ctx: unknown, model: PacmanModel) => { rendered.model = model; } }));
registerGame(pacmanGame);
let gate: GameCaptcha, clock = 0, id = 0, frames: Map<number, FrameRequestCallback>;
function advance(count = 10) {
  for (let i = 0; i < count; i++) { clock += 20; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(clock)); }
}
beforeEach(() => {
  frames = new Map(); clock = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ imageSmoothingEnabled: false } as CanvasRenderingContext2D);
  document.body.innerHTML = '<div id="captcha"></div>';
});
afterEach(() => { gate?.destroy(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function nextPellet(model: PacmanModel): MazeDirection {
  const queue: (MazeCell & { first?: MazeDirection })[] = [{ x: model.player.x, y: model.player.y }];
  const seen = new Set([model.player.y * model.width + model.player.x]);
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    if (cell.first && model.pellets.has(cell.y * model.width + cell.x)) return cell.first;
    for (const direction of ['left', 'up', 'right', 'down'] as const) {
      const next = mazeNeighbor(cell, direction), key = next && next.y * model.width + next.x;
      if (!next || key === undefined || seen.has(key)) continue;
      seen.add(key); queue.push({ ...next, first: cell.first ?? direction });
    }
  }
  throw new Error('Unreachable pellet');
}

describe('Pac-Man integration', () => {
  it('starts immediately and only verifies after traversing the complete maze', () => {
    const verify = vi.fn(); gate = new GameCaptcha('#captcha', { game: 'pacman', onVerify: verify });
    expect(gate.getSnapshot()).toMatchObject({ state: 'running', targetScore: PACMAN_TARGET });
    expect(document.querySelector('.pg-primary')).toBeNull();
    const model = rendered.model!; model.ghosts.forEach(ghost => ghost.wait = Infinity); advance(1);
    const root = document.querySelector('.pg-widget')!;
    const keys = { left: 'ArrowLeft', up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown' };
    for (let move = 0; move < 500 && !model.complete; move++) {
      const direction = nextPellet(model);
      root.dispatchEvent(new KeyboardEvent('keydown', { key: keys[direction], code: keys[direction], bubbles: true }));
      advance(10);
      if (model.score < PACMAN_TARGET) expect(verify).not.toHaveBeenCalled();
    }
    expect(model.pellets.size).toBe(0); expect(gate.getSnapshot()).toMatchObject({ state: 'passed', score: PACMAN_TARGET });
    expect(verify).toHaveBeenCalledOnce(); expect(frames.size).toBe(0); advance(50); expect(verify).toHaveBeenCalledOnce();
  });
  it('supports lower targets, resets the maze and rejects impossible targets', () => {
    gate = new GameCaptcha('#captcha', { game: 'pacman', targetScore: 2 }); advance(21);
    expect(gate.getSnapshot()).toMatchObject({ state: 'passed', score: 2 });
    gate.reset({ targets: { pacman: 140 } }); expect(rendered.model!.pellets.size).toBe(140);
    expect(gate.getSnapshot()).toMatchObject({ state: 'running', score: 0, targetScore: 140 });
    expect(() => gate.reset({ targets: { pacman: 141 } })).toThrow();
  });
  it('uses IME physical keys, clears buffered turns on blur and freezes while paused', () => {
    gate = new GameCaptcha('#captcha', { game: 'pacman' }); advance(1);
    const root = document.querySelector('.pg-widget')!, model = rendered.model!;
    const key = (code: string) => root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Process', code, keyCode: 229, isComposing: true, bubbles: true }));
    key('KeyD'); advance(10); expect(model.player.x).toBe(11);
    key('KeyW'); window.dispatchEvent(new Event('blur')); advance(10);
    expect(model.player).toMatchObject({ x: 12, y: 10 });
    gate.pause(); const elapsed = model.elapsed; advance(50); expect(model.elapsed).toBe(elapsed);
    gate.resume(); advance(11); expect(model.elapsed).toBeGreaterThan(elapsed); gate.destroy(); expect(frames.size).toBe(0);
  });
  it('supports touch buttons, swipes and swipe cancellation', () => {
    gate = new GameCaptcha('#captcha', { game: 'pacman' }); advance(1);
    document.querySelector<HTMLButtonElement>('.pg-controls button:last-child')!.click(); advance(10);
    expect(rendered.model!.player.x).toBe(11);
    const canvas = document.querySelector('canvas')!;
    const pointer = (type: string, x: number, y: number) => { const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }); Object.defineProperty(event, 'pointerId', { value: 1 }); canvas.dispatchEvent(event); };
    pointer('pointerdown', 50, 50); pointer('pointerup', 50, 10); advance(10);
    expect(rendered.model!.player).toMatchObject({ x: 11, y: 9 });
    pointer('pointerdown', 50, 50); pointer('pointercancel', 50, 50); pointer('pointerup', 90, 50); advance(10);
    expect(rendered.model!.player.direction).toBe('up'); expect(rendered.model!.player.x).toBe(11);
  });
  it('does not pass on a fatal collision and releases animation on retry/destroy', () => {
    const verify = vi.fn(); gate = new GameCaptcha('#captcha', { game: 'pacman', targetScore: 1, onVerify: verify }); advance(1);
    const model = rendered.model!; model.lives = 1; model.invulnerable = 0;
    Object.assign(model.player, { next: { x: 9, y: 10 }, progress: .98 });
    Object.assign(model.ghosts[0], { x: 9, y: 10, wait: 0 }); advance(1);
    expect(model.score).toBe(1);
    expect(gate.getSnapshot().state).toBe('failed'); expect(verify).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
    document.querySelector<HTMLButtonElement>('.pg-primary')!.click(); expect(gate.getSnapshot()).toMatchObject({ state: 'running', score: 0 });
    expect(rendered.model!.lives).toBe(3); gate.destroy(); expect(frames.size).toBe(0);
  });
  it.each(locales)('localizes the game, controls and board in %s', locale => {
    gate = new GameCaptcha('#captcha', { game: 'pacman', locale });
    expect(document.querySelector('.pg-widget')?.getAttribute('lang')).toBe(locale);
    expect(document.querySelector('canvas')?.getAttribute('aria-label')).toContain('0/140');
    const game = getGames(locale)[0]; expect(game.name).not.toBe(''); expect(game.instructions).not.toBe(''); expect(game.scoreUnit).not.toBe('');
  });
});
