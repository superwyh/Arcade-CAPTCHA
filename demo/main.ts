import { createCaptcha, getGames, createTranslator, resolveLocale, type VerificationResult } from '../src';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';
import './style.css';
import { integrationPrompt } from './integration-prompt';
import { mountLoginDemo } from './login';
import wordmark from './assets/wordmark.png';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('xml', xml);

const locale = resolveLocale(new URLSearchParams(location.search).get('lang') ?? 'auto');
const t = createTranslator(locale);
document.documentElement.lang = locale;
document.title = 'Arcade CAPTCHA';
document.querySelector('meta[name="description"]')?.setAttribute('content', `Arcade CAPTCHA · ${t('widget')}`);
const games = getGames(locale);
const defaultTargets = Object.fromEntries(games.map(game => [game.id, game.defaultTarget]));
const targets = { ...defaultTargets };
const requestedGame = new URLSearchParams(location.search).get('game');
let selected = games.find(game => game.id === (requestedGame === 'doom' ? 'fps' : requestedGame))?.id ?? 'tetris';
let random = false;
let codeTab: 'js' | 'html' | 'prompt' = 'js';
let verified: VerificationResult | undefined;
let loginMode = false;
let disposeLogin: (() => void) | undefined;

// Icon positions follow the two rows of the game sprite sheet.
const gameShelf = ['tetris', 'fps', 'adventure', 'racing', 'space', '2048', 'minesweeper', 'breakout', 'snake', 'pacman', 'sokoban', 'bubbles'];
const gameChoices = gameShelf.map((id, index) => {
  const game = games.find(item => item.id === id)!;
  const position = `${(index % 6) * 20}% ${Math.floor(index / 6) * 100}%`;
  return `<button type="button" data-game="${id}" aria-pressed="${id === selected}">
    <span class="game-icon" aria-hidden="true" style="--sprite-position:${position}"></span><span>${game.name}</span>
  </button>`;
}).join('');

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main>
    <header class="site-header"><h1><img src="${wordmark}" alt="Arcade CAPTCHA" width="616" height="49"></h1><nav><button type="button" id="login-demo-toggle" aria-pressed="false" aria-controls="login-preview">${t('loginDemo')}</button><a href="#integration">${t('code')}</a></nav></header>
    <div class="workspace">
      <section class="demo" aria-label="${t('demo')}">
        <div class="preview">
          <div class="preview-frame">
            <div class="preview-window">
              <div id="captcha"></div>
              <button type="button" id="enter" disabled>${t('enter')}</button>
            </div>
            <div id="login-preview" class="login-demo" hidden></div>
          </div>
        </div>
        <div class="configuration">
        <div class="game-options" role="group" aria-label="${t('game')}">${gameChoices}</div>
        <form id="settings" class="settings">
          <label class="target-field">${t('target')}<input id="target-input" type="number" value="${targets[selected]}" min="1" max="${games.find(game => game.id === selected)!.maxTarget}" aria-describedby="target-error" /></label>
          <button type="button" id="random-toggle" aria-pressed="false">${t('random')}</button>
          <button type="button" id="restore" title="${t('restore')}"><svg viewBox="0 0 12 12" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" d="M3 1h5v1h2v2h1V2h1v5H7V6h3V4H8V3H3v1H2v4h1v1h5V8h2v2H8v1H3v-1H1V8H0V4h1V2h2z"/></svg>${t('restore')}</button>
        </form>
        <p id="target-error" role="alert" hidden></p>
        </div>
      </section>
      <section id="integration" class="integration" aria-label="${t('code')}">
        <div class="code-toolbar"><div role="tablist" aria-label="${t('code')}"><button type="button" role="tab" id="tab-js" aria-selected="true" aria-controls="code-panel" data-tab="js">JavaScript</button><button type="button" role="tab" id="tab-html" aria-selected="false" aria-controls="code-panel" data-tab="html" tabindex="-1">HTML</button><button type="button" role="tab" id="tab-prompt" aria-selected="false" aria-controls="code-panel" data-tab="prompt" tabindex="-1">${t('aiPrompt')}</button></div><button type="button" id="copy-code">${t('copy')}</button></div>
        <pre id="code-panel" role="tabpanel" aria-labelledby="tab-js" tabindex="0"><span class="line-numbers" aria-hidden="true"></span><code id="code-sample"></code></pre>
        <details class="api"><summary>${t('api')}</summary>
          <table><tbody><tr><th scope="row"><code>game</code></th><td>${t('gameOption')}</td></tr><tr><th scope="row"><code>targetScore</code></th><td>${t('targetOption')}</td></tr><tr><th scope="row"><code>locale</code></th><td>${t('localeOption')}</td></tr><tr><th scope="row"><code>onVerify</code></th><td>${t('verifyOption')}</td></tr><tr><th scope="row"><code>onStateChange</code></th><td>${t('stateOption')}</td></tr><tr><th scope="row"><code>destroy()</code></th><td>${t('destroyOption')}</td></tr></tbody></table>
          <p>${t('defaults')}</p>
          <p>${t('buildHelp', { command: '<code>npm run build:lib</code>' })} <a href="./examples/basic.html" target="_blank" rel="noopener">${t('example')} ↗</a></p>
        </details>
      </section>
    </div>
    <dialog id="welcome-dialog"><h2>${t('entered')}</h2><button type="button" id="return">${t('back')}</button></dialog>
  </main>`;

const gameButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-game]')];
const randomButton = document.querySelector<HTMLButtonElement>('#random-toggle')!;
const input = document.querySelector<HTMLInputElement>('#target-input')!;
const error = document.querySelector<HTMLElement>('#target-error')!;
const enter = document.querySelector<HTMLButtonElement>('#enter')!;
const welcome = document.querySelector<HTMLDialogElement>('#welcome-dialog')!;
const captcha = createCaptcha('#captcha', {
  locale,
  game: selected,
  targets: { ...targets },
  onStateChange({ state }) {
    enter.disabled = state !== 'passed';
    if (state !== 'passed') verified = undefined;
  },
  onVerify(result) { verified = result; },
});

function codeSample() {
  const useRandom = loginMode || random;
  const activeTargets = loginMode ? defaultTargets : targets;
  if (codeTab === 'prompt') return integrationPrompt(locale, {
    ...(useRandom ? { game: 'random', targets: { ...activeTargets } } : { game: selected, targetScore: targets[selected] }),
    locale: 'auto', autoStart: true,
  });
  if (codeTab === 'html') return `<link rel="stylesheet" href="./lib/arcade-captcha.css">\n\n<div id="captcha"></div>\n<button id="enter" disabled>${t('enter')}</button>\n\n<script type="module" src="./app.js"></script>`;
  const config = useRandom ? `game: 'random',\n  targets: {\n${Object.entries(activeTargets).map(([id, target]) => `    '${id}': ${target}`).join(',\n')}\n  },` : `game: '${selected}',\n  targetScore: ${targets[selected]},`;
  return `import { createCaptcha } from './lib/arcade-captcha.js';\n\nconst enter = document.querySelector('#enter');\n\nconst gate = createCaptcha('#captcha', {\n  ${config}\n  onStateChange({ state }) {\n    enter.disabled = state !== 'passed';\n  },\n  onVerify(result) {\n    console.log(result);\n  }\n});\n\nenter.onclick = () => {\n  if (gate.getSnapshot().state === 'passed')\n    location.href = './welcome.html';\n};\n\n// ${t('cleanup')}`;
}

