import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

// CSS is exported separately; declarations must not reference the source CSS name.
const entry = new URL('../lib/index.d.ts', import.meta.url);
const types = await readFile(entry, 'utf8');
await writeFile(entry, types.replace(/^import ['"]\.\/style\.css['"];\r?\n/m, ''));

// Vite inlines library assets. Keep the multilingual font separately cacheable.
const cssPath = new URL('../lib/game-captcha.css', import.meta.url);
const css = await readFile(cssPath, 'utf8');
if (!css.includes('base64,')) throw new Error('Expected the bundled Fusion Pixel font.');
await writeFile(cssPath, css.replace(/url\([^)]*base64,[^)]*\)/g, 'url(./fonts/fusion-pixel-12px.woff2)'));
await mkdir(new URL('../lib/fonts/', import.meta.url), { recursive: true });
await cp(new URL('../src/assets/fusion-pixel-12px.woff2', import.meta.url), new URL('../lib/fonts/fusion-pixel-12px.woff2', import.meta.url));
await cp(new URL('../third-party/', import.meta.url), new URL('../lib/licenses/', import.meta.url), { recursive: true });
await cp(new URL('../src/assets/adventure-art.txt', import.meta.url), new URL('../lib/licenses/adventure-art.txt', import.meta.url));
await cp(new URL('../src/assets/racing-art.txt', import.meta.url), new URL('../lib/licenses/racing-art.txt', import.meta.url));
await cp(new URL('../LICENSE', import.meta.url), new URL('../lib/licenses/LICENSE', import.meta.url));
