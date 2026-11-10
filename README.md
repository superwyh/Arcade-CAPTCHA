# Game CAPTCHA

一个娱乐用途的小游戏验证码框架。

计划地址：[GitHub](https://github.com/superwyh/game-captcha) · [演示](https://superwyh.github.io/game-captcha/)。当前仅保留本地版本，尚未发布。

304 px 紧凑组件，黑白界面、经典配色的像素游戏素材，使用免费开源的 Fusion Pixel 字体。内置俄罗斯方块、2048、扫雷、打砖块、FPS、地下城冒险和赛车；完成指定目标后触发通关回调。原生 TypeScript、零运行时依赖，可嵌入普通 HTML、React、Vue 等网页。

> 这是娱乐用途的前端门槛，不是反机器人或身份验证服务。通关事件不提供安全担保，真正的访问权限须由业务服务端控制。

## 本地启动

需要 Node.js **22.12+**（建议 Node 22 最新 LTS 补丁版）及 npm。仓库发布后可执行以下克隆命令；已有本地源码时从 `npm ci` 开始。

```sh
git clone https://github.com/superwyh/game-captcha.git
cd game-captcha
npm ci
npm run dev
```

打开 `http://127.0.0.1:4173/`。开发服务和构建预览固定使用此端口，端口被占用时会报错，不会改用其他地址。测试台支持：

Windows 也可以双击 [`start-demo.cmd`](start-demo.cmd)，它会在缺少依赖时安装依赖，随后启动本地服务并打开浏览器。体验期间保持命令窗口开启，关闭窗口即可停止服务。

- 七种游戏切换、独立目标设置、恢复默认、随机模式。
- 实际尺寸预览、得分与重试。
- 游戏加载与重置后直接开始，达标后解锁“进入页面”。
- 根据当前设置生成 JavaScript / HTML 接入代码，以及可直接复制给大模型的「AI 提示词」；提示词包含 GitHub 地址、下载构建命令、资源路径、当前配置、通关处理和生命周期要求，支持九种语言。API 参数按需展开。

## 默认规则

| 游戏 ID | 游戏 | 默认目标 | 计分方式 | 可配置范围 |
| --- | --- | --- | --- | --- |
| `tetris` | 俄罗斯方块 | 500 分 | 一次消除 1 / 2 / 3 / 4 行得 100 / 300 / 500 / 800 分 | 1–10000 |
| `2048` | 2048 | 128 分 | 合并时增加合成数字的值；目标是累计得分，不是最大方块 | 1–10000 |
| `minesweeper` | 扫雷 | 清屏：全部 40 个安全格 | 每翻开一个安全格得 1 分，空白区域展开也计入 | 1–40 |
| `breakout` | 打砖块 | 清屏：全部 24 块砖（240） | 每块砖 10 分，共 24 块砖、3 次接球机会 | 1–240 |
| `fps` | 第一人称射击 | 5 关，预计约 5–7 分钟 | 每关清敌、拿到红钥匙并进入出口计 1；杀敌本身不放行 | 1–5 |
| `adventure` | 冒险 | 通关 1 座地下城 | 取得钥匙、击败守卫并走到出口楼梯后计 1 | 1–3 |
| `racing` | 赛车 | 1500 米 | 存活并驶过终点 | 1–10000 |

默认扫雷须翻开全部安全格，打砖块须消除全部砖块。开发者仍可配置较低的目标，此时 `score >= targetScore` 即通过。例如打砖块设为 15 分时，击碎两块砖即通过。扫雷采用 8×6 棋盘和 8 个雷，首次点击及相邻格保证安全，开局不会直接翻完所有安全格；按标准扫雷规则展开空白区域。俄罗斯方块使用七袋随机，每袋含全部七种方块。

键盘操作仅在组件内生效，不占用整页方向键。切换到后台标签页时自动暂停，回来后自动继续。按钮、滑动、点击或拖动支持手机操作。

### FPS

测试台选择 `FPS`，或打开 `/?game=fps`。使用 `game: 'fps'` 接入；`targetScore` 为需要完成的关卡数，默认 5，可设为 1–5。每局及每关随机生成 25×25 地图，包含 7–9 个相连房间、岔路和环路，随机安排敌人、补给、钥匙与出口。

W/S 或上下方向键前进、后退；A/D 或左右方向键转向；Q/E 平移。鼠标在画面内移动即可转向，点击后支持鼠标锁定，Esc 释放；空格、回车或点击射击。手机支持拖动转向及下方方向、射击按钮。弹药用尽后可以近身攻击。清敌并拿到红钥匙后开启出口；后台、失焦、重试和切换游戏会释放持续输入及鼠标锁定。

使用本地 Canvas 射线投射、原创像素素材和合成音效，代码及原创素材遵循本项目 MIT 协议；字体保留原有 OFL 授权。音效在首次操作后启用，离开游戏时清理。

### 冒险

测试台选择“冒险”，或打开 `/?game=adventure`。接入参数为 `game: 'adventure'`，默认 `targetScore: 1`，可设置为 1–3 座地下城。

九个相连房间，包含史莱姆、蝙蝠、骷髅和石像守卫。清敌后打开房门和宝箱，宝箱可提供钥匙、剑强化、生命上限及治疗。钥匙开启守卫房；击败守卫后走入楼梯才通关。小地图显示当前房间及已探索区域。

WASD / 方向键移动，空格 / J / 回车攻击；点击或按住画面攻击，拖动移动；触屏也可使用下方方向及攻击按钮。使用已有的实体键识别和失焦释放机制。

角色使用四方向行走、蓄力和出剑动画，攻击期间固定朝向，出剑阶段对前方敌人判定伤害，并保留距离和侧向容错。地下城采用蓝色块状墙面、低细节地板和房间滚动切换。

角色和场景均由内置 imagegen 生成：[角色动画图集](src/assets/adventure-hero.png)、[地下城图集](src/assets/adventure-dungeon.png)。生成提示词及来源记录见 [adventure-art.txt](src/assets/adventure-art.txt)。图片随库打包，运行时不调用图像服务，适用于 GitHub Pages 子路径部署。

### 赛车

测试台选择“赛车”，或打开 `/?game=racing`。接入参数 `game: 'racing'`，默认目标 1500 米，可配置为 1–10000 米。自动前进，三次碰撞后失败；弯道、交通车辆随机变化，约一分钟完成默认赛程。

A/D 或左右键转向，S/下键刹车，W/上键/空格加速；支持画面拖动和触屏按钮。驶离公路会减速，持续两秒会损失一次机会。重试重新生成赛道。

[赛车图集](src/assets/racing-atlas.png)由内置 imagegen 生成，包含玩家车辆、交通车辆和棕榈树；[提示词与来源](src/assets/racing-art.txt)随开源仓库提供。图集随组件打包。

## 多语言与字体

组件和测试台自动按 `navigator.languages` 的优先顺序匹配简体中文、繁体中文、英文、日文、韩文、法文、德语、西班牙语、葡萄牙语；不支持的语言回退到英文。`zh-Hant`、`zh-TW`、`zh-HK`、`zh-MO` 使用繁体，`zh-Hans` 使用简体；`fr-CA`、`pt-BR` 等地区标签匹配对应语言。

开发者可传入 `locale: 'zh-TW'`，也可通过 `reset({ locale: 'ja' })` 切换实例语言。`getGames(locale)` 返回对应语言的游戏名称。测试台可通过 `?lang=ja` 等参数预览语言，不指定时跟随浏览器。

Fusion Pixel 12px 覆盖上述语言，随项目本地加载，无需访问字体 CDN。字体使用 [SIL OFL 1.1](third-party/fusion-pixel/OFL.txt)，可以免费使用、商用和随项目分发；保留 `lib/licenses/` 内的字体及上游授权。发布版本：`v2026.11.10`，来源：[TakWolf/fusion-pixel-font](https://github.com/TakWolf/fusion-pixel-font)。字体文件位于 `lib/fonts/`，与组件一同部署。

## 构建与测试

```sh
npm test            # 规则和验证生命周期测试
npm run typecheck   # TypeScript 检查
npm run build       # 测试台 + 可分发组件 + 类型声明
npm run preview     # 预览 dist，通常为 http://127.0.0.1:4173
```

- `dist/`：可静态部署的测试站点，包含 `examples/basic.html` 与它需要的 `lib/`。
- `lib/game-captcha.js`：ES Module 组件。
- `lib/game-captcha.umd.cjs`：UMD 构建，全局名称 `GameCaptcha`。
- `lib/game-captcha.css`：必须同时加载的组件样式。
- `lib/index.d.ts`：完整类型声明。

构建产物不提交 Git，由 CI 重建。组件不依赖网络字体、图片 CDN 或后端服务。

## 接入普通 HTML

先按上面的 GitHub 地址克隆仓库并运行 `npm ci`、`npm run build:lib`，把完整 `lib/`（包含 `fonts/`、`licenses/`）复制到接入项目的静态资源目录。下面路径按 HTML 所在目录解析，可按实际部署位置调整。用 HTTP 服务访问，不能直接双击 HTML 以 `file://` 打开 ES Module。完整可运行示例见 [`examples/basic.html`](examples/basic.html)：运行 `npm run dev` 后访问 `/examples/basic.html`。

```html
<link rel="stylesheet" href="./lib/game-captcha.css" />
<div id="captcha"></div>
<button id="enter" disabled>进入页面</button>

<script type="module">
  import { createCaptcha } from './lib/game-captcha.js';

  const enter = document.querySelector('#enter');
  const gate = createCaptcha('#captcha', {
    game: 'tetris',
    targetScore: 500,
    onStateChange({ state }) {
      // 重试 / 更换游戏时撤销上次的通行状态。
      enter.disabled = state !== 'passed';
    },
    onVerify(result) {
      console.log(result.game, result.score, result.durationMs);
    },
  });

  enter.addEventListener('click', () => {
    if (gate.getSnapshot().state === 'passed') {
      // 替换为你的页面地址；它仍需由业务端控制真正的访问权限。
      window.location.assign('./welcome.html');
    }
  });
</script>
```

## 在 Vite / React / Vue 中接入

当前未发布 npm 包。按上面的地址克隆并完成 `npm ci`、`npm run build:lib` 后，在消费项目执行 `npm install /absolute/path/to/game-captcha`（替换为本地克隆目录），即可使用下面的包名导入。也可将完整 `lib/` 放入静态目录，按 HTML 示例加载。

```ts
import { createCaptcha } from 'game-captcha';
import 'game-captcha/style.css';

const gate = createCaptcha(element, {
  game: 'random',
  targets: { tetris: 500, '2048': 128, minesweeper: 40, breakout: 240, fps: 5, adventure: 1, racing: 1500 },
  onVerify(result) {
    // 更新你应用中的通行状态。
  },
  onStateChange({ state }) {
    // state !== 'passed' 时撤销通行状态。
  },
});

// React effect cleanup / Vue onBeforeUnmount 中调用：
gate.destroy();
```

React 中在 `useEffect` 挂载到 `ref.current`，返回 `() => gate.destroy()`；Vue 在 `onMounted` 创建，在 `onBeforeUnmount` 清理。单页可同时使用多个独立实例。

### 配置与生命周期

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| `game` | `'tetris'` | 已注册的游戏 ID，或 `'random'` |
| `locale` | `'auto'` | 自动匹配浏览器语言；也可传入语言标签，如 `ja`、`fr-CA` |
| `autoStart` | `true` | 挂载、切换和重置后立即开始；传 `false` 可手动控制 |
| `targetScore` | 当前游戏默认值 | 正整数；不能超过该游戏最大目标 |
| `targets` | 无 | 按游戏设置目标，优先级高于 `targetScore` |
| `onVerify(result)` | 无 | 每局最多触发一次，通过后游戏停止 |
| `onStateChange(snapshot)` | 无 | 状态 / 得分变化时触发，也会在初始化时触发 |

`random` 模式从所有已注册游戏中选择，重置会重新抽取，可能连续抽到同一种。随机模式推荐使用 `targets`；共用的 `targetScore` 必须对所有候选游戏有效，否则会抛出 `RangeError`。

实例方法：`start()`、`pause()`、`resume()`、`reset(partialOptions?)`、`getSnapshot()`、`destroy()`。默认挂载后立即进入 `running`，无需开始按钮；配置 `autoStart: false` 时才停留在 `idle`。

状态流转：`idle → running → passed / failed`；`running ⇄ paused`。`reset()` 清空本局进度并按 `autoStart` 配置立即开始或等待。`reset()` 合并传入选项；要清除原配置，可显式传入 `targetScore: undefined` 或 `targets: undefined`。`destroy()` 清理动画、事件和 DOM，此后实例不再工作。

```ts
interface VerificationResult {
  game: string;
  score: number;
  targetScore: number;
  durationMs: number;   // 有效游戏时长，不含暂停
  completedAt: string; // ISO 8601 时间
}

interface CaptchaSnapshot {
  state: 'idle' | 'running' | 'paused' | 'passed' | 'failed';
  game: string;
  score: number;
  targetScore: number;
}
```

### 扩展新游戏

实现 `GameDefinition` 并调用 `registerGame(definition)`。完整接口在 [`src/types.ts`](src/types.ts)，现有游戏在 [`src/games/`](src/games/)。

```ts
import { registerGame, type GameDefinition } from 'game-captcha';

const customGame: GameDefinition = {
  id: 'your-game',
  name: '你的游戏',
  description: '一句话介绍',
  instructions: '操作方法',
  defaultTarget: 10,
  maxTarget: 100,
  scoreUnit: '分',
  controls: [{ action: 'reveal', symbol: '↵', label: '执行动作' }],
  create({ surface, reportScore, fail, announce }) {
    // 在 surface 内绘制游戏。
    // reportScore(累计分数)；fail('失败原因')；announce('操作提示')。
    return {
      start() {},
      pause() {},
      resume() {},
      action(action) {},
      destroy() {},
    };
  },
};
registerGame(customGame);
```

扩展游戏负责正确实现暂停与资源释放，不直接决定放行。框架统一校验目标、单次通过回调与过期会话隔离。重复注册同名游戏会报错。实时游戏可通过 `GameDefinition.keys` 配置按键，并在会话实现可选的 `setInput(action, pressed)` 接收按住、释放事件；框架在失焦、暂停和重置时释放按键，未实现此方法的游戏继续使用原有 `action()`。

## GitHub 开源与部署

仓库地址：`https://github.com/superwyh/game-captcha`；Pages 地址：`https://superwyh.github.io/game-captcha/`。Vite 使用相对资源路径 `base: './'`，同时适配根站点与 `https://<user>.github.io/<repository>/` 项目站点，无需写死仓库名。

1. 将源码及 `package-lock.json` 推送至 GitHub 的 `main` 或 `master` 分支。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 推送代码，或在 Actions 中手动运行 **Deploy demo to GitHub Pages**。
4. 工作流执行依赖安装、测试、类型检查与构建，随后将 `dist/` 部署到 Pages。
5. 部署成功后的网址见工作流环境 `github-pages`。首次部署需在仓库设置中启用 Pages。

`.github/workflows/ci.yml` 检查 PR；`pages.yml` 仅在默认分支推送或手动执行时部署，不把 PR 直接发布。部署作业仅授予 Pages 与 OIDC 必需权限。无需数据库、API key 或额外 Secrets。

协议：[MIT](LICENSE)。贡献规范：[CONTRIBUTING.md](CONTRIBUTING.md)。安全边界：[SECURITY.md](SECURITY.md)。

## 目录

```text
src/core.ts            注册、生命周期、目标判定、通关回调
src/types.ts           游戏扩展与公共 API 类型
src/games/            七种游戏的独立逻辑与渲染
src/style.css         可嵌入组件的独立样式
demo/                 配置测试台与演示欢迎页
examples/basic.html   最小 HTML 接入示例
tests/                游戏规则与框架回归测试
.github/workflows/    CI 与 GitHub Pages 部署
```
