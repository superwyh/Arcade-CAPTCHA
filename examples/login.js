const messages = {
  en: { login: 'Sign in', email: 'Email', password: 'Password', show: 'Show', hide: 'Hide', close: 'Close', success: 'Signed in', logout: 'Sign out' },
  'zh-CN': { login: '登录', email: '邮箱', password: '密码', show: '显示', hide: '隐藏', close: '关闭', success: '登录成功', logout: '退出登录' },
  'zh-TW': { login: '登入', email: '電子郵件', password: '密碼', show: '顯示', hide: '隱藏', close: '關閉', success: '登入成功', logout: '登出' },
  ja: { login: 'ログイン', email: 'メールアドレス', password: 'パスワード', show: '表示', hide: '非表示', close: '閉じる', success: 'ログインしました', logout: 'ログアウト' },
  ko: { login: '로그인', email: '이메일', password: '비밀번호', show: '표시', hide: '숨기기', close: '닫기', success: '로그인 완료', logout: '로그아웃' },
  fr: { login: 'Connexion', email: 'E-mail', password: 'Mot de passe', show: 'Afficher', hide: 'Masquer', close: 'Fermer', success: 'Connecté', logout: 'Déconnexion' },
  de: { login: 'Anmelden', email: 'E-Mail', password: 'Passwort', show: 'Zeigen', hide: 'Verbergen', close: 'Schließen', success: 'Angemeldet', logout: 'Abmelden' },
  es: { login: 'Iniciar sesión', email: 'Correo electrónico', password: 'Contraseña', show: 'Mostrar', hide: 'Ocultar', close: 'Cerrar', success: 'Sesión iniciada', logout: 'Cerrar sesión' },
  pt: { login: 'Entrar', email: 'E-mail', password: 'Senha', show: 'Mostrar', hide: 'Ocultar', close: 'Fechar', success: 'Sessão iniciada', logout: 'Sair' },
};

// A local UI demo: no credentials are sent, saved, or authenticated.
export function mountLoginPage({ createCaptcha, getGames, resolveLocale, createTranslator }) {
  const params = new URLSearchParams(location.search);
  const locale = resolveLocale(params.get('lang') || 'en');
  const copy = messages[locale] ?? messages.en;
  const games = getGames(locale);
  document.documentElement.lang = locale;
  document.title = `${copy.login} · Arcade CAPTCHA`;
  document.querySelectorAll('[data-copy]').forEach(node => { node.textContent = copy[node.dataset.copy]; });
  document.querySelector('#verification-title').textContent = createTranslator(locale)('widget');

  const form = document.querySelector('#login-form');
  const email = document.querySelector('#email');
  const password = document.querySelector('#password');
  const login = document.querySelector('#login-button');
  const toggle = document.querySelector('#toggle-password');
  const logout = document.querySelector('#logout-button');
  const dialog = document.querySelector('#verification-dialog');
  const close = document.querySelector('#close-dialog');
  const host = document.querySelector('#login-captcha');
  const controller = new AbortController();
  const { signal } = controller;
  let gate;
  let completion;
  let signedIn = false;
  let generation = 0;
  let lastGame;
  close.setAttribute('aria-label', copy.close);
  login.disabled = false;

  function cancelCompletion() { clearTimeout(completion); completion = undefined; }
  function disposeGate() {
    generation++;
    cancelCompletion();
    gate?.destroy(); gate = undefined;
    host.replaceChildren();
    login.disabled = false;
  }
  function hidePassword() {
    password.type = 'password'; toggle.textContent = copy.show;
    toggle.setAttribute('aria-pressed', 'false');
  }
  function randomGame() {
    const alternatives = games.filter(item => item.id !== lastGame);
    const choices = alternatives.length ? alternatives : games;
    return choices[Math.floor(Math.random() * choices.length)].id;
  }
  function startChallenge(game, account) {
    disposeGate();
    const session = generation;
    lastGame = game;
    login.disabled = true;
    if (!dialog.open) dialog.showModal();
    try {
      gate = createCaptcha(host, {
        game, locale,
        onStateChange({ state }) { if (session === generation && state !== 'passed') cancelCompletion(); },
        onVerify() {
          if (session !== generation || !dialog.open || gate?.getSnapshot().state !== 'passed') return;
          cancelCompletion();
          completion = setTimeout(() => {
            if (session !== generation || !dialog.open || gate?.getSnapshot().state !== 'passed') return;
            signedIn = true;
            password.value = ''; hidePassword();
            document.querySelector('#account-email').textContent = account;
            document.querySelector('#login-panel').hidden = true;
            document.querySelector('#account-panel').hidden = false;
            dialog.close();
          }, 500);
        },
      });
      host.querySelector('.pg-widget')?.focus({ preventScroll: true });
    } catch (error) {
      dialog.close(); disposeGate();
      throw error;
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity() || dialog.open || signedIn) return;
    startChallenge(randomGame(), email.value.trim());
  }, { signal });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    disposeGate();
    (signedIn ? logout : login).focus({ preventScroll: true });
  }, { signal });
  dialog.addEventListener('cancel', cancelCompletion, { signal });
  close.addEventListener('click', () => dialog.close(), { signal });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }, { signal });
  toggle.addEventListener('click', () => {
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    toggle.textContent = visible ? copy.hide : copy.show;
    toggle.setAttribute('aria-pressed', String(visible));
  }, { signal });
  logout.addEventListener('click', () => {
    signedIn = false;
    form.reset(); hidePassword();
    document.querySelector('#account-email').textContent = '';
    document.querySelector('#account-panel').hidden = true;
    document.querySelector('#login-panel').hidden = false;
    email.focus();
  }, { signal });
  window.addEventListener('pagehide', () => { if (dialog.open) dialog.close(); disposeGate(); }, { signal });

  return () => { controller.abort(); if (dialog.open) dialog.close(); disposeGate(); };
}
