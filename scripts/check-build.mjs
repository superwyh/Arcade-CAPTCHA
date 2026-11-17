import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { getGames } from '../lib/arcade-captcha.js';

assert.deepEqual(getGames().map(game => game.id), ['tetris', '2048', 'minesweeper', 'breakout', 'fps', 'adventure', 'racing', 'snake', 'space', 'pacman', 'sokoban', 'bubbles'], 'The packaged library must register all twelve games.');
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const cssPaths = [...html.matchAll(/href="(\.\/assets\/[^\"]+\.css)"/g)].map(match => match[1]);
assert(cssPaths.length > 0, 'The static site must reference its built CSS.');
const styles = (await Promise.all(cssPaths.map(path => readFile(new URL(`../dist/${path}`, import.meta.url), 'utf8')))).join('\n');
assert(styles.includes('.pg-widget'), 'The production bundle must retain the widget styles.');
const example = await readFile(new URL('../dist/examples/basic.html', import.meta.url), 'utf8');
assert(example.includes('../lib/arcade-captcha.js'), 'The native example must use the packaged library.');
const loginExample = await readFile(new URL('../dist/examples/login.html', import.meta.url), 'utf8');
assert(loginExample.includes("new URL('../', location.href)") && loginExample.includes("url.searchParams.set('view', 'login')"), 'The old login URL must redirect to the main page under the deployment base.');
await readFile(new URL('../dist/lib/arcade-captcha.js', import.meta.url));
const libraryCss = await readFile(new URL('../dist/lib/arcade-captcha.css', import.meta.url), 'utf8');
assert(libraryCss.includes('./fonts/fusion-pixel-12px.woff2'), 'Library fonts must work below a repository path.');
await readFile(new URL('../dist/lib/fonts/fusion-pixel-12px.woff2', import.meta.url));
await readFile(new URL('../dist/lib/licenses/fusion-pixel/OFL.txt', import.meta.url));
for (const root of ['../lib/licenses/', '../dist/lib/licenses/', '../dist/licenses/']) {
  const license = await readFile(new URL(`${root}boxoban/LICENSE.txt`, import.meta.url), 'utf8');
  assert(license.includes('Apache License') && license.includes('END OF TERMS AND CONDITIONS'), 'The complete Boxoban license must accompany the level data.');
  const notice = await readFile(new URL(`${root}boxoban/NOTICE.txt`, import.meta.url), 'utf8');
  assert(notice.includes('Arthur Guez') && notice.includes('hard/000.txt'), 'Boxoban level attribution must survive packaging.');
  await readFile(new URL(`${root}boxoban/levels.txt`, import.meta.url));
}
async function modules(entries) {
  const found = new Map();
  async function visit(url) {
    if (found.has(url.href)) return;
    const code = await readFile(url, 'utf8'); found.set(url.href, code);
    for (const [, path] of code.matchAll(/(?:\bfrom\s*|\bimport\s*)["'](\.[^"']+\.js)["']/g)) await visit(new URL(path, url));
  }
  for (const entry of entries) await visit(new URL(`../lib/${entry}`, import.meta.url));
  return [...found.values()].join('\n');
}
const bundle = await modules(['arcade-captcha.js']);
assert((bundle.match(/data:image\/png;base64,/g) ?? []).length === 4, 'The full library must include all four runtime atlases.');
assert(Buffer.byteLength(bundle) < 350_000, 'The full ES module graph exceeds its JavaScript size budget.');
const tetris = await modules(['core.js', 'games/tetris.js']);
assert(!tetris.includes('data:image/'), 'Tetris must not import other games’ atlases.');
assert(Buffer.byteLength(tetris) < 90_000, 'The core + Tetris JavaScript exceeds its size budget.');
execFileSync(process.execPath, ['--input-type=module', '-e', `
  import assert from 'node:assert/strict';
  import { registerGame, getGames } from 'arcade-captcha/core';
  import { tetrisGame } from 'arcade-captcha/games/tetris';
  assert.equal(getGames().length, 0);
  registerGame(tetrisGame);
  assert.deepEqual(getGames().map(game => game.id), ['tetris']);
`], { cwd: new URL('../', import.meta.url), stdio: 'inherit' });
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
for (const entry of Object.values(manifest.exports)) {
  for (const path of typeof entry === 'string' ? [entry] : Object.values(entry)) await readFile(new URL(`../${path}`, import.meta.url));
}
console.log(`Build checks passed. Full ES graph: ${Buffer.byteLength(bundle)} bytes; core + Tetris: ${Buffer.byteLength(tetris)} bytes (CSS/font separate).`);
