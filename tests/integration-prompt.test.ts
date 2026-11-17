import { describe, expect, it } from 'vitest';
import { integrationPrompt, repositoryUrl } from '../demo/integration-prompt';
import { locales } from '../src/i18n';

describe('Portable integration prompt', () => {
  it.each(locales)('includes public source, executable setup and selected configuration in %s', locale => {
    const config = { game: 'racing', targetScore: 2500, locale: 'auto' as const, autoStart: true };
    const prompt = integrationPrompt(locale, config);
    expect(prompt).toContain(`git clone ${repositoryUrl}.git`);
    expect(prompt).toContain('npm ci\nnpm run build:lib');
    expect(prompt).toContain('./lib/arcade-captcha.js'); expect(prompt).toContain('./lib/arcade-captcha.css');
    expect(prompt).toContain('chunks/'); expect(prompt).toContain('fonts/'); expect(prompt).toContain('licenses/');
    expect(prompt).toContain(JSON.stringify(config, null, 2));
    expect(prompt).toContain('onStateChange'); expect(prompt).toContain('gate.destroy()');
    expect(prompt).not.toMatch(/localhost|127\.0\.0\.1|npm install arcade-captcha/);
  });
});
