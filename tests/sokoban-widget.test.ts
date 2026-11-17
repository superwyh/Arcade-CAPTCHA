// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameCaptcha, registerGame, getGames } from '../src/core';
import { sokobanGame } from '../src/games/sokoban';
import { SOKOBAN_LEVELS, type SokobanDirection, type SokobanModel } from '../src/games/sokoban-model';
import { createTranslator, locales } from '../src/i18n';
import { solveSokoban } from './sokoban-solver';

const rendered = vi.hoisted(() => ({ model: undefined as SokobanModel | undefined }));
vi.mock('../src/games/sokoban-renderer', () => ({ renderSokoban: (_ctx: unknown, model: SokobanModel) => { rendered.model = model; } }));
registerGame(sokobanGame);
let gate: GameCaptcha;
const keys = { left: 'ArrowLeft', up: 'ArrowUp', right: 'ArrowRight', down: 'ArrowDown', undo: 'KeyZ' };
const key = (direction: SokobanDirection | 'undo') => document.querySelector('.pg-widget')!.dispatchEvent(new KeyboardEvent('keydown', { key: keys[direction], code: keys[direction], bubbles: true }));
const solutions = SOKOBAN_LEVELS.map(solveSokoban);
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ imageSmoothingEnabled: false } as CanvasRenderingContext2D);
  document.body.innerHTML = '<div id="captcha"></div>';
});
afterEach(() => { gate?.destroy(); vi.restoreAllMocks(); });

describe('Sokoban integration', () => {
  it('starts immediately and verifies once only after every box is placed', () => {
    const verify = vi.fn(); gate = new GameCaptcha('#captcha', { game: 'sokoban', onVerify: verify });
    expect(gate.getSnapshot()).toMatchObject({ state: 'running', targetScore: 1, score: 0 });
    expect(document.querySelector('.pg-primary')).toBeNull();
    const steps = solutions[0];
    steps.slice(0, -1).forEach(direction => { key(direction); expect(verify).not.toHaveBeenCalled(); });
    key(steps.at(-1)!); expect(gate.getSnapshot()).toMatchObject({ state: 'passed', score: 1 });
    expect(verify).toHaveBeenCalledOnce(); key('undo'); key('left');
    expect(verify).toHaveBeenCalledOnce(); expect(rendered.model!.complete).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('.pg-undo')!.disabled).toBe(true);
  });
  it('completes five different levels without allowing undo to duplicate progress', () => {
    const verify = vi.fn(); gate = new GameCaptcha('#captcha', { game: 'sokoban', targets: { sokoban: 5 }, onVerify: verify });
    solutions.forEach((steps, level) => {
      expect(rendered.model!.layout).toBe(SOKOBAN_LEVELS[level]); expect(rendered.model!.moves).toBe(0);
      key('undo'); expect(gate.getSnapshot().score).toBe(level);
      steps.forEach(key); expect(gate.getSnapshot().score).toBe(level + 1);
      expect(gate.getSnapshot().state).toBe(level === 4 ? 'passed' : 'running');
    });
    expect(verify).toHaveBeenCalledOnce();
  });
  it('supports physical IME keys and the toolbar undo without taking browser shortcuts', () => {
    gate = new GameCaptcha('#captcha', { game: 'sokoban' });
    const root = document.querySelector('.pg-widget')!, model = rendered.model!;
    const ime = (code: string, ctrlKey = false) => root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Process', code, keyCode: 229, isComposing: true, ctrlKey, bubbles: true, cancelable: true }));
    ime('KeyD'); expect(model.player).toEqual({ x: 3, y: 5 });
    ime('KeyZ', true); expect(model.moves).toBe(1);
    ime('KeyZ'); expect(model.player).toEqual({ x: 2, y: 5 });
    ime('KeyW'); document.querySelector<HTMLButtonElement>('.pg-undo')!.click(); expect(model.moves).toBe(0);
    expect(document.activeElement).toBe(root);
    expect(document.querySelectorAll('.pg-controls button')).toHaveLength(4);
  });
  it('supports touch buttons, swipes, cancelled swipes and retry', () => {
    gate = new GameCaptcha('#captcha', { game: 'sokoban', locale: 'en' });
    document.querySelector<HTMLButtonElement>('.pg-controls [aria-label="Right"]')!.click();
    expect(rendered.model!.player).toEqual({ x: 3, y: 5 });
    const canvas = document.querySelector('canvas')!;
    const pointer = (type: string, x: number, y: number) => canvas.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
    pointer('pointerdown', 50, 50); pointer('pointerup', 50, 10);
    expect(rendered.model!.player).toEqual({ x: 3, y: 4 });
    pointer('pointerdown', 50, 50); pointer('pointercancel', 50, 50); pointer('pointerup', 90, 50);
    expect(rendered.model!.moves).toBe(2);
    document.querySelector<HTMLButtonElement>('.pg-restart')!.click();
    expect(rendered.model!.player).toEqual({ x: 2, y: 5 }); expect(rendered.model!.moves).toBe(0);
    expect(gate.getSnapshot()).toMatchObject({ state: 'running', score: 0 });
    pointer('pointerdown', 50, 50); pointer('pointerup', 90, 50); expect(rendered.model!.moves).toBe(0); // Old canvas is inert.
  });
  it('freezes paused sessions, resumes, and clears old inputs on destroy', () => {
    gate = new GameCaptcha('#captcha', { game: 'sokoban' }); const model = rendered.model!;
    gate.pause(); key('left'); expect(model.moves).toBe(0);
    expect(document.querySelector<HTMLButtonElement>('.pg-undo')!.disabled).toBe(true);
    gate.resume(); key('left'); expect(model.moves).toBe(1);
    const root = document.querySelector('.pg-widget')!; gate.destroy();
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', code: 'ArrowLeft', bubbles: true }));
    expect(model.moves).toBe(1); expect(document.querySelector('canvas')).toBeNull();
  });
  it('honors per-game targets and rejects impossible or fractional level counts', () => {
    gate = new GameCaptcha('#captcha', { game: 'sokoban', targetScore: 2, targets: { sokoban: 3 } });
    expect(gate.getSnapshot().targetScore).toBe(3);
    for (const targetScore of [0, 6, 1.5]) expect(() => gate.reset({ targets: undefined, targetScore })).toThrow();
    expect(gate.getSnapshot().targetScore).toBe(3);
  });
  it.each(locales)('localizes the game, board and undo in %s', locale => {
    gate = new GameCaptcha('#captcha', { game: 'sokoban', locale }); const t = createTranslator(locale);
    expect(document.querySelector('.pg-widget')?.getAttribute('lang')).toBe(locale);
    expect(document.querySelector('canvas')?.getAttribute('aria-label')).toContain('1/1');
    expect(document.querySelector('.pg-undo')?.getAttribute('aria-label')).toBe(t('undo'));
    expect(getGames(locale)[0]).toMatchObject({ name: t('sokoban'), scoreUnit: t('levels'), instructions: t('sokobanHelp') });
  });
});
