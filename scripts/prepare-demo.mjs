import { cp, mkdir } from 'node:fs/promises';

await mkdir(new URL('../dist/examples/', import.meta.url), { recursive: true });
await cp(new URL('../examples/', import.meta.url), new URL('../dist/examples/', import.meta.url), { recursive: true });
await cp(new URL('../lib/', import.meta.url), new URL('../dist/lib/', import.meta.url), { recursive: true });
await cp(new URL('../third-party/', import.meta.url), new URL('../dist/licenses/', import.meta.url), { recursive: true });
await cp(new URL('../node_modules/highlight.js/LICENSE', import.meta.url), new URL('../dist/licenses/highlight.js-LICENSE.txt', import.meta.url));
console.log('Included the native HTML example and distributable library in dist/.');
