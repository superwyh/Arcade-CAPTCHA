// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameCaptcha, registerGame } from '../src/core';
import type { GameContext, GameSession } from '../src/types';
import { mergeGame } from '../src/games/merge';
import { minesweeperGame } from '../src/games/minesweeper';
import { MineBoard } from '../src/games/minesweeper';

let context: GameContext;
let session: GameSession;
registerGame({
  id: 'test-game', name: 'Test game', description: 'test', instructions: 'test', defaultTarget: 10, maxTarget: 100, scoreUnit: '分', controls: [],
  create(next) {
    context = next;
    session = { start: vi.fn(), pause: vi.fn(), resume: vi.fn(), destroy: vi.fn(), action: vi.fn() };
    return session;
  },
});
registerGame(mergeGame); registerGame(minesweeperGame);
registerGame({
  id: 'held-game', name: 'Held input', description: '', instructions: '', defaultTarget: 10, scoreUnit: '',
  keys: { w: 'up', ' ': 'fire' }, controls: [{ action: 'up', symbol: '↑', label: 'Forward' }],
  create(next) {
    context = next;
    session = { start: vi.fn(), pause: vi.fn(), resume: vi.fn(), destroy: vi.fn(), action: vi.fn(), setInput: vi.fn() };
    return session;
  },
});
beforeEach(() => { document.body.replaceChildren(); const host = document.createElement('div'); host.id = 'captcha'; document.body.append(host); });

