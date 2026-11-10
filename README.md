<p align="center">
  <img src="assets/awzo.png" width="96" height="96" alt="Zawo">
</p>
<h1 align="center">Zawo</h1>
<p align="center">本地终端、SSH 与网页预览，一个 macOS 工作空间。</p>
<p align="center">
  <a href="https://github.com/mailbobg/zawo/releases/latest"><img src="https://img.shields.io/github/v/release/mailbobg/zawo?color=287653" alt="GitHub release"></a>
  <img src="https://img.shields.io/badge/macOS-Apple_Silicon-287653" alt="macOS Apple Silicon">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-287653" alt="MIT License"></a>
</p>
<p align="center"><strong>简体中文</strong> · <a href="README.en.md">English</a> · <a href="README.de.md">Deutsch</a></p>
<p align="center"><a href="https://github.com/mailbobg/zawo/releases/latest">下载</a> · <a href="CHANGELOG.md">更新记录</a> · <a href="docs/DEVELOPMENT.md">开发文档</a> · <a href="https://github.com/mailbobg/zawo/issues">反馈问题</a></p>

Zawo 将主机管理、多终端分屏、SFTP 文件传输、端口转发和右侧浏览器放在一个桌面窗口中。

项目起步于一次使用 **[Craft Anything](https://github.com/storytold/craft-anything) 复刻 [Termius](https://termius.com/) 核心体验**的实践，随后逐步发展为可独立使用的本地应用。

![Zawo：两个独立终端与右侧项目实时预览](docs/screenshots/browser.png)

[功能](#features) · [安装](#installation) · [功能截图](#screenshots) · [浏览器与 CLI](#browser-cli) · [项目来源](#origins) · [数据与功能边界](#data-and-limitations) · [从源码运行](#development) · [参与贡献](#contributing) · [许可证](#license)

<a id="features"></a>

## 功能

| 功能 | 可以做什么 |
|---|---|
| 本地终端 | 从 **This Mac** 直接打开本地 shell，无需开启系统 SSH 服务 |
| SSH 与跳板机 | 使用密码或私钥连接远程主机，支持多级跳板机、首次主机指纹确认和变更阻断 |
| 多终端工作空间 | 多标签、拖拽分屏、调整窗格尺寸、焦点模式、终端查找、快捷键提示和布局模板 |
| 主机管理 | 创建主机与分组，按标签筛选，搜索和排序；编辑自动保存 |
| SFTP 文件管理 | 双栏浏览本地和远程文件，上传 / 下载文件与目录，管理传输队列、取消、重试和文件权限 |
| 端口转发 | 本地 TCP、远程 TCP、动态 SOCKS5 转发，可配置断线重连，并从本地转发直接打开网页预览 |
| 右侧浏览器 | 多标签、后退 / 前进、地址搜索、缩放和下载管理；按需打开，关闭后释放网页资源 |
| AI CLI 联动 | `zawo browser open` 打开右侧浏览器；提供 Codex、Claude Code、Gemini CLI、OpenCode 的规则配置入口 |
| 命令与凭据 | 保存 Snippets，复用密钥，查看 Known Hosts 和连接日志；可显式开启工作空间广播输入 |
| 备份与迁移 | 加密配置备份与恢复、主机 JSON 导入 / 导出、OpenSSH 配置迁移 |

<a id="installation"></a>

## 安装

1. 在 **[Releases](https://github.com/mailbobg/zawo/releases/latest)** 下载 `Zawo-<版本>-arm64.dmg`。
2. 打开 DMG，将 **Zawo** 拖入 **Applications（应用程序）**。
3. 启动 Zawo，选择 **This Mac** 打开本地终端，或通过 **New host** 添加 SSH 连接。

已发布的 **1.16.2** DMG 使用 Developer ID 签名并通过 Apple 公证，同时提供 SHA-256 校验文件。

当前安装包适用于 **Apple 芯片 Mac**。升级前退出 Zawo，正在运行的终端会话会结束。应用界面目前为英文；顶部语言链接用于切换本文档。

<a id="screenshots"></a>

## 功能截图

以下为 **Zawo 1.16.2 实际运行截图**，使用隔离的演示配置、本机临时 SSH / SFTP 服务和示例文件。截图中的主机与文件不来自个人服务器；网页为经真实 SSH 转发加载的演示页面。


### 主机管理

打开本地终端，按分组管理主机，并配置经跳板机连接的远程主机。

![Zawo 主机管理：本地终端、主机卡片、分组与跳板机](docs/screenshots/hosts.png)

<details>
<summary><strong>多终端分屏</strong></summary>

将终端标签拖入工作区即可组合分屏。每个窗格运行独立会话，可调整尺寸，也可切换到单窗格焦点模式。

![Zawo 多终端工作空间：两个独立 shell 并排运行](docs/screenshots/terminal-split.png)

</details>

<details>
<summary><strong>SFTP 双栏文件管理</strong></summary>

左侧选择本地目录，右侧连接远程主机。文件和目录可以通过操作菜单或拖拽传输，并在队列中查看进度。

![Zawo SFTP：本地与已连接远程目录的双栏文件列表](docs/screenshots/sftp.png)

</details>

<details>
<summary><strong>端口转发</strong></summary>

保存转发规则，按需启动或停止。适用于通过 SSH 访问远程 Web 服务、数据库等 TCP 服务；本地 Web 转发支持直接打开右侧浏览器。

![Zawo 端口转发：正在运行的本地 Web 预览转发规则](docs/screenshots/port-forwarding.png)

</details>

<details>
<summary><strong>Snippets 常用命令</strong></summary>

将常用命令保存为片段，在需要时选择目标终端执行，减少重复输入。

![Zawo Snippets：保存和管理常用终端命令](docs/screenshots/snippets.png)

</details>

<a id="browser-cli"></a>

## 浏览器与 CLI

启动 Zawo 后，在终端运行：

```sh
# 新建空白标签页
zawo browser open

# 打开网站或本地开发服务
zawo browser open 'https://example.com'
zawo browser open 'http://localhost:3000'
```

CLI 辅助程序位于 `~/.local/bin/zawo`。如果 shell 尚未找到命令，可先运行：

```sh
export PATH="$HOME/.local/bin:$PATH"
```

远程 SSH 会话需要先在 Zawo 中启用该会话的 CLI 浏览器访问，再按界面提示配置 PATH。远程服务的 loopback URL 可通过会话专属转发在本机浏览器中预览。关闭 SSH 会话会撤销对应访问和临时转发。

在 **Help → AI Tool Integrations** 中可以配置 Codex、Claude Code、Gemini CLI、OpenCode 或复制通用规则。该命令负责打开页面，不提供网页读取或自动点击能力。

**按需打开。** 浏览器默认关闭，只有手动点击或通过 CLI 调用时才打开。

**内存释放。** 1.16.2 关闭右侧栏时会释放所有网页实例及渲染进程，并保留标签、网址、历史、缩放、会话 cookie 和转发关联。重新打开时只加载当前标签，其他标签点击后再恢复。已开始的下载和 SSH 转发继续运行。

页面恢复时会重新加载。浏览历史可以恢复，但网页的临时 JavaScript 状态和未提交内容不保证保留。侧栏保持打开时，普通标签切换仍保留页面状态。

<a id="origins"></a>

## 项目来源

- **复刻参考：Termius。** 初期以 macOS 版 Termius 的可见界面与操作流程为参考，重建主机列表、右侧编辑面板、多标签终端、拖拽分屏、SFTP、端口转发和 Snippets 等常用功能。
- **生成工具：Craft Anything。** 首版使用 Craft Anything CLI，通过 Codex CLI 执行 Study → Build → Check 流程，生成 Electron 应用、基础服务、测试和打包配置。后续持续对照实际操作补齐功能、修正交互，并进行真实终端、SSH / SFTP 和桌面应用验证。
- **实现方式：独立实现。** 起步采用 Clean room 模式，依据界面观察和行为描述编写代码，未复制 Termius 的程序源码、品牌图标或用户数据。Zawo 不是 Termius 官方产品，也不承诺覆盖原版全部能力。
- **后续设计。** 当前浅绿灰配色和连贯的左右栏参考 macOS Find My（查找）；右侧浏览器的布局与交互参考 Codex / Claude 桌面应用。软件使用自己的 Zawo 名称和图标。

Craft Anything 提供了首版基础；当前版本还包含后续开发、测试、签名与公证工作。

<a id="data-and-limitations"></a>

## 数据与功能边界

配置保存在本机，敏感凭据通过 Electron safeStorage 和 macOS 钥匙串加密。出于升级兼容，配置目录仍为 `~/Library/Application Support/Harbor Terminal`，内部 bundle ID 为 `local.harbor.terminal`；应用显示名称为 Zawo。

- 不提供云同步或自动更新。
- 转发使用 TCP；动态代理支持 SOCKS5 CONNECT，不支持 UDP。
- 工作空间模板恢复布局并启动新会话，不恢复之前的进程或终端滚动历史。
- 网页运行在独立沙箱中，不能访问应用的 Node.js / IPC 接口。

<a id="development"></a>

## 从源码运行

需要 macOS、Node.js 24 LTS 和 npm；使用仓库的 `.nvmrc` 选择 Node 版本。本次源码验证使用 Apple Silicon、Node.js 24.22.2。

```sh
git clone https://github.com/mailbobg/zawo.git
cd zawo
npm ci
npm run build
npm start
```

测试与本地打包：

```sh
npm run test:core
npm test
npm run test:browser
npm run test:browser-memory
npm run package
```

完整 UI 测试需要 macOS 图形会话；浏览器布局截图测试还需要 `python3` 和 Pillow。测试使用临时配置、loopback SSH / HTTP 服务和一次性凭据。详见 [开发说明](docs/DEVELOPMENT.md)（英文）。

`npm run package` 生成本地临时签名版。正式发布需要自己的 Developer ID 证书和公证凭据，流程见开发说明。源码仓库不包含证书、账号凭据、个人主机配置、运行日志或已安装应用备份。

<a id="contributing"></a>

## 参与贡献

欢迎提交问题反馈、文档改进和 Pull Request。[反馈问题](https://github.com/mailbobg/zawo/issues)时，请提供 Zawo 版本、macOS 版本、复现步骤和预期行为，并移除日志或截图中的凭据与私人主机信息。

修改文档时，请同步维护中、英、德三版。三版共用同一组截图，重新截图的方法见[开发说明](docs/DEVELOPMENT.md#readme-screenshots)。

<a id="license"></a>

## 许可证

Electron 41.3.0、xterm.js、node-pty、ssh2、esbuild 和 electron-builder。感谢 [Craft Anything](https://github.com/storytold/craft-anything) 提供应用生成工作流，以及 [Termius](https://termius.com/) 提供最初的功能与交互参考。

项目采用 [MIT License](LICENSE)，第三方依赖遵循各自的许可证。
