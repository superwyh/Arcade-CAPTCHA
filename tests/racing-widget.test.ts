// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameCaptcha, registerGame } from '../src/core';
import { racingGame } from '../src/games/racing';
import type { RacingModel } from '../src/games/racing-model';

const rendered = vi.hoisted(() => ({ model: undefined as RacingModel | undefined }));
vi.mock('../src/games/racing-renderer', () => ({ RacingRenderer: class {
  ready = true; loaded = Promise.resolve(); render(model: RacingModel) { rendered.model = model; }
} }));
registerGame(racingGame);
let gate: GameCaptcha, clock = 0, id = 0;
let frames: Map<number, FrameRequestCallback>;
function advance(count = 12) {
  for (let i = 0; i < count; i++) { clock += 16; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(clock)); }
}
beforeEach(() => {
  frames = new Map(); clock = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ imageSmoothingEnabled: false } as CanvasRenderingContext2D);
  document.body.innerHTML = '<div id="captcha"></div>';
});
afterEach(() => { gate?.destroy(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Racing integration', () => {
  it('starts automatically, uses the configured finish, verifies once and resets cleanly', () => {
    const verify = vi.fn(); gate = new GameCaptcha('#captcha', { game: 'racing', targetScore: 30, onVerify: verify });
    expect(gate.getSnapshot()).toMatchObject({ state: 'running', targetScore: 30 });
    expect(rendered.model!.target).toBe(30); expect(document.querySelector('.pg-primary')).toBeNull();
    advance(100); expect(gate.getSnapshot()).toMatchObject({ state: 'passed', score: 30 });
    advance(100); expect(verify).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
    gate.reset({ targets: { racing: 60 } }); expect(rendered.model!.target).toBe(60);
    expect(gate.getSnapshot()).toMatchObject({ state: 'running', score: 0, targetScore: 60 });
    expect(() => gate.reset({ targets: { racing: 10001 } })).toThrow();
  });
  it('recognizes IME physical keys and releases movement on blur', () => {
    gate = new GameCaptcha('#captcha', { game: 'racing' });
    const root = document.querySelector('.pg-widget')!, model = rendered.model!;
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Process', code: 'KeyD', keyCode: 229, isComposing: true, bubbles: true }));
    advance(); expect(model.x).toBeGreaterThan(0);
    window.dispatchEvent(new Event('blur')); const x = model.x; advance(20); expect(model.x).toBe(x);
    gate.destroy(); expect(frames.size).toBe(0);
  });
  it('releases held touch controls on pointer cancellation', () => {
    gate = new GameCaptcha('#captcha', { game: 'racing' });
    const left = document.querySelector<HTMLButtonElement>('.pg-controls button')!;
    const pointer = (type: string) => { const event = new Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(event, 'pointerId', { value: 4 }); left.dispatchEvent(event); };
    pointer('pointerdown'); advance(); const x = rendered.model!.x; expect(x).toBeLessThan(0);
    pointer('pointercancel'); advance(); expect(rendered.model!.x).toBe(x);
  });
  it('fails before reporting the finish when the final collision is fatal', () => {
    const verify = vi.fn(); gate = new GameCaptcha('#captcha', { game: 'racing', targetScore: 1, onVerify: verify });
    const model = rendered.model!; model.health = 1; model.cars = [{ x: 0, distance: 1, sprite: 4, hit: false }];
    advance(); expect(gate.getSnapshot().state).toBe('failed'); expect(verify).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
  });
});