describe('unified verification lifecycle', () => {
  it('does not capture text entry inside a custom game', () => {
    const gate = new GameCaptcha('#captcha', { game: 'held-game' });
    const root = document.querySelector<HTMLElement>('.pg-widget')!;
    for (const tag of ['input', 'textarea', 'div']) {
      const input = document.createElement(tag);
      if (tag === 'div') input.setAttribute('contenteditable', 'true');
      root.append(input); input.focus();
      const event = new KeyboardEvent('keydown', { key: 'Process', code: 'KeyW', keyCode: 229, isComposing: true, bubbles: true, cancelable: true });
      input.dispatchEvent(event); expect(event.defaultPrevented).toBe(false);
      expect(session.setInput).not.toHaveBeenCalled();
    }
    gate.destroy();
  });
  it('keeps native space activation on the restart button', () => {
    const gate = new GameCaptcha('#captcha', { game: 'held-game' });
    const button = document.querySelector<HTMLButtonElement>('.pg-restart')!;
    button.focus();
    for (const type of ['keydown', 'keyup']) {
      const event = new KeyboardEvent(type, { key: ' ', code: 'Space', bubbles: true, cancelable: true });
      button.dispatchEvent(event); expect(event.defaultPrevented).toBe(false);
    }
    expect(session.setInput).not.toHaveBeenCalled(); gate.destroy();
  });
  it('resolves arrow and space defaults during IME composition for discrete games', () => {
    const gate = new GameCaptcha('#captcha', { game: 'test-game' });
    const root = document.querySelector('.pg-widget')!;
    for (const [code, action] of [['ArrowLeft', 'left'], ['ArrowUp', 'up'], ['Space', 'drop']]) {
      const event = new KeyboardEvent('keydown', { key: 'Process', code, keyCode: 229, isComposing: true, bubbles: true, cancelable: true });
      root.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
      expect(session.action).toHaveBeenLastCalledWith(action);
    }
    gate.destroy();
  });
  it('supports held per-game keys and releases them without losing another key for the same action', () => {
    const gate = new GameCaptcha('#captcha', { game: 'held-game' });
    const root = document.querySelector<HTMLElement>('.pg-widget')!;
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', bubbles: true }));
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp', bubbles: true }));
    expect(session.setInput).toHaveBeenCalledWith('up', true); expect(session.action).not.toHaveBeenCalled();
    vi.mocked(session.setInput!).mockClear();
    root.dispatchEvent(new KeyboardEvent('keyup', { key: 'w', code: 'KeyW', bubbles: true }));
    expect(session.setInput).not.toHaveBeenCalled();
    root.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp', code: 'ArrowUp', bubbles: true }));
    expect(session.setInput).toHaveBeenCalledWith('up', false);
    root.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    expect(session.setInput).toHaveBeenCalledWith('fire', true);
    gate.destroy(); expect(session.setInput).toHaveBeenLastCalledWith('fire', false);
  });
  it('releases held movement on focus loss, backgrounding and restart', () => {
    const gate = new GameCaptcha('#captcha', { game: 'held-game' }); const root = document.querySelector<HTMLElement>('.pg-widget')!;
    const down = () => root.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', bubbles: true }));
    down(); window.dispatchEvent(new Event('blur')); expect(session.setInput).toHaveBeenLastCalledWith('up', false);
    down(); const outside = document.createElement('input'); document.body.append(outside); outside.focus();
    expect(session.setInput).toHaveBeenLastCalledWith('up', false);
    root.focus(); down(); gate.pause(); expect(session.setInput).toHaveBeenLastCalledWith('up', false);
    gate.resume(); down(); const old = session; gate.reset();
    expect(old.setInput).toHaveBeenLastCalledWith('up', false); expect(old.destroy).toHaveBeenCalledOnce(); gate.destroy();
  });
  it('supports touch holds and releases canceled pointers', () => {
    const gate = new GameCaptcha('#captcha', { game: 'held-game' }); const button = document.querySelector('.pg-controls button')!;
    const pointer = (type: string) => { const event = new Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(event, 'pointerId', { value: 7 }); button.dispatchEvent(event); };
    pointer('pointerdown'); expect(session.setInput).toHaveBeenLastCalledWith('up', true);
    pointer('pointercancel'); expect(session.setInput).toHaveBeenLastCalledWith('up', false);
    pointer('pointerdown'); pointer('lostpointercapture'); expect(session.setInput).toHaveBeenLastCalledWith('up', false);
    gate.destroy();
  });
  it('starts on mount and reset without a start button', () => {
    const gate = new GameCaptcha('#captcha', { game: 'test-game' });
    expect(gate.getSnapshot().state).toBe('running');
    expect(session.start).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.pg-primary')).toBeNull();
    gate.reset();
    expect(gate.getSnapshot().state).toBe('running');
    expect(session.start).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.pg-primary')).toBeNull();
    gate.destroy();
  });
  it('does not steal focus from a configuration input on automatic reset', () => {
    const input = document.createElement('input'); document.body.append(input); input.focus();
    const gate = new GameCaptcha('#captcha', { game: 'test-game' });
    expect(document.activeElement).toBe(input);
    gate.reset({ targetScore: 20 });
    expect(document.activeElement).toBe(input);
    expect(gate.getSnapshot()).toMatchObject({ state: 'running', targetScore: 20 });
    gate.destroy();
  });
  it('keeps the gate locked until its target, then verifies once', () => {
    const verify = vi.fn(); const gate = new GameCaptcha('#captcha', { game: 'test-game', autoStart: false, onVerify: verify });
    context.reportScore(100); expect(gate.getSnapshot().state).toBe('idle');
    gate.start(); context.reportScore(9); expect(verify).not.toHaveBeenCalled();
    context.reportScore(10); context.reportScore(20); expect(verify).toHaveBeenCalledTimes(1);
    expect(verify.mock.calls[0][0]).toMatchObject({ game: 'test-game', score: 10, targetScore: 10 });
    expect(gate.getSnapshot().state).toBe('passed'); expect(session.pause).toHaveBeenCalled(); gate.destroy();
  });
  it('ignores stale scores from sessions that were reset or destroyed', () => {
    const verify = vi.fn(); const gate = new GameCaptcha('#captcha', { game: 'test-game', onVerify: verify });
    gate.start(); const old = context; const oldSession = session; gate.reset(); gate.start();
    old.reportScore(100); expect(verify).not.toHaveBeenCalled(); expect(oldSession.destroy).toHaveBeenCalledTimes(1);
    gate.destroy(); context.reportScore(100); expect(verify).not.toHaveBeenCalled(); expect(document.querySelector('.pg-widget')).toBeNull();
  });
  it('pauses gameplay and scoring, then resumes the same session', () => {
    const gate = new GameCaptcha('#captcha', { game: 'test-game' }); gate.start(); context.reportScore(4); gate.pause();
    context.reportScore(10); expect(gate.getSnapshot()).toMatchObject({ state: 'paused', score: 4 });
    gate.resume(); expect(session.resume).toHaveBeenCalledTimes(1); context.reportScore(10); expect(gate.getSnapshot().state).toBe('passed'); gate.destroy();
  });
  it('records active play time without paused time', () => {
    const now = vi.spyOn(performance, 'now'); const verify = vi.fn(); now.mockReturnValue(100);
    const gate = new GameCaptcha('#captcha', { game: 'test-game', onVerify: verify }); gate.start();
    now.mockReturnValue(600); gate.pause(); now.mockReturnValue(10600); gate.resume();
    now.mockReturnValue(11100); context.reportScore(10);
    expect(verify.mock.calls[0][0].durationMs).toBe(1000); gate.destroy(); now.mockRestore();
  });
  it('fails without verifying and permits a clean restart', () => {
    const verify = vi.fn(); const gate = new GameCaptcha('#captcha', { game: 'test-game', onVerify: verify }); gate.start(); context.fail('Oops');
    context.reportScore(10); expect(verify).not.toHaveBeenCalled(); expect(gate.getSnapshot().state).toBe('failed');
    document.querySelector<HTMLButtonElement>('.pg-primary')!.click(); expect(gate.getSnapshot()).toMatchObject({ state: 'running', score: 0 }); gate.destroy();
  });
  it('rejects invalid or unreachable targets without discarding an active session', () => {
    for (const targetScore of [0, -1, 101, NaN, Infinity, 1.5]) expect(() => new GameCaptcha('#captcha', { game: 'test-game', targetScore })).toThrow();
    const gate = new GameCaptcha('#captcha', { game: 'test-game' }); gate.start();
    expect(() => gate.reset({ targetScore: 101 })).toThrow(); expect(gate.getSnapshot().state).toBe('running'); gate.destroy();
  });
  it('applies per-game targets and resets verification on game change', () => {
    const gate = new GameCaptcha('#captcha', { game: 'test-game', targetScore: 9, targets: { 'test-game': 5 } });
    expect(gate.getSnapshot().targetScore).toBe(5); gate.start(); context.reportScore(5);
    gate.reset({ game: '2048', targetScore: 128 }); expect(gate.getSnapshot()).toEqual({ state: 'running', game: '2048', score: 0, targetScore: 128 }); gate.destroy();
  });
  it('uses defaults for randomly selected games', () => {
    const gate = new GameCaptcha('#captcha', { game: 'random' });
    for (let i = 0; i < 10; i++) { gate.reset(); const snapshot = gate.getSnapshot(); expect(snapshot.targetScore).toBe(snapshot.game === '2048' ? 128 : snapshot.game === 'minesweeper' ? 40 : 10); }
    gate.destroy();
  });
  it('does not intercept keyboard events outside its instance', () => {
    const gate = new GameCaptcha('#captcha', { game: 'test-game' }); gate.start();
    const outside = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }); document.body.dispatchEvent(outside);
    expect(outside.defaultPrevented).toBe(false); expect(session.action).not.toHaveBeenCalled();
    const inside = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }); document.querySelector('.pg-widget')!.dispatchEvent(inside);
    expect(inside.defaultPrevented).toBe(true); expect(session.action).toHaveBeenCalledWith('left'); gate.destroy();
  });
  it('isolates multiple instances on one page', () => {
    const a = new GameCaptcha('#captcha', { game: 'test-game' }); const contextA = context;
    const b = new GameCaptcha('#captcha', { game: 'test-game' }); const contextB = context;
    a.start(); b.start(); contextA.reportScore(10); contextB.reportScore(3);
    expect(a.getSnapshot().state).toBe('passed'); expect(b.getSnapshot()).toMatchObject({ state: 'running', score: 3 }); a.destroy(); b.destroy();
  });
  it('automatically resumes a hidden page, but preserves an explicit API pause', () => {
    const gate = new GameCaptcha('#captcha', { game: 'test-game' }); gate.start();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange'));
    expect(gate.getSnapshot().state).toBe('paused');
    hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange'));
    expect(gate.getSnapshot().state).toBe('running');
    gate.pause();
    hidden.mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange'));
    hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange'));
    expect(gate.getSnapshot().state).toBe('paused');
    gate.destroy(); hidden.mockRestore();
  });
  it('verifies actual Minesweeper gameplay through the same framework', () => {
    const verify = vi.fn(); const gate = new GameCaptcha('#captcha', { game: 'minesweeper', targetScore: 1, onVerify: verify }); gate.start();
    document.querySelector<HTMLButtonElement>('.pg-mine-cell')!.click(); expect(verify).toHaveBeenCalledTimes(1); expect(gate.getSnapshot().state).toBe('passed'); gate.destroy();
  });
  it('requires every safe cell for the default Minesweeper challenge', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(.37);
    const board = new MineBoard(() => .37); board.reveal(0);
    const verify = vi.fn(); const gate = new GameCaptcha('#captcha', { game: 'minesweeper', onVerify: verify });
    const cells = [...document.querySelectorAll<HTMLButtonElement>('.pg-mine-cell')];
    cells[0].click(); expect(gate.getSnapshot().state).toBe('running');
    for (let index = 0; index < 48; index++) {
      if (board.mines.has(index)) continue;
      board.reveal(index); cells[index].click();
      expect(gate.getSnapshot().state).toBe(board.revealed.size === 40 ? 'passed' : 'running');
    }
    expect(verify).toHaveBeenCalledTimes(1); expect(gate.getSnapshot().score).toBe(40);
    gate.destroy(); random.mockRestore();
  });
  it('ignores invalid and decreasing score reports', () => {
    const gate = new GameCaptcha('#captcha', { game: 'test-game' }); gate.start(); context.reportScore(5);
    context.reportScore(NaN); context.reportScore(Infinity); context.reportScore(2);
    expect(gate.getSnapshot().score).toBe(5); gate.destroy();
  });
});
