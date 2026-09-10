# ReMix 共鸣 · 霓光回响

使用 Three.js 制作的非官方音乐节奏生存致敬作品。完整代码、美术几何与合成配乐均在本项目中，可直接运行，无需构建或安装依赖。

> 🎮 **直接试玩**：<https://leoliu-bot.github.io/sound-remix/>
> 仓库：<https://github.com/leoliu-bot/sound-remix>

## 仓库

- **远程**：<https://github.com/leoliu-bot/sound-remix>
- **Pages**：<https://leoliu-bot.github.io/sound-remix/>（由 `.github/workflows/pages.yml` 自动部署 `dist/`）
- **提交反馈/Issue**：<https://github.com/leoliu-bot/sound-remix/issues>
- **CI**：`.github/workflows/ci.yml` 在 Node 20 / 22 矩阵上跑 `scripts/check.mjs`

## 开始游戏

### 在线试玩

直接打开 <https://leoliu-bot.github.io/sound-remix/> 即可。如果浏览器还在加载，刷新一次。

### 本地运行

安装 Node.js 20+ 后，在此目录运行：

```powershell
node server.mjs
```

访问 http://127.0.0.1:4173 。不要直接双击 `dist/index.html`，浏览器的本地文件限制会阻止模块加载。

## 操作

| 操作 | 键位 |
| --- | --- |
| 移动 | WASD / 方向键 |
| 节拍重音 | 鼠标左键 / J |
| 闪避 | 空格 / Shift |
| 共鸣爆发 | Q / K |
| 暂停、继续 | Esc |
| 升级三选一 | 1 / 2 / 3 |

移动端支持虚拟摇杆、闪避和爆发按钮，点击战场打出重音。角色会自动随节拍攻击；合拍转向触发音障。收集青色经验音符，招募乐手并组合芯片。02:30 出现最终首领，击败后获胜，没有强制三分钟失败限制。

## 已实现

- 3 位角色、不同速度、生命、攻击方式和 BPM。
- 自动节拍攻击、Perfect / Good 判定、准确转向音障、闪避无敌、共鸣爆发。
- 吉他、贝斯、提琴、鼓手组成的跟随乐队；招募会加入新的合成音乐声部。
- 12 种升级、等级成长、拾取磁吸、环绕音符、分裂与穿透构筑。
- 4 类普通敌人与最终首领；冲锋、射击、范围攻击均有视觉预警。
- 体素街区、暖光商店、植被、粒子、动态光圈、命中反馈和伤害数字。
- 暂停、升级冻结、结算、重开、音量、画质、镜头震动选项；最高分和偏好保存在当前浏览器。
- 切换后台自动暂停，音频时钟同步暂停。

## 验证

```powershell
node scripts/check.mjs
```

验证模块语法、资源和 UI 引用，运行三个角色的战斗模拟与一个不使用手动重音的模拟，并覆盖暂停、升级、实体数量上限、首领胜利、死亡、重新开始和清理。模拟不等于真实浏览器画面或设备性能测试。

浏览器控制台中的 `remixDiagnostics()` 返回当前帧率、绘制次数、实体数量与音频状态。

## 文件

- `dist/world.js`：Three.js 场景、批量体素角色、特效与相机。
- `dist/game.js`：战斗、敌人、首领、升级与流程。
- `dist/audio.js`：Web Audio 合成器及分层节拍音乐。
- `dist/main.js`：界面、输入、设置、状态和渲染循环。
- `docs/REFERENCE.md`：网上整理的原作机制、来源与本版本的改编范围。
- `.github/workflows/pages.yml`：把 `dist/` 部署到 GitHub Pages。
- `.github/workflows/ci.yml`：在 Node 20 / 22 上跑 `scripts/check.mjs`。

## 范围与致谢

这是单场景、可完整游玩的浏览器原型，不能等同于商业 AAA 游戏的内容规模与生产质量，也不是原作全量复刻。场景和音乐为程序生成，没有提取原作贴图、角色精灵或音频。ReMix 名称及原作归 GameSmith 所有。Three.js r180 使用 MIT 许可证，完整许可证位于 `dist/vendor/THREE-LICENSE.txt`。网页字体使用 Google Fonts，网络不可用时自动回退到系统字体；核心游戏资源均在本地。

## 发布（仓库维护者）

`scripts/publish.ps1` 会用 `GH_TOKEN` 环境变量创建/更新 `sound-remix` 仓库并推送 main 分支。**不要把 token 写到任何文件里**：

```powershell
# 1. 在 https://github.com/settings/tokens 生成一个
#    Fine-grained token：仅勾选 Contents: Read & Write，
#    仅作用于 leoliu-bot/sound-remix 仓库，设置 30 天过期。
# 2. 撤销上一轮已泄露的 token（在聊天记录里贴出过的那一个）。

$env:GH_TOKEN = 'ghp_把新token贴到这里'   # 退出 shell 后自动失效
pwsh -ExecutionPolicy Bypass -File scripts/publish.ps1
Remove-Item Env:\GH_TOKEN                  # 立即清空
```

第一次 push 完成后到 GitHub 仓库的 **Settings → Pages**，Source 会显示 "GitHub Actions" 自动绑定到 `pages.yml`，首次部署需要点一下 "Approve" 授权。1–2 分钟后访问 <https://leoliu-bot.github.io/sound-remix/> 即可。

## 许可

MIT — 见 [LICENSE](LICENSE)。Three.js 沿用其各自的 MIT 许可（`dist/vendor/THREE-LICENSE.txt`）。