function renderCode() {
  const node = document.querySelector('#code-sample')!;
  const sample = codeSample();
  document.querySelector('.line-numbers')!.textContent = codeTab === 'prompt' ? '' : sample.split('\n').map((_, i) => i + 1).join('\n');
  document.querySelector('#code-panel')!.classList.toggle('is-prompt', codeTab === 'prompt');
  document.querySelector('#copy-code')!.textContent = t('copy');
  if (codeTab === 'prompt') {
    node.className = '';
    node.textContent = sample;
    return;
  }
  const language = codeTab === 'js' ? 'javascript' : 'xml';
  node.className = `hljs language-${language}`;
  node.innerHTML = hljs.highlight(sample, {
    language,
    ignoreIllegals: true,
  }).value;
}

function applyTarget() {
  if (random) return;
  const game = games.find(game => game.id === selected)!;
  const value = Number(input.value);
  if (!input.value || !Number.isSafeInteger(value) || value < 1 || value > game.maxTarget!) {
    error.textContent = t('range', { max: game.maxTarget! }); error.hidden = false; input.setAttribute('aria-invalid', 'true'); return;
  }
  error.hidden = true; input.removeAttribute('aria-invalid');
  if (value === targets[selected]) return;
  targets[selected] = value;
  captcha.reset({ targets: { ...targets } }); renderCode();
}

