import { expect, test, type Page } from '@playwright/test';

async function fitsViewport(page: Page, selector: string) {
  const result = await page.locator(selector).evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewport: document.documentElement.clientWidth };
  });
  expect(result.left).toBeGreaterThanOrEqual(-1);
  expect(result.right).toBeLessThanOrEqual(result.viewport + 1);
}

for (const width of [320, 360, 390]) {
  test(`preview and controls fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?lang=en&game=fps');
    await expect(page.locator('.pg-widget')).toHaveAttribute('data-state', 'running');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    for (const selector of ['.preview-frame', '.pg-widget', '.pg-restart', '.pg-controls button:last-child', '#enter']) await fitsViewport(page, selector);
    await page.screenshot({ path: `.qa/browser-results/preview-${width}.png` });
  });
}

test('all games start on selection and receive keyboard focus', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?lang=en');
  const buttons = page.locator('[data-game]');
  await expect(buttons).toHaveCount(12);
  for (const button of await buttons.all()) {
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.pg-widget')).toBeFocused();
    await expect(page.locator('.pg-widget')).toHaveAttribute('data-state', 'running');
    await expect(page.locator('.pg-primary')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('game keys do not change the selected game, while code tabs keep native keyboard navigation', async ({ page }) => {
  await page.goto('/?lang=en&game=minesweeper');
  const root = page.locator('.pg-widget');
  await root.press('ArrowRight');
  await expect(page.locator('.pg-mine-cell').nth(1)).toHaveAttribute('data-selected', 'true');
  await root.press('ArrowUp');
  await expect(page.locator('.pg-mine-cell').nth(1)).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('[data-game="minesweeper"]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('tab', { name: 'JavaScript', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'HTML', exact: true })).toBeFocused();
  await expect(page.locator('#code-panel')).toHaveAttribute('aria-labelledby', 'tab-html');
});

test('editing a target keeps focus and changes the integration sample', async ({ page }) => {
  await page.goto('/?lang=en&game=2048');
  const target = page.getByRole('spinbutton', { name: 'Target', exact: true });
  await target.fill('256');
  await expect(target).toBeFocused();
  await expect(page.locator('.pg-score')).toContainText('/ 256');
  await expect(page.locator('#code-sample')).toContainText('targetScore: 256');
});

test('the modular entry mounts Tetris without downloading other games', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.route('**/module-check.html', route => route.fulfill({ contentType: 'text/html', body: `
    <!doctype html><link rel="stylesheet" href="./lib/arcade-captcha.css"><div id="captcha"></div>
    <script type="module">
      import { createCaptcha, registerGame } from './lib/core.js';
      import { tetrisGame } from './lib/games/tetris.js';
      registerGame(tetrisGame);
      createCaptcha('#captcha', { game: 'tetris', locale: 'en' });
    </script>` }));
  await page.goto('/module-check.html');
  await expect(page.locator('.pg-widget')).toHaveAttribute('data-state', 'running');
  await expect(page.locator('canvas')).toHaveAttribute('aria-label', /Tetris/);
  await expect(page.locator('.pg-widget')).toBeFocused();
  expect(requests.some(url => /(?:adventure|fps-|racing|space-|sokoban|bubbles|pacman|snake-)/.test(url))).toBe(false);
  await expect(page.locator('.pg-widget')).toHaveCSS('font-size', '12px');
});

for (const locale of ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'pt']) {
  test(`navigation and code controls fit in ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(`/?lang=${locale}&game=minesweeper`);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await page.evaluate(() => document.fonts.ready);
    for (const selector of ['.site-header nav', '.site-header nav a:last-child', '#tab-prompt', '#copy-code']) await fitsViewport(page, selector);
    const overlap = await page.locator('.code-toolbar').evaluate(toolbar => {
      const prompt = toolbar.querySelector('#tab-prompt')!.getBoundingClientRect();
      const copy = toolbar.querySelector('#copy-code')!.getBoundingClientRect();
      return prompt.right > copy.left && prompt.bottom > copy.top && copy.bottom > prompt.top;
    });
    expect(overlap).toBe(false);
    await page.locator('#login-demo-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('#login-title')).not.toBeEmpty();
    for (const selector of ['#login-preview', '#login-form', '#login-demo-toggle']) await fitsViewport(page, selector);
    await page.locator('#login-button').click();
    const modalGame = page.locator('#login-captcha .pg-widget');
    await expect(modalGame).toHaveAttribute('data-state', 'running');
    await expect(modalGame.locator('.pg-title')).toHaveText(await page.locator('#verification-title').textContent() ?? '');
    const restartBox = await modalGame.locator('.pg-restart').boundingBox();
    const closeBox = await page.locator('#close-dialog').boundingBox();
    expect(restartBox!.x + restartBox!.width).toBeLessThanOrEqual(closeBox!.x);
    expect(Math.abs(restartBox!.y - closeBox!.y)).toBeLessThan(restartBox!.height);
    await fitsViewport(page, '#verification-dialog');
    await page.locator('#close-dialog').click();
  });
}

test('login demo stays on the page, randomizes each opening and restores the playground', async ({ page }) => {
  await page.goto('/?lang=en&game=2048');
  await page.locator('#target-input').fill('256');
  await page.locator('#login-demo-toggle').click();
  expect(new URL(page.url()).pathname).toBe('/');
  expect(new URL(page.url()).searchParams.get('view')).toBe('login');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Arcade CAPTCHA');
  await expect(page.locator('#captcha .pg-widget')).toHaveAttribute('data-state', 'paused');
  await expect(page.locator('.configuration')).toBeHidden();
  await expect(page.locator('#code-sample')).toContainText("game: 'random'");
  const signIn = page.getByRole('button', { name: 'Sign in', exact: true });
  await signIn.click();
  const root = page.locator('#login-captcha .pg-widget');
  await expect(root).toBeFocused();
  const game = await root.getAttribute('aria-label');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(root).toHaveCount(0);
  await expect(signIn).toBeFocused();
  await signIn.click();
  await expect(root).toBeFocused();
  await expect(root).not.toHaveAttribute('aria-label', game!);
  await page.keyboard.press('Escape');
  await expect(page.locator('#verification-dialog')).not.toBeVisible();
  await expect(root).toHaveCount(0);
  await expect(signIn).toBeFocused();
  await page.locator('#login-demo-toggle').click();
  await expect(page.locator('#login-preview')).toBeHidden();
  await expect(page.locator('#captcha .pg-widget')).toBeFocused();
  await expect(page.locator('#captcha .pg-widget')).toHaveAttribute('data-state', 'running');
  await expect(page.locator('#target-input')).toHaveValue('256');
  await expect(page.locator('#code-sample')).toContainText('targetScore: 256');
  await expect(page.locator('.configuration')).toBeVisible();
  await expect(page.locator('#verification-dialog')).toHaveCount(0);
});

test('the previous login URL redirects into the main page and preserves its language', async ({ page }) => {
  await page.goto('/examples/login.html?lang=ja');
  await expect(page).toHaveURL(/\/\?lang=ja&view=login$/);
  await expect(page.locator('#login-preview')).toBeVisible();
  await expect(page.locator('#login-title')).toHaveText('ログイン');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
});

test('login modal fits a small viewport and keeps the background form inert', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/?view=login&lang=en');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('#login-captcha .pg-widget')).toBeFocused();
  await fitsViewport(page, '#verification-dialog');
  await fitsViewport(page, '#login-captcha .pg-widget');
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest('dialog'))).toBe(true);
  }
});
