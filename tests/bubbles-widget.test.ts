// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameCaptcha, getGames, registerGame } from '../src/core';
import { bubblesGame } from '../src/games/bubbles';
import { bubbleKey, type BubblesModel } from '../src/games/bubbles-model';
import { createTranslator, locales } from '../src/i18n';
import { bestBubbleAim, seededRandom } from './bubbles-player';

const rendered = vi.hoisted(() => ({ model: undefined as BubblesModel | undefined }));
vi.mock('../src/games/bubbles-renderer', () => ({ renderBubbles: (_ctx: unknown, model: BubblesModel) => { rendered.model = model; } }));
registerGame(bubblesGame);
let gate: GameCaptcha, clock = 0, id = 0, frames: Map<number, FrameRequestCallback>;
function advance(count = 12) {
  for (let i = 0; i < count; i++) { clock += 16; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(clock)); }
}
function key(type: string, code: string) {
  document.querySelector('.pg-widget')!.dispatchEvent(new KeyboardEvent(type, { key: 'Process', code, keyCode: 229, isComposing: true, bubbles: true, cancelable: true }));
}
function pointer(element: Element, type: string, x = 134, y = 80, pointerId = 1, pointerType = 'touch') {
  const event = new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true });
  Object.defineProperties(event, { pointerId: { value: pointerId }, pointerType: { value: pointerType } }); element.dispatchEvent(event);
}
beforeEach(() => {
  frames = new Map(); clock = 0; vi.spyOn(Math, 'random').mockImplementation(seededRandom(41));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ imageSmoothingEnabled: false } as CanvasRenderingContext2D);
  document.body.innerHTML = '<div id="captcha"></div>';
});
afterEach(() => { gate?.destroy(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Bubble shooter integration', () => {
  it('starts immediately, waits for the entire board and verifies exactly once through actual shots', () => {
    const verify = vi.fn(); gate = new GameCaptcha('#captcha', { game: 'bubbles', onVerify: verify });
    expect(gate.getSnapshot()).toMatchObject({ state: 'running', score: 0, targetScore: 1 });
    expect(document.querySelector('.pg-primary')).toBeNull();
    const model = rendered.model!;
    for (let shots = 0; shots < 80 && !model.complete && model.alive; shots++) {
      expect(verify).not.toHaveBeenCalled(); model.aim(bestBubbleAim(model));
      key('keydown', 'Space'); key('keyup', 'Space'); advance(125);
    }
    expect(model.bubbles.size).toBe(0); expect(gate.getSnapshot()).toMatchObject({ state: 'passed', score: 1 });
    expect(verify).toHaveBeenCalledOnce(); expect(frames.size).toBe(0); advance(50); expect(verify).toHaveBeenCalledOnce();
  });
  it('honors multi-board targets, retries from zero and rejects impossible values', () => {
    const verify = vi.fn(); gate = new GameCaptcha('#captcha', { game: 'bubbles', targetScore: 1, targets: { bubbles: 2 }, onVerify: verify });
    const model = rendered.model!;
    for (let shots = 0; shots < 120 && !model.complete && model.alive; shots++) {
      model.aim(bestBubbleAim(model)); key('keydown', 'Space'); key('keyup', 'Space'); advance(130);
      if (model.score < 2) expect(verify).not.toHaveBeenCalled();
    }
    expect(gate.getSnapshot()).toMatchObject({ state: 'passed', score: 2 }); expect(verify).toHaveBeenCalledOnce();
    document.querySelector<HTMLButtonElement>('.pg-restart')!.click();
    expect(gate.getSnapshot()).toMatchObject({ state: 'running', score: 0, targetScore: 2 }); expect(rendered.model).not.toBe(model);
    for (const value of [0, 6, 1.5]) expect(() => gate.reset({ targets: { bubbles: value } })).toThrow();
  });
  it('uses IME physical keys, fires once per press, and releases aim on blur', () => {
    gate = new GameCaptcha('#captcha', { game: 'bubbles' }); const model = rendered.model!;
    key('keydown', 'KeyD'); advance(); expect(model.angle).toBeGreaterThan(0);
    window.dispatchEvent(new Event('blur')); const angle = model.angle; advance(); expect(model.angle).toBe(angle);
    key('keydown', 'Space'); const flight = model.shot; expect(flight).toBeDefined();
    key('keydown', 'Space'); expect(model.shot).toBe(flight); advance(125); expect(model.shot).toBeUndefined();
    key('keydown', 'Space'); expect(model.shot).toBeUndefined(); key('keyup', 'Space'); key('keydown', 'Space'); expect(model.shot).toBeDefined();
  });
  it('aims on drag and shoots on release, cancelling gestures on cancel, blur or pause', () => {
    gate = new GameCaptcha('#captcha', { game: 'bubbles' }); const model = rendered.model!, canvas = document.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 268, bottom: 192, width: 268, height: 192, toJSON() {} });
    pointer(canvas, 'pointerdown'); pointer(canvas, 'pointermove', 200, 70); expect(model.angle).toBeGreaterThan(0); expect(model.shot).toBeUndefined();
    pointer(canvas, 'pointercancel'); pointer(canvas, 'pointerup'); expect(model.shot).toBeUndefined();
    pointer(canvas, 'pointerdown'); window.dispatchEvent(new Event('blur')); pointer(canvas, 'pointerup'); expect(model.shot).toBeUndefined();
    pointer(canvas, 'pointerdown'); gate.pause(); gate.resume(); pointer(canvas, 'pointerup'); expect(model.shot).toBeUndefined();
    pointer(canvas, 'pointerdown', 100, 70); pointer(canvas, 'pointerup', 100, 70); expect(model.shot).toBeDefined();
    expect(model.angle).toBeLessThan(0); expect(document.activeElement).toBe(document.querySelector('.pg-widget'));
  });
  it('supports touch controls without duplicate firing and stops movement after release', () => {
    gate = new GameCaptcha('#captcha', { game: 'bubbles' }); const model = rendered.model!;
    const [left, fire] = document.querySelectorAll<HTMLButtonElement>('.pg-controls button');
    pointer(left, 'pointerdown'); advance(); pointer(left, 'pointercancel'); const angle = model.angle;
    expect(angle).toBeLessThan(0); advance(); expect(model.angle).toBe(angle);
    pointer(fire, 'pointerdown'); pointer(fire, 'pointerup'); const shot = model.shot;
    fire.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true })); expect(model.shot).toBe(shot);
    advance(125); fire.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true })); expect(model.shot).toBeUndefined();
    fire.click(); expect(model.shot).toBeDefined(); // Keyboard activation has detail=0.
  });
  it('freezes an in-flight bubble while paused and cleans animation and pointer listeners on destroy', () => {
    gate = new GameCaptcha('#captcha', { game: 'bubbles' }); const model = rendered.model!, canvas = document.querySelector('canvas')!;
    key('keydown', 'Space'); key('keyup', 'Space'); advance(5); gate.pause(); const before = model.shot!.distance;
    advance(100); expect(model.shot!.distance).toBe(before); expect(frames.size).toBe(0);
    gate.resume(); advance(5); expect(model.shot!.distance).toBeGreaterThan(before);
    gate.destroy(); expect(frames.size).toBe(0); expect(document.querySelector('canvas')).toBeNull();
    const shot = model.shot; pointer(canvas, 'pointerdown'); pointer(canvas, 'pointerup'); expect(model.shot).toBe(shot);
  });
  it('fails at the danger line without verifying and offers a working retry', () => {
    const verify = vi.fn(); gate = new GameCaptcha('#captcha', { game: 'bubbles', onVerify: verify }); const model = rendered.model!;
    model.bubbles.clear(); for (let row = 0; row < 9; row++) model.bubbles.set(bubbleKey(row, 6), { row, col: 6, color: row % 2 });
    model.current = 2; model.aim(0); key('keydown', 'Space'); key('keyup', 'Space'); advance(125);
    expect(gate.getSnapshot().state).toBe('failed'); expect(verify).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
    document.querySelector<HTMLButtonElement>('.pg-primary')!.click();
    expect(gate.getSnapshot()).toMatchObject({ state: 'running', score: 0 }); expect(rendered.model!.bubbles.size).toBe(63);
  });
  it.each(locales)('localizes the name, controls and board in %s', locale => {
    gate = new GameCaptcha('#captcha', { game: 'bubbles', locale }); const t = createTranslator(locale);
    expect(document.querySelector('.pg-widget')?.getAttribute('lang')).toBe(locale);
    expect(document.querySelector('canvas')?.getAttribute('aria-label')).toContain('1/1');
    expect(document.querySelector('.pg-controls button')?.getAttribute('aria-label')).toBe(t('aimLeft'));
    expect(getGames(locale)[0]).toMatchObject({ name: t('bubbles'), scoreUnit: t('levels'), instructions: t('bubblesHelp') });
  });
});