function applyGame() {
  gameButtons.forEach(button => button.setAttribute('aria-pressed', String(!random && button.dataset.game === selected)));
  randomButton.setAttribute('aria-pressed', String(random));
  input.disabled = random; input.value = random ? '' : String(targets[selected]); input.placeholder = random ? t('default') : '';
  input.max = String(games.find(game => game.id === selected)?.maxTarget ?? 10000);
  document.querySelector<HTMLButtonElement>('#restore')!.disabled = random;
  error.hidden = true; input.removeAttribute('aria-invalid');
  captcha.reset({ game: random ? 'random' : selected, targets: { ...targets } }); renderCode();
  document.querySelector<HTMLElement>('#captcha .pg-widget')!.focus({ preventScroll: true });
}
gameButtons.forEach(button => button.addEventListener('click', () => {
  selected = button.dataset.game!; random = false; applyGame();
}));
randomButton.addEventListener('click', () => { random = !random; applyGame(); });
input.addEventListener('change', applyTarget);
input.addEventListener('input', () => { if (input.value && input.validity.valid) applyTarget(); });
document.querySelector('#settings')!.addEventListener('submit', event => { event.preventDefault(); applyTarget(); });
document.querySelector('#restore')!.addEventListener('click', () => {
  if (random) return;
  input.value = String(games.find(game => game.id === selected)!.defaultTarget); applyTarget();
});

const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
function selectTab(button: HTMLButtonElement) {
  codeTab = button.dataset.tab as typeof codeTab;
  tabs.forEach(tab => { const active = tab === button; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; });
  document.querySelector('#code-panel')!.setAttribute('aria-labelledby', button.id); renderCode();
}
tabs.forEach((button, index) => {
  button.addEventListener('click', () => selectTab(button));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length];
    selectTab(next); next.focus();
  });
});
document.querySelector('#copy-code')!.addEventListener('click', async event => {
  const button = event.currentTarget as HTMLButtonElement;
  try { await navigator.clipboard.writeText(codeSample()); button.textContent = t('copied'); }
  catch {
    const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(document.querySelector('#code-sample')!);
    selection?.removeAllRanges(); selection?.addRange(range); button.textContent = t('copySelection');
  }
  setTimeout(() => { button.textContent = t('copy'); }, 1500);
});
enter.addEventListener('click', () => { if (verified && captcha.getSnapshot().state === 'passed') welcome.showModal(); });
document.querySelector('#return')!.addEventListener('click', () => { welcome.close(); captcha.reset(); });
window.addEventListener('pagehide', () => captcha.pause());
window.addEventListener('pageshow', () => { if (!loginMode) captcha.resume(); });

function setLoginMode(active: boolean, focus = true) {
  loginMode = active;
  const host = document.querySelector<HTMLElement>('#login-preview')!;
  const toggle = document.querySelector<HTMLButtonElement>('#login-demo-toggle')!;
  disposeLogin?.(); disposeLogin = undefined;
  document.querySelector<HTMLElement>('.preview-window')!.hidden = active;
  document.querySelector<HTMLElement>('.configuration')!.hidden = active;
  host.hidden = !active;
  toggle.setAttribute('aria-pressed', String(active));
  toggle.textContent = t(active ? 'back' : 'loginDemo');
  if (active) {
    captcha.pause();
    disposeLogin = mountLoginDemo(host, locale);
    if (focus) host.querySelector<HTMLElement>('#login-button')!.focus({ preventScroll: true });
  } else {
    captcha.resume();
    if (focus) document.querySelector<HTMLElement>('#captcha .pg-widget')!.focus({ preventScroll: true });
  }
  const url = new URL(location.href);
  if (active) url.searchParams.set('view', 'login');
  else url.searchParams.delete('view');
  history.replaceState(null, '', url);
  renderCode();
}
document.querySelector('#login-demo-toggle')!.addEventListener('click', () => setLoginMode(!loginMode));
if (new URLSearchParams(location.search).get('view') === 'login') setLoginMode(true, false);
renderCode();
