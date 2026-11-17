import type { CaptchaOptions, Locale } from '../src';

const instructions: Record<Locale, readonly [string, string, string, string]> = {
  'zh-CN': [
    '把 Arcade CAPTCHA 小游戏验证码接入当前项目的提交或进入流程，沿用现有框架和页面结构。',
    '把构建出的 arcade-captcha/lib/ 整个复制到接入项目的静态资源目录，使其以 ./lib/ 访问；保留 chunks/、games/、fonts/ 和 licenses/，按实际部署路径调整导入。不要假设已经发布 npm 包。',
    '加载 arcade-captcha.css，在容器挂载后调用 createCaptcha(container, config)，配置如下。保留内置的 304px 黑白像素框、像素字体和自动开始。',
    "通过 onStateChange({ state }) 控制现有提交或进入按钮，仅 state === 'passed' 时放行；重试后重新锁定，提交时再次检查 gate.getSnapshot().state。保留现有服务端鉴权。组件或路由卸载时调用 gate.destroy()，避免重复创建实例。完成实际代码修改，并验证通关、重试和键盘／触屏操作。",
  ],
  'zh-TW': [
    '將 Arcade CAPTCHA 小遊戲驗證碼接入目前專案的提交或進入流程，沿用既有框架和頁面結構。',
    '將建置出的 arcade-captcha/lib/ 整個複製到接入專案的靜態資源目錄，以 ./lib/ 存取；保留 chunks/、games/、fonts/ 與 licenses/，依部署路徑調整匯入。不要假設已發布 npm 套件。',
    '載入 arcade-captcha.css，在容器掛載後呼叫 createCaptcha(container, config)，設定如下。保留內建的 304px 黑白像素外框、像素字型與自動開始。',
    "透過 onStateChange({ state }) 控制既有提交或進入按鈕，僅 state === 'passed' 時放行；重試後重新鎖定，提交時再次檢查 gate.getSnapshot().state。保留既有伺服器端授權。元件或路由卸載時呼叫 gate.destroy()，避免重複建立實例。完成實際程式碼修改，並驗證通關、重試與鍵盤／觸控操作。",
  ],
  en: [
    'Integrate the Arcade CAPTCHA game captcha into this project’s existing submit or entry flow using its current framework and page structure.',
    'Copy the complete built arcade-captcha/lib/ into the consuming site’s static assets, served at ./lib/. Preserve chunks/, games/, fonts/ and licenses/ and adjust imports to the deployed path. Do not assume an npm release exists.',
    'Load arcade-captcha.css and call createCaptcha(container, config) after mounting the container, with the configuration below. Keep the built-in 304px black-and-white pixel frame, pixel font and automatic start.',
    "Use onStateChange({ state }) to enable the existing submit or entry action only when state === 'passed'; relock on retry and check gate.getSnapshot().state again on submission. Preserve existing server authorization. Call gate.destroy() on component or route unmount and avoid duplicate instances. Implement the changes and verify completion, retry, keyboard and touch controls.",
  ],
  ja: [
    'Arcade CAPTCHA のゲーム認証を、このプロジェクトの既存の送信・入場フローに組み込んでください。現在のフレームワークとページ構造を使います。',
    'ビルドした arcade-captcha/lib/ 全体を導入先の静的ファイルにコピーし、./lib/ で配信してください。chunks/、games/、fonts/、licenses/ を保持し、公開パスに合わせてインポートを調整します。npm 公開済みとは仮定しないでください。',
    'arcade-captcha.css を読み込み、コンテナのマウント後に以下の設定で createCaptcha(container, config) を呼び出してください。内蔵の幅 304px の白黒ピクセル枠、ピクセルフォント、自動開始を維持します。',
    "onStateChange({ state }) で既存の送信・入場ボタンを制御し、state === 'passed' のときだけ有効にしてください。再挑戦時は無効に戻し、送信時にも gate.getSnapshot().state を確認します。既存のサーバー認可は維持してください。コンポーネントやルートの破棄時に gate.destroy() を呼び、重複生成を避けます。コードを実装し、クリア、再挑戦、キーボード・タッチ操作を確認してください。",
  ],
  ko: [
    '현재 프레임워크와 페이지 구조를 유지하면서 Arcade CAPTCHA 게임 캡차를 이 프로젝트의 기존 제출 또는 입장 흐름에 통합하세요.',
    '빌드된 arcade-captcha/lib/ 전체를 사용 프로젝트의 정적 파일에 복사하여 ./lib/로 제공하세요. chunks/, games/, fonts/, licenses/를 유지하고 배포 경로에 맞게 import를 조정하세요. npm 배포를 가정하지 마세요.',
    'arcade-captcha.css를 불러오고 컨테이너 마운트 후 아래 설정으로 createCaptcha(container, config)를 호출하세요. 기본 304px 흑백 픽셀 테두리, 픽셀 글꼴, 자동 시작을 유지하세요.',
    "onStateChange({ state })로 기존 제출 또는 입장 버튼을 제어하고 state === 'passed'일 때만 허용하세요. 재시도 시 다시 잠그고 제출 시 gate.getSnapshot().state를 확인하세요. 기존 서버 권한 검사는 유지하세요. 컴포넌트나 경로를 해제할 때 gate.destroy()를 호출하고 중복 생성을 방지하세요. 코드를 구현하고 통과, 재시도, 키보드와 터치 조작을 검증하세요.",
  ],
  fr: [
    'Intègre le captcha ludique Arcade CAPTCHA au parcours d’envoi ou d’accès existant de ce projet, avec son framework et sa structure de page actuels.',
    'Copie tout le dossier compilé arcade-captcha/lib/ dans les fichiers statiques du projet, servi sous ./lib/. Conserve chunks/, games/, fonts/ et licenses/ et adapte les imports au chemin de déploiement. Ne suppose pas une publication npm.',
    'Charge arcade-captcha.css puis appelle createCaptcha(container, config) après le montage du conteneur, avec la configuration ci-dessous. Garde le cadre pixel noir et blanc de 304px, la police pixel et le démarrage automatique intégrés.',
    "Utilise onStateChange({ state }) pour activer le bouton d’envoi ou d’accès existant uniquement si state === 'passed'. Verrouille-le à nouveau lors d’un nouvel essai et vérifie gate.getSnapshot().state à l’envoi. Conserve l’autorisation côté serveur. Appelle gate.destroy() au démontage du composant ou de la route et évite les instances en double. Implémente les changements et vérifie la réussite, les nouveaux essais et les commandes clavier et tactiles.",
  ],
  de: [
    'Binde das Spiel-Captcha Arcade CAPTCHA in den bestehenden Absende- oder Zugangsablauf dieses Projekts ein. Verwende das vorhandene Framework und die Seitenstruktur.',
    'Kopiere das gesamte gebaute Verzeichnis arcade-captcha/lib/ in die statischen Dateien des Zielprojekts, erreichbar unter ./lib/. Behalte chunks/, games/, fonts/ und licenses/ und passe die Imports an den Bereitstellungspfad an. Setze keine npm-Veröffentlichung voraus.',
    'Lade arcade-captcha.css und rufe nach dem Einhängen des Containers createCaptcha(container, config) mit der folgenden Konfiguration auf. Behalte den integrierten schwarzweißen Pixelrahmen mit 304px Breite, die Pixelschrift und den automatischen Start bei.',
    "Aktiviere die vorhandene Absende- oder Zugangsschaltfläche über onStateChange({ state }) nur bei state === 'passed'. Sperre sie bei einem Neustart erneut und prüfe gate.getSnapshot().state beim Absenden. Behalte die serverseitige Autorisierung bei. Rufe beim Entfernen der Komponente oder Route gate.destroy() auf und vermeide doppelte Instanzen. Implementiere die Änderungen und prüfe Abschluss, Neustart, Tastatur- und Touchbedienung.",
  ],
  es: [
    'Integra el captcha de juegos Arcade CAPTCHA en el flujo de envío o acceso existente de este proyecto, conservando su framework y estructura de página.',
    'Copia todo arcade-captcha/lib/ compilado a los archivos estáticos del proyecto, servido en ./lib/. Conserva chunks/, games/, fonts/ y licenses/ y ajusta las importaciones a la ruta de despliegue. No supongas una publicación en npm.',
    'Carga arcade-captcha.css y llama a createCaptcha(container, config) tras montar el contenedor, con la configuración siguiente. Mantén el marco de píxeles en blanco y negro de 304px, la fuente de píxeles y el inicio automático integrados.',
    "Usa onStateChange({ state }) para habilitar el botón de envío o acceso existente solo cuando state === 'passed'. Bloquéalo de nuevo al reintentar y comprueba gate.getSnapshot().state al enviar. Conserva la autorización del servidor. Llama a gate.destroy() al desmontar el componente o la ruta y evita instancias duplicadas. Implementa los cambios y verifica la finalización, los reintentos y los controles de teclado y táctiles.",
  ],
  pt: [
    'Integre o captcha de jogos Arcade CAPTCHA ao fluxo de envio ou acesso existente deste projeto, mantendo o framework e a estrutura da página.',
    'Copie todo o diretório compilado arcade-captcha/lib/ para os arquivos estáticos do projeto, servido em ./lib/. Preserve chunks/, games/, fonts/ e licenses/ e ajuste as importações ao caminho de implantação. Não presuma uma publicação no npm.',
    'Carregue arcade-captcha.css e chame createCaptcha(container, config) após montar o contêiner, com a configuração abaixo. Mantenha a moldura de pixels em preto e branco de 304px, a fonte de pixels e o início automático integrados.',
    "Use onStateChange({ state }) para habilitar o botão de envio ou acesso existente apenas quando state === 'passed'. Bloqueie-o novamente ao tentar de novo e verifique gate.getSnapshot().state no envio. Preserve a autorização do servidor. Chame gate.destroy() ao desmontar o componente ou a rota e evite instâncias duplicadas. Implemente as alterações e verifique a conclusão, as novas tentativas e os controles de teclado e toque.",
  ],
};

export const repositoryUrl = 'https://github.com/superwyh/Arcade-CAPTCHA';
export const demoUrl = 'https://superwyh.github.io/Arcade-CAPTCHA/';
export function integrationPrompt(locale: Locale, config: CaptchaOptions) {
  const [intro, assets, mount, lifecycle] = instructions[locale];
  const source = `GitHub: ${repositoryUrl}\nREADME: ${repositoryUrl}#readme\nDemo: ${demoUrl}`;
  const commands = `Node.js >= 22.12; Git\n\ngit clone ${repositoryUrl}.git arcade-captcha\ncd arcade-captcha\nnpm ci\nnpm run build:lib`;
  const imports = `<link rel="stylesheet" href="./lib/arcade-captcha.css">\n\nimport { createCaptcha } from './lib/arcade-captcha.js';`;
  return [intro, source, commands, assets, imports, mount, JSON.stringify(config, null, 2), lifecycle].join('\n\n');
}
