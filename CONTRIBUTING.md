# 参与 Arcade CAPTCHA

欢迎提交问题、修复或新的小游戏。请先在 issue 中描述较大的规则、API 或视觉变更。

1. 使用 Node.js 22.12+，运行 `npm ci` 和 `npm run dev`。
2. 核心验证流程位于 `src/core.ts`，各游戏只负责规则、绘制和输入。
3. 游戏逻辑变更需添加覆盖规则或回归的测试；避免只测试实现细节。
4. 提交前运行 `npm test`，首次安装 `npx playwright install chromium`，然后运行 `npm run test:browser`（包含生产构建）。
5. 检查组件、手机布局、暂停/重试、多实例和通过回调。

新增游戏遵循 `GameDefinition` / `GameSession` 协议，设置默认目标和目标上限。页面跳转由调用方处理，游戏销毁时清理事件与动画。界面沿用黑白像素风格，游戏素材保留各自配色。不引入跟踪脚本。

游戏原图保存在 `src/assets/`，`npm run prepare:assets` 生成实际渲染尺寸的图集，构建和测试会自动执行。新增内置游戏时，同时更新 `src/index.ts`、`vite.lib.config.ts` 和 `package.json` 的分游戏导出。浏览器回归位于 `tests/browser/`，失败截图与 trace 输出到 `.qa/browser-results/`。

Pull request 请说明问题、改变后的行为和验证方法。贡献采用项目的 MIT 协议。
