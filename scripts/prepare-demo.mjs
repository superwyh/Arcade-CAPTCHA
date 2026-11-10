import { cp, mkdir } from 'node:fs/promises';

// Keep the native HTML example usable under any GitHub Pages repository prefix.
await mkdir(new URL('../dist/examples/', import.meta.url), { recursive: true });
await cp(new URL('../examples/basic.html', import.meta.url), new URL('../dist/examples/basic.html', import.meta.url));
await cp(new URL('../lib/', import.meta.url), new URL('../dist/lib/', import.meta.url), { recursive: true });
await cp(new URL('../third-party/', import.meta.url), new URL('../dist/licenses/', import.meta.url), { recursive: true });
console.log('Included the native HTML example and distributable library in dist/.');
