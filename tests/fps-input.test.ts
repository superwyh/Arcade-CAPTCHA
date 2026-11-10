// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameCaptcha, registerGame, getGames } from '../src/core';
import { fpsGame } from '../src/games/fps';
import type { FpsModel } from '../src/games/fps-model';

const rendered = vi.hoisted(() => ({ model: undefined as FpsModel | undefined }));
vi.mock('../src/games/fps-renderer', () => ({ FpsRenderer: class { render(model: FpsModel) { rendered.model = model; } } }));
registerGame(fpsGame);
let gate: GameCaptcha;
let root: HTMLElement;
let canvas: HTMLCanvasElement;
let clock = 0, next = 0;
let frames: Map<number, FrameRequestCallback>;
function advance(count = 12) {
  for (let i = 0; i < count; i++) {
    clock += 16; const pending = [...frames.values()]; frames.clear(); pending.forEach(frame => frame(clock));
  }
}
function key(type: string, key: string, code: string) { root.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true })); }
function pointer(type: string, x: number, pointerType = 'mouse') {
  const event = new MouseEvent(type, { clientX: x, button: 0, bubbles: true, cancelable: true });
  Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } }); canvas.dispatchEvent(event);
}
beforeEach(() => {
  frames = new Map(); clock = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++next, callback); return next; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ imageSmoothingEnabled: false } as CanvasRenderingContext2D);
  document.body.innerHTML = '<div id="captcha"></div><input id="outside">';
  gate = new GameCaptcha('#captcha', { game: 'fps' });
  root = document.querySelector('.pg-widget')!; canvas = document.querySelector('canvas')!; root.focus(); advance(1);
  rendered.model!.angle = 0;
});
afterEach(() => { gate.destroy(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('FPS input through the actual widget', () => {
  it('registers FPS once and localizes its name in all nine languages', () => {
    expect(getGames()).toHaveLength(1); expect(gate.getSnapshot().game).toBe('fps');
    for (const locale of ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'fr', 'de', 'es', 'pt']) expect(getGames(locale)[0].name).toBe('FPS');
  });
  it.each([['a', 'KeyA', -1], ['d', 'KeyD', 1], ['ArrowLeft', 'ArrowLeft', -1], ['ArrowRight', 'ArrowRight', 1], ['ф', 'KeyA', -1]] as const)('turns with %s and stops on release', (value, code, direction) => {
    const model = rendered.model!, position = [model.x, model.y];
    key('keydown', value, code); advance(); expect(model.angle * direction).toBeGreaterThan(.2);
    expect([model.x, model.y]).toEqual(position);
    key('keyup', value, code); const stopped = model.angle; advance(); expect(model.angle).toBe(stopped);
  });
  it('keeps Q/E strafing separate from turning', () => {
    const model = rendered.model!, startY = model.y;
    key('keydown', 'e', 'KeyE'); advance(); key('keyup', 'e', 'KeyE');
    expect(model.y).toBeGreaterThan(startY); expect(model.angle).toBe(0);
  });
  it.each(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter'])('handles IME Process events for %s and releases them normally', code => {
    const model = rendered.model!;
    const before = [model.x, model.y, model.angle, model.ammo];
    const ime = (type: string) => {
      const event = new KeyboardEvent(type, { key: 'Process', code, keyCode: 229, isComposing: true, bubbles: true, cancelable: true });
      root.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
    };
    ime('keydown'); advance(); expect([model.x, model.y, model.angle, model.ammo]).not.toEqual(before);
    ime('keyup'); const stopped = [model.x, model.y, model.angle, model.ammo]; advance(45);
    expect([model.x, model.y, model.angle, model.ammo]).toEqual(stopped);
  });
  it('stops held movement when an IME omits the key code on release', () => {
    key('keydown', 'Process', 'KeyD'); advance(); const stopped = rendered.model!.angle;
    root.dispatchEvent(new KeyboardEvent('keyup', { key: 'Process', keyCode: 229, bubbles: true }));
    advance(); expect(rendered.model!.angle).toBe(stopped);
  });
  it('releases keys on input-method shortcuts or composition start', () => {
    key('keydown', 'w', 'KeyW'); advance();
    root.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', ctrlKey: true, bubbles: true }));
    const model = rendered.model!, stopped = [model.x, model.y, model.ammo]; advance(45);
    expect([model.x, model.y, model.ammo]).toEqual(stopped);
    key('keydown', 'd', 'KeyD'); advance(); root.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    const angle = model.angle; advance(); expect(model.angle).toBe(angle);
  });
  it('looks with the mouse without holding fire, and ignores movement after focus loss', () => {
    const model = rendered.model!;
    pointer('pointerenter', 100); pointer('pointermove', 160);
    expect(model.angle).toBeCloseTo(.48); expect(model.ammo).toBe(32);
    document.querySelector<HTMLInputElement>('#outside')!.focus(); pointer('pointermove', 200); expect(model.angle).toBeCloseTo(.48);
    root.focus(); pointer('pointerenter', 50); pointer('pointermove', 40); expect(model.angle).toBeCloseTo(.4);
  });
  it('retains touch drag and cancels held shooting', () => {
    const model = rendered.model!;
    pointer('pointerdown', 100, 'touch'); pointer('pointermove', 140, 'touch');
    expect(model.angle).toBeCloseTo(.32); expect(model.ammo).toBe(31);
    pointer('pointercancel', 140, 'touch'); advance(60); expect(model.ammo).toBe(31);
  });
  it('retains mouse turning if an embedded browser rejects pointer lock', async () => {
    canvas.requestPointerLock = vi.fn().mockRejectedValue(new Error('Unsupported'));
    pointer('pointerdown', 100); pointer('pointerup', 100); await Promise.resolve();
    pointer('pointermove', 130); expect(rendered.model!.angle).toBeCloseTo(.24);
    expect(canvas.requestPointerLock).toHaveBeenCalledOnce();
  });
  it('uses relative mouse motion while locked and releases lock on pause', () => {
    let locked: Element | null = canvas;
    Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => locked });
    document.exitPointerLock = vi.fn(() => { locked = null; });
    const move = new MouseEvent('mousemove'); Object.defineProperty(move, 'movementX', { value: 40 }); document.dispatchEvent(move);
    expect(rendered.model!.angle).toBeCloseTo(.32);
    gate.pause(); expect(document.exitPointerLock).toHaveBeenCalledOnce(); expect(locked).toBeNull();
    delete (document as unknown as Record<string, unknown>).pointerLockElement;
    delete (document as unknown as Record<string, unknown>).exitPointerLock;
  });
  it('clears movement and document handlers when reset or destroyed', () => {
    key('keydown', 'd', 'KeyD'); advance(); const previous = rendered.model!;
    gate.reset(); const initial = rendered.model!.angle; advance(); expect(rendered.model!.angle).toBe(initial);
    const stopped = previous.angle; advance(); expect(previous.angle).toBe(stopped);
    gate.destroy(); expect(frames.size).toBe(0);
  });
});
