// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createTranslator, locales, messages, resolveLocale } from '../src/i18n';
import { GameCaptcha, registerGame } from '../src/core';
import { minesweeperGame } from '../src/games/minesweeper';

registerGame(minesweeperGame);

describe('locale selection', () => {
  it.each([
    ['zh', 'zh-CN'], ['zh-SG', 'zh-CN'], ['zh-Hans-TW', 'zh-CN'],
    ['zh-TW', 'zh-TW'], ['zh-HK', 'zh-TW'], ['zh-MO', 'zh-TW'], ['zh_Hant_CN', 'zh-TW'],
    ['en-US', 'en'], ['ja-JP', 'ja'], ['ko-KR', 'ko'], ['fr-CA', 'fr'],
    ['de-AT', 'de'], ['es-MX', 'es'], ['pt-BR', 'pt'], ['pt-PT', 'pt'],
    ['unsupported', 'en'],
  ])('maps %s to %s', (tag, expected) => expect(resolveLocale(tag)).toBe(expected));

  it('respects browser preference order and falls back to English', () => {
    expect(resolveLocale('auto', ['it-IT', 'fr-CA', 'en'])).toBe('fr');
    expect(resolveLocale('auto', ['zh-HK', 'zh-CN'])).toBe('zh-TW');
    expect(resolveLocale('auto', ['it-IT'])).toBe('en');
    expect(resolveLocale('auto', [])).toBe('en');
    const languages = vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ko-KR', 'en-US']);
    expect(resolveLocale()).toBe('ko');
    expect(resolveLocale('ja')).toBe('ja');
    languages.mockRestore();
  });

  it('has complete translations with matching placeholders in every locale', () => {
    for (const translations of Object.values(messages)) {
      const placeholders = (value: string) => [...value.matchAll(/\{\w+\}/g)].map(match => match[0]).sort();
      expect(translations).toHaveLength(locales.length);
      for (const translation of translations) {
        expect(translation.trim()).not.toBe('');
        expect(placeholders(translation)).toEqual(placeholders(translations[0]));
      }
    }
  });

  it.each(locales)('localizes game UI, accessibility, validation and success in %s', locale => {
    const host = document.createElement('div'); document.body.append(host);
    const t = createTranslator(locale);
    const verify = vi.fn();
    const gate = new GameCaptcha(host, { game: 'minesweeper', locale, targetScore: 1, onVerify: verify });
    expect(host.querySelector('.pg-widget')?.getAttribute('lang')).toBe(locale);
    expect(host.querySelector('.pg-widget')?.getAttribute('aria-label')).toContain(t('minesweeper'));
    expect(host.querySelector('.pg-restart')?.getAttribute('aria-label')).toBe(t('restart'));
    expect(host.querySelector('.pg-mines')?.getAttribute('aria-label')).toBe(t('boardMines'));
    expect(() => gate.reset({ targetScore: 41 })).toThrow(t('invalidTarget', { game: t('minesweeper'), max: 40 }));
    host.querySelector<HTMLButtonElement>('.pg-mine-cell')!.click();
    expect(verify).toHaveBeenCalledTimes(1);
    expect(host.querySelector('.pg-overlay')?.textContent).toContain(t('passed'));
    gate.destroy(); host.remove();
  });

  it('updates instance locale on reset and keeps simultaneous instances independent', () => {
    const host = document.createElement('div'); document.body.append(host);
    const a = new GameCaptcha(host, { game: 'minesweeper', locale: 'ja' });
    const b = new GameCaptcha(host, { game: 'minesweeper', locale: 'fr' });
    a.reset({ locale: 'de' });
    expect([...host.querySelectorAll('.pg-widget')].map(node => node.getAttribute('lang'))).toEqual(['de', 'fr']);
    a.destroy(); b.destroy(); host.remove();
  });
});
