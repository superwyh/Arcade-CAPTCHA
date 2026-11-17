// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameCaptcha, registerGame, getGames } from '../src/core';
import { snakeGame } from '../src/games/snake';
import type { SnakeModel } from '../src/games/snake-model';
import { locales } from '../src/i18n';

const rendered = vi.hoisted(() => ({ model: undefined as SnakeModel | undefined }));
vi.mock('../src/games/snake-renderer', () => ({ renderSnake: (_ctx: unknown, model: SnakeModel) => { rendered.model = model; } }));
registerGame(snakeGame);
let gate: GameCaptcha, clock = 0, id = 0, frames: Map<number, FrameRequestCallback>;
function advance(count = 15) {
  for (let i = 0; i < count; i++) { clock += 16; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(clock)); }
}
beforeEach(() => {
  frames = new Map(); clock = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ imageSmoothingEnabled: false } as CanvasRenderingContext2D);
  vi.spyOn(Math, 'random').mockReturnValue(0);
  document.body.innerHTML = '<div id="captcha"></div>';
});
afterEach(() => { gate?.destroy(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Snake widget', () => {
  it('starts immediately and verifies only once after all twelve food items', () => {
    const verify = vi.fn(); gate = new GameCaptcha('#captcha', { game: 'snake', onVerify: verify });
    expect(gate.getSnapshot()).toMatchObject({ state: 'running', targetScore: 12 });
    expect(document.querySelector('.pg-primary')).toBeNull();
    const model = rendered.model!;
    for (let food = 1; food <= 12; food++) {
      model.food = { x: model.body[0].x + 1, y: model.body[0].y };
      for (let frame = 0; frame < 20 && model.score < food; frame++) advance(1);
      expect(gate.getSnapshot().state).toBe(food === 12 ? 'passed' : 'running');
    }
    expect(verify).toHaveBeenCalledOnce(); expect(frames.size).toBe(0); advance(40); expect(verify).toHaveBeenCalledOnce();
  });
  it('supports target overrides and clears the previous session on reset', () => {
    gate = new GameCaptcha('#captcha', { game: 'snake', targetScore: 1 });
    advance(100); expect(gate.getSnapshot()).toMatchObject({ state: 'passed', score: 1 });
    gate.reset({ targets: { snake: 20 } }); expect(gate.getSnapshot()).toMatchObject({ state: 'running', score: 0, targetScore: 20 });
    expect(rendered.model!.body).toHaveLength(4); expect(() => gate.reset({ targets: { snake: 101 } })).toThrow();
  });
  it('handles IME physical keys, clears queued turns on blur and freezes while paused', () => {
    gate = new GameCaptcha('#captcha', { game: 'snake' });
    const root = document.querySelector('.pg-widget')!, model = rendered.model!;
    const key = (code: string) => root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Process', code, keyCode: 229, isComposing: true, bubbles: true }));
    key('KeyW'); advance(); expect(model.body[0]).toEqual({ x: 4, y: 7 });
    key('KeyA'); window.dispatchEvent(new Event('blur')); advance(); expect(model.body[0]).toEqual({ x: 4, y: 6 });
    gate.pause(); const head = { ...model.body[0] }; advance(100); expect(model.body[0]).toEqual(head);
    gate.resume(); advance(); expect(model.body[0].y).toBeLessThan(head.y); gate.destroy(); expect(frames.size).toBe(0);
  });
  it('supports touch directions, swipes, and cancels unfinished swipes', () => {
    gate = new GameCaptcha('#captcha', { game: 'snake' });
    document.querySelector<HTMLButtonElement>('.pg-controls button:nth-child(2)')!.click(); advance();
    const model = rendered.model!; expect(model.direction).toBe('up');
    const canvas = document.querySelector('canvas')!;
    const pointer = (type: string, x: number, y: number) => { const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }); Object.defineProperty(event, 'pointerId', { value: 1 }); canvas.dispatchEvent(event); };
    pointer('pointerdown', 50, 50); pointer('pointerup', 10, 50); advance(); expect(model.direction).toBe('left');
    pointer('pointerdown', 50, 50); pointer('pointercancel', 50, 50); pointer('pointerup', 50, 90); advance(); expect(model.direction).toBe('left');
  });
  it('fails on a collision and stops its animation loop', () => {
    const verify = vi.fn(); gate = new GameCaptcha('#captcha', { game: 'snake', onVerify: verify });
    advance(300); expect(gate.getSnapshot().state).toBe('failed'); expect(verify).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
    document.querySelector<HTMLButtonElement>('.pg-primary')!.click(); expect(gate.getSnapshot()).toMatchObject({ state: 'running', score: 0 });
  });
  it.each(locales)('localizes the board and controls in %s', locale => {
    gate = new GameCaptcha('#captcha', { game: 'snake', locale });
    expect(document.querySelector('.pg-widget')?.getAttribute('lang')).toBe(locale);
    expect(document.querySelector('canvas')?.getAttribute('aria-label')).toContain('0/12');
    const game = getGames(locale)[0]; expect(game.name).not.toBe(''); expect(game.instructions).not.toBe(''); expect(game.scoreUnit).not.toBe('');
  });
});
