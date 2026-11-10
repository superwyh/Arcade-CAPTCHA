// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameCaptcha, getGames, registerGame } from '../src/core';
import { adventureGame } from '../src/games/adventure';
import type { AdventureModel } from '../src/games/adventure-model';

const rendered = vi.hoisted(() => ({ model: undefined as AdventureModel | undefined }));
vi.mock('../src/games/adventure-renderer', () => ({ AdventureRenderer: class {
  ready = true; loaded = Promise.resolve(); render(model: AdventureModel) { rendered.model = model; }
} }));
registerGame(adventureGame);
let gate: GameCaptcha, clock = 0, id = 0;
let frames: Map<number, FrameRequestCallback>;
function advance(count = 12) {
  for (let i = 0; i < count; i++) { clock += 16; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(clock)); }
}
function exitDungeon() {
  const model = rendered.model!; model.roomId = 1; model.bossUnlocked = true; model.room.enemies = []; model.x = 7.5; model.y = 2; advance(1);
}
beforeEach(() => {
  frames = new Map(); clock = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ imageSmoothingEnabled: false } as CanvasRenderingContext2D);
  document.body.innerHTML = '<div id="captcha"></div>';
});
afterEach(() => { gate?.destroy(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Adventure integration', () => {
  it('starts immediately and verifies once only after the dungeon exit', () => {
    const verify = vi.fn(); gate = new GameCaptcha('#captcha', { game: 'adventure', onVerify: verify });
    expect(gate.getSnapshot()).toMatchObject({ state: 'running', targetScore: 1 });
    expect(document.querySelector('.pg-primary')).toBeNull();
    rendered.model!.room.enemies = []; advance(); expect(verify).not.toHaveBeenCalled();
    exitDungeon(); advance(); expect(verify).toHaveBeenCalledOnce();
    expect(gate.getSnapshot()).toMatchObject({ state: 'passed', score: 1 }); expect(frames.size).toBe(0);
  });
  it('supports developer targets and clean resets', () => {
    gate = new GameCaptcha('#captcha', { game: 'adventure', targetScore: 2 });
    exitDungeon(); expect(gate.getSnapshot()).toMatchObject({ state: 'running', score: 1 });
    exitDungeon(); expect(gate.getSnapshot().state).toBe('passed');
    gate.reset(); expect(gate.getSnapshot()).toMatchObject({ state: 'running', score: 0, targetScore: 2 });
    expect(rendered.model!.roomId).toBe(7); expect(rendered.model!.swordLevel).toBe(1);
    expect(() => gate.reset({ targetScore: 4 })).toThrow();
  });
  it('handles physical movement and attack keys under a Chinese IME, then releases on blur', () => {
    gate = new GameCaptcha('#captcha', { game: 'adventure' });
    const root = document.querySelector('.pg-widget')!, model = rendered.model!, startY = model.y;
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Process', code: 'KeyW', keyCode: 229, isComposing: true, bubbles: true }));
    advance(); expect(model.y).toBeLessThan(startY);
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Process', code: 'Space', keyCode: 229, isComposing: true, bubbles: true }));
    advance(); expect(model.cooldown).toBeGreaterThan(0);
    window.dispatchEvent(new Event('blur')); const stopped = model.y; advance(50); expect(model.y).toBe(stopped); expect(model.swing).toBe(0);
    gate.destroy(); expect(frames.size).toBe(0);
  });
  it('handles touch holds without leaving movement active after pointer cancellation', () => {
    gate = new GameCaptcha('#captcha', { game: 'adventure' });
    const up = document.querySelector<HTMLButtonElement>('.pg-controls button:nth-child(2)')!;
    const pointer = (type: string) => { const event = new Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(event, 'pointerId', { value: 4 }); up.dispatchEvent(event); };
    pointer('pointerdown'); advance(); const y = rendered.model!.y; expect(y).toBeLessThan(6.5);
    pointer('pointercancel'); advance(); expect(rendered.model!.y).toBe(y);
  });
  it('localizes the new name, help and attack control in every supported language', () => {
    for (const locale of ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'fr', 'de', 'es', 'pt']) {
      const game = getGames(locale)[0]; expect(game.name).not.toBe(''); expect(game.instructions).not.toBe(''); expect(game.controls[4].label).not.toBe('');
    }
    expect(getGames('zh-CN')[0].name).toBe('冒险'); expect(getGames('zh-TW')[0].name).toBe('冒險');
  });
});
