# Zawo

<img src="assets/awzo.png" width="96" alt="Zawo icon">

面向 macOS Apple 芯片的本地终端、SSH / SFTP 工作空间，带拖拽分屏、端口转发和右侧浏览器。

[下载最新版本](https://github.com/mailbobg/zawo/releases/latest) · [更新记录](CHANGELOG.md) · [开发与签名](docs/DEVELOPMENT.md)

## 安装

在 [Releases](https://github.com/mailbobg/zawo/releases) 下载 `Zawo-<版本>-arm64.dmg`，打开后将 Zawo 拖入 Applications。仓库发布的 1.16.2 DMG 已使用 Developer ID 签名并通过 Apple 公证，同时提供 SHA-256 校验文件。

当前提供 Apple 芯片 Mac 安装包。升级前退出应用，正在运行的终端会话会结束。

## 功能

- **本地与远程终端**：This Mac 直接启动本地 shell，无需开启 SSH；远程连接支持密码、私钥和多级跳板机。
- **工作空间**：终端标签、鼠标拖拽分屏、焦点模式、查找、快捷键提示、显式开启的广播输入和布局模板。
- **主机管理**：分组、标签、搜索、筛选、排序、密钥管理、已知主机校验与自动保存。
- **SFTP**：本地 / 远程文件浏览、文件和目录传输、队列、取消、重试及权限编辑。
- **端口转发**：本地、远程和动态 SOCKS5 转发，多级跳板机和可选断线重连。
- **右侧浏览器**：多标签、后退 / 前进、地址或搜索、缩放、下载管理，以及从运行中的本地转发打开网页。
- **CLI 浏览器入口**：本地命令和已启用权限的 SSH 会话可以打开 Zawo 浏览器；支持为 AI CLI 配置使用规则。
- **备份与迁移**：加密配置备份、恢复、主机 JSON 导入 / 导出及 OpenSSH 配置迁移。

## 打开右侧浏览器

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

## 浏览器内存

1.16.2 关闭右侧栏时会释放所有网页实例及渲染进程，并保留标签、网址、历史、缩放、会话 cookie 和转发关联。重新打开时只加载当前标签，其他标签点击后再恢复。已开始的下载和 SSH 转发继续运行。

页面恢复时会重新加载。浏览历史可以恢复，但网页的临时 JavaScript 状态和未提交内容不保证保留。侧栏保持打开时，普通标签切换仍保留页面状态。

## 数据与范围

配置保存在本机，敏感凭据通过 Electron safeStorage 和 macOS 钥匙串加密。出于旧版本兼容，配置目录仍为 `~/Library/Application Support/Harbor Terminal`，内部 bundle ID 为 `local.harbor.terminal`；应用显示名称为 Zawo。

当前版本不提供云同步或自动更新。转发使用 TCP；动态代理支持 SOCKS5 CONNECT，不支持 UDP。工作空间模板恢复布局和新会话，不恢复之前的进程或终端滚动历史。浏览器是独立的沙箱内容，不能访问应用的 Node.js / IPC 接口。

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

完整 UI 测试需要 macOS 图形会话；浏览器布局截图测试还需要 `python3` 和 Pillow。测试使用临时配置、loopback SSH / HTTP 服务和一次性凭据。详见 [开发说明](docs/DEVELOPMENT.md)。

`npm run package` 生成本地临时签名版。正式发布需要自己的 Developer ID 证书和公证凭据，流程见开发说明。源码仓库不包含证书、账号凭据、个人主机配置、运行日志或已安装应用备份。

## 技术与许可证

Electron 41.3.0、xterm.js、node-pty、ssh2、esbuild 和 electron-builder。项目起步参考 [Craft Anything](https://github.com/storytold/craft-anything) 的本地应用原型流程。

项目采用 [MIT License](LICENSE)，第三方依赖遵循各自的许可证。
