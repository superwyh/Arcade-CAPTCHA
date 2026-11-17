// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mountLoginDemo } from '../demo/login';
import { createTranslator, resolveLocale, locales } from '../src/i18n';

let destroy, instances, createCaptcha, dialog;
const node = id => document.getElementById(id);
const submit = () => node('login-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
function mount() {
  const locale = resolveLocale(new URLSearchParams(location.search).get('lang') || 'en');
  destroy = mountLoginDemo(node('login-preview'), locale, { createCaptcha, getGames: () => [{ id: '2048' }, { id: 'sokoban' }] });
  dialog = node('verification-dialog');
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.dispatchEvent(new Event('close')); };
}
function pass(instance = instances.at(-1)) {
  instance.state = 'passed'; instance.options.onStateChange({ state: 'passed' }); instance.options.onVerify();
}
beforeEach(() => {
  vi.useFakeTimers();
  history.replaceState(null, '', '/examples/login.html?lang=zh-CN');
  document.body.innerHTML = '<div id="login-preview" class="login-demo"></div>';
  document.documentElement.lang = 'fr';
  document.title = 'Host page';
  instances = [];
  createCaptcha = vi.fn((host, options) => {
    const root = document.createElement('section'); root.className = 'pg-widget'; root.tabIndex = 0; host.append(root);
    const instance = { options, state: 'running', getSnapshot() { return { state: this.state }; }, destroy: vi.fn(() => root.remove()) };
    instances.push(instance); return instance;
  });
});
afterEach(() => { destroy?.(); destroy = undefined; vi.useRealTimers(); vi.restoreAllMocks(); });

describe('embedded login demo', () => {
  it('validates fields before opening a challenge', () => {
    mount(); node('email').value = 'invalid'; submit();
    expect(createCaptcha).not.toHaveBeenCalled(); expect(dialog.open).toBe(false);
    node('email').value = 'demo@example.com'; node('password').value = ''; submit();
    expect(createCaptcha).not.toHaveBeenCalled();
  });
  it('focuses the game and destroys it on cancellation, then creates a fresh challenge', () => {
    mount(); submit();
    expect(dialog.open).toBe(true); expect(['2048', 'sokoban']).toContain(instances[0].options.game);
    expect(document.activeElement.className).toBe('pg-widget');
    node('close-dialog').click();
    expect(instances[0].destroy).toHaveBeenCalledOnce(); expect(node('account-panel').hidden).toBe(true);
    expect(document.activeElement).toBe(node('login-button'));
    submit(); expect(instances).toHaveLength(2);
    expect(instances[1].options.game).not.toBe(instances[0].options.game);
  });
  it.each([[0, '2048'], [0.99, 'sokoban']])('defaults to English and chooses from the game pool (%s)', (random, game) => {
    history.replaceState(null, '', '/examples/login.html');
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['zh-CN']);
    vi.spyOn(Math, 'random').mockReturnValue(random);
    mount(); submit();
    expect(document.documentElement.lang).toBe('fr');
    expect(document.title).toBe('Host page');
    expect(node('login-title').textContent).toBe('Sign in');
    expect(node('another-game')).toBeNull();
    expect(instances[0].options.locale).toBe('en');
    expect(instances[0].options.game).toBe(game);
  });
  it('logs in only after a verified pass, clears the password, and requires verification after logout', () => {
    mount(); submit(); instances[0].options.onVerify(); vi.advanceTimersByTime(500);
    expect(node('account-panel').hidden).toBe(true);
    pass(); vi.advanceTimersByTime(500);
    expect(dialog.open).toBe(false); expect(node('login-panel').hidden).toBe(true);
    expect(node('account-panel').hidden).toBe(false); expect(node('account-email').textContent).toBe('demo@example.com');
    expect(node('password').value).toBe(''); expect(instances[0].destroy).toHaveBeenCalledOnce();
    node('logout-button').click();
    expect(node('login-panel').hidden).toBe(false); submit();
    expect(instances).toHaveLength(2); expect(node('account-panel').hidden).toBe(true);
  });
  it('cancels delayed completion when the modal closes or the game is restarted', () => {
    mount(); submit(); pass(); dialog.close(); vi.advanceTimersByTime(1000);
    expect(node('account-panel').hidden).toBe(true);
    submit(); pass(); instances[1].state = 'running'; instances[1].options.onStateChange({ state: 'running' });
    vi.advanceTimersByTime(1000); expect(node('account-panel').hidden).toBe(true); expect(dialog.open).toBe(true);
  });
  it('ignores callbacks from a previous challenge', () => {
    mount(); submit(); const old = instances[0]; dialog.close(); submit();
    pass(old); vi.advanceTimersByTime(1000); expect(node('account-panel').hidden).toBe(true);
    pass(); old.options.onStateChange({ state: 'running' }); vi.advanceTimersByTime(500);
    expect(node('account-panel').hidden).toBe(false);
  });
  it('keeps old game-specific links random and releases the challenge when leaving the page', () => {
    history.replaceState(null, '', '/examples/login.html?game=sokoban&lang=zh-CN');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mount(); submit(); expect(instances[0].options.game).toBe('2048');
    pass(); window.dispatchEvent(new Event('pagehide')); vi.advanceTimersByTime(1000);
    expect(instances[0].destroy).toHaveBeenCalledOnce(); expect(dialog.open).toBe(false);
    expect(node('account-panel').hidden).toBe(true);
  });
  it.each(locales)('localizes the login and dialog controls in %s', locale => {
    history.replaceState(null, '', `/examples/login.html?lang=${locale}`); mount();
    expect(document.documentElement.lang).toBe('fr');
    submit(); expect(instances[0].options.locale).toBe(locale);
    document.querySelectorAll('[data-copy]').forEach(element => expect(element.textContent).not.toBe(''));
    expect(node('verification-title').textContent).toBe(createTranslator(locale)('widget'));
    node('toggle-password').click(); expect(node('password').type).toBe('text');
    expect(node('toggle-password').getAttribute('aria-pressed')).toBe('true');
  });
});
