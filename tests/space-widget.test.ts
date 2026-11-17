// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameCaptcha, registerGame, getGames } from '../src/core';
import { spaceGame } from '../src/games/space';
import type { SpaceModel } from '../src/games/space-model';
import { locales } from '../src/i18n';

const rendered = vi.hoisted(() => ({ model: undefined as SpaceModel | undefined, ready: true, loadError: false }));
vi.mock('../src/games/space-renderer', () => ({ SpaceRenderer: class {
  get ready() { return rendered.ready; }
  loaded = rendered.loadError ? Promise.reject(new Error('test asset failure')) : Promise.resolve();
  render(model: SpaceModel) { rendered.model = model; }
} }));
registerGame(spaceGame);
let gate: GameCaptcha, clock = 0, id = 0, frames: Map<number, FrameRequestCallback>;
function advance(count = 12) {
  for (let i = 0; i < count; i++) { clock += 16; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(clock)); }
}
const clearPhase = () => { rendered.model!.enemies.forEach(enemy => enemy.hp = 0); advance(1); };
beforeEach(() => {
  frames = new Map(); clock = 0; rendered.ready = true; rendered.loadError = false;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ imageSmoothingEnabled: false } as CanvasRenderingContext2D);
  document.body.innerHTML = '<div id="captcha"></div>';
});
afterEach(() => { gate?.destroy(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Space shooter integration', () => {
  it('starts automatically and verifies exactly once after two waves and the boss', () => {
    const verify = vi.fn(); gate = new GameCaptcha('#captcha', { game: 'space', onVerify: verify });
    expect(gate.getSnapshot()).toMatchObject({ state: 'running', targetScore: 3 }); expect(document.querySelector('.pg-primary')).toBeNull();
    advance(); expect(rendered.model!.shots.length).toBeGreaterThan(0);
    clearPhase(); expect(gate.getSnapshot()).toMatchObject({ state: 'running', score: 1 });
    advance(80); clearPhase(); expect(verify).not.toHaveBeenCalled();
    advance(80); expect(rendered.model!.boss).toBeDefined(); clearPhase();
    expect(gate.getSnapshot()).toMatchObject({ state: 'passed', score: 3 }); advance(50); expect(verify).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
  });
  it('uses custom targets, requires the boss, and resets cleanly', () => {
    gate = new GameCaptcha('#captcha', { game: 'space', targetScore: 1 }); expect(rendered.model!.boss).toBeDefined();
    clearPhase(); expect(gate.getSnapshot().state).toBe('passed');
    gate.reset({ targets: { space: 5 } }); expect(rendered.model!.target).toBe(5); expect(rendered.model!.boss).toBeUndefined();
    expect(gate.getSnapshot()).toMatchObject({ state: 'running', score: 0 }); expect(() => gate.reset({ targets: { space: 6 } })).toThrow();
  });
  it('uses physical IME keys, releases them on blur, and stops while paused', () => {
    gate = new GameCaptcha('#captcha', { game: 'space' });
    const root = document.querySelector('.pg-widget')!, model = rendered.model!;
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Process', code: 'KeyD', keyCode: 229, isComposing: true, bubbles: true }));
    advance(); expect(model.x).toBeGreaterThan(134);
    window.dispatchEvent(new Event('blur')); const x = model.x; advance(); expect(model.x).toBe(x);
    gate.pause(); const time = model.elapsed; advance(50); expect(model.elapsed).toBe(time);
    gate.resume(); advance(); expect(model.elapsed).toBeGreaterThan(time); gate.destroy(); expect(frames.size).toBe(0);
  });
  it('supports drag movement and releases pointer control on cancellation', () => {
    gate = new GameCaptcha('#captcha', { game: 'space' });
    const canvas = document.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 268, bottom: 192, width: 268, height: 192, toJSON() {} });
    const pointer = (type: string, x: number, y: number) => { const event = new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true }); Object.defineProperty(event, 'pointerId', { value: 3 }); canvas.dispatchEvent(event); };
    pointer('pointerdown', 30, 100); pointer('pointermove', 160, 80); advance(); expect(rendered.model!.x).toBeGreaterThan(134);
    pointer('pointercancel', 160, 80); const x = rendered.model!.x; advance(); expect(rendered.model!.x).toBe(x);
    pointer('pointermove', 200, 80); advance(); expect(rendered.model!.x).toBe(x);
  });
  it('supports held touch buttons and releases on pointer cancellation', () => {
    gate = new GameCaptcha('#captcha', { game: 'space' });
    const left = document.querySelector<HTMLButtonElement>('.pg-controls button')!;
    const pointer = (type: string) => { const event = new Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(event, 'pointerId', { value: 7 }); left.dispatchEvent(event); };
    pointer('pointerdown'); advance(); const x = rendered.model!.x; expect(x).toBeLessThan(134);
    pointer('pointercancel'); advance(); expect(rendered.model!.x).toBe(x);
  });
  it('waits for artwork before advancing and offers retry on asset failure', async () => {
    rendered.ready = false; gate = new GameCaptcha('#captcha', { game: 'space' }); advance(100); expect(rendered.model!.elapsed).toBe(0);
    rendered.ready = true; advance(); expect(rendered.model!.elapsed).toBeGreaterThan(0); gate.destroy();
    rendered.loadError = true; gate = new GameCaptcha('#captcha', { game: 'space' });
    await Promise.resolve(); await Promise.resolve(); expect(gate.getSnapshot().state).toBe('failed'); expect(frames.size).toBe(0);
  });
  it('cannot verify when the final kill and fatal hit happen together', () => {
    const verify = vi.fn(); gate = new GameCaptcha('#captcha', { game: 'space', targetScore: 1, onVerify: verify });
    const model = rendered.model!; model.health = 1; model.invulnerable = 0; model.enemies[0].hp = 0;
    model.enemyShots = [{ x: model.x, y: model.y, vx: 0, vy: 0 }]; advance();
    expect(gate.getSnapshot().state).toBe('failed'); expect(verify).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
  });
  it.each(locales)('localizes the game and controls in %s', locale => {
    gate = new GameCaptcha('#captcha', { game: 'space', locale });
    expect(document.querySelector('.pg-widget')?.getAttribute('lang')).toBe(locale);
    expect(document.querySelector('canvas')?.getAttribute('aria-label')).toContain('1/3');
    const game = getGames(locale)[0]; expect(game.name).not.toBe(''); expect(game.instructions).not.toBe(''); expect(game.scoreUnit).not.toBe('');
  });
});
