<p align="center">
  <img src="assets/awzo.png" width="96" height="96" alt="Zawo">
</p>
<h1 align="center">Zawo</h1>
<p align="center">Local terminals, SSH and web previews. One workspace for macOS.</p>
<p align="center">
  <a href="https://github.com/mailbobg/zawo/releases/latest"><img src="https://img.shields.io/github/v/release/mailbobg/zawo?color=287653" alt="GitHub release"></a>
  <img src="https://img.shields.io/badge/macOS-Apple_Silicon-287653" alt="macOS Apple Silicon">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-287653" alt="MIT License"></a>
</p>
<p align="center"><strong>English</strong> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.de.md">Deutsch</a></p>
<p align="center"><a href="https://github.com/mailbobg/zawo/releases/latest">Download</a> · <a href="CHANGELOG.md">Changelog</a> · <a href="docs/DEVELOPMENT.md">Development</a> · <a href="https://github.com/mailbobg/zawo/issues">Report an issue</a></p>

Zawo brings host management, split terminals, SFTP file transfers, port forwarding and a browser sidebar into a single desktop window.

The project began as an experiment using **[Craft Anything](https://github.com/storytold/craft-anything) to recreate the core experience of [Termius](https://termius.com/)** and has since evolved into a standalone local application.

![Zawo: two terminal sessions alongside a live project preview](docs/screenshots/browser.png)

[Features](#features) · [Installation](#installation) · [Screenshots](#screenshots) · [Browser & CLI](#browser-cli) · [Project origins](#origins) · [Data & limitations](#data-and-limitations) · [Build from source](#development) · [Contributing](#contributing) · [License](#license)

<a id="features"></a>

## Features

| Feature | What you can do |
|---|---|
| Local terminal | Open a local shell from **This Mac**, without enabling the system SSH service |
| SSH & jump hosts | Connect with a password or private key, use multi-hop jump hosts, verify new host fingerprints and block changed keys |
| Terminal workspaces | Use tabs, drag-to-split panes, resizable layouts, focus mode, terminal search, shortcut hints and layout templates |
| Host management | Organize hosts into groups, filter by tags, search and sort; edits save automatically |
| SFTP | Browse local and remote files side by side, transfer files and directories, manage queues, cancel or retry transfers and edit permissions |
| Port forwarding | Create local TCP, remote TCP and dynamic SOCKS5 forwards, enable reconnection and open local web forwards in the sidebar |
| Browser sidebar | Use tabs, back / forward, address search, zoom and downloads; open it on demand and release webpage resources when it closes |
| AI CLI integration | Open the sidebar with `zawo browser open`; configure rules for Codex, Claude Code, Gemini CLI and OpenCode |
| Commands & credentials | Save snippets, reuse keys, inspect known hosts and connection logs, and explicitly enable input broadcasting to a workspace |
| Backup & migration | Export and restore encrypted configuration backups, import / export host JSON and migrate OpenSSH configuration |

Choose **Zawo → Settings… (⌘,)** → **Theme** for Kaku Light (cream) or Kaku Dark (purple-black), alongside the original palettes. Theme changes save automatically and apply to existing and new terminal panes. Colors are adapted from [Kaku](https://github.com/tw93/Kaku); see the [MIT notice](docs/KAKU-LICENSE.txt).

<a id="installation"></a>

## Installation

1. Download `Zawo-<version>-arm64.dmg` from **[Releases](https://github.com/mailbobg/zawo/releases/latest)**.
2. Open the DMG and drag **Zawo** into **Applications**.
3. Launch Zawo. Choose **This Mac** for a local terminal or **New host** to add an SSH connection.

The published **1.17.6** DMG is signed with Developer ID and notarized by Apple. A SHA-256 checksum file is included.

Packages currently target **Apple Silicon Macs**. Quit Zawo before upgrading; running terminal sessions will end. The application interface is currently in English; the language links above switch this documentation.

<a id="screenshots"></a>

## Screenshots

These are real **Zawo 1.16.2** screenshots captured with an isolated demo profile, temporary loopback SSH / SFTP services and sample files. The preview page is loaded through a real SSH port forward. No personal server data appears in the images.

### Host management

Open a local terminal, organize hosts into groups and configure connections through jump hosts.

![Zawo host library with This Mac, groups and example remote hosts](docs/screenshots/hosts.png)

<details>
<summary><strong>Split terminals</strong></summary>

Drag a terminal tab into the workspace to create a split. Each pane has its own session; resize panes or switch to focus mode.

![Two independent local shell sessions in a split workspace](docs/screenshots/terminal-split.png)

</details>

<details>
<summary><strong>SFTP file manager</strong></summary>

Select a local directory on the left and connect to a remote host on the right. Transfer files and folders through actions or drag and drop.

![Connected local and remote directory listings in Zawo](docs/screenshots/sftp.png)

</details>

<details>
<summary><strong>Port forwarding</strong></summary>

Save rules and start or stop them as needed. Access remote web services, databases and other TCP services over SSH; local web forwards can open directly in the sidebar.

![An active local SSH forwarding rule with an Open in browser action](docs/screenshots/port-forwarding.png)

</details>

<details>
<summary><strong>Command snippets</strong></summary>

Save frequently used commands and select a target terminal when you want to run them.

![Saved terminal commands in the Snippets library](docs/screenshots/snippets.png)

</details>

<a id="browser-cli"></a>

## Browser & CLI

Start Zawo, then run:

```sh
# Open a new blank tab
zawo browser open

# Open a website or a local development server
zawo browser open 'https://example.com'
zawo browser open 'http://localhost:3000'
```

The helper is installed at `~/.local/bin/zawo`. If your shell cannot find it:

```sh
export PATH="$HOME/.local/bin:$PATH"
```

For a **remote SSH session**, first enable that session's CLI browser access in Zawo, then apply the PATH setup shown in the interface. Loopback URLs on the remote host can be previewed locally through a session-specific forward. Closing the SSH session revokes its access and removes its temporary forwards.

Use **Help → AI Tool Integrations** to configure Codex, Claude Code, Gemini CLI or OpenCode, or copy generic instructions for another tool. The command opens pages; it does not provide page reading or automated clicking.

**On-demand browsing.** The sidebar starts closed and opens only when you click its button or invoke it through the CLI.

**Memory release.** In 1.16.2, closing the sidebar disposes of all webpage instances and their renderer processes while retaining tab metadata, URLs, history, zoom, session cookies and forwarding associations. Reopening loads only the active tab; other tabs load when selected. Downloads already in progress and SSH forwards continue running.

Restored pages reload. Browsing history is retained, but temporary JavaScript state and unsaved page content are not guaranteed to survive. Switching tabs while the sidebar remains open preserves page state.

<a id="origins"></a>

## Project origins

- **Reference application: [Termius](https://termius.com/).** The initial implementation followed the observable interface and workflows of Termius for macOS: host lists, docked editors, terminal tabs, drag-to-split workspaces, SFTP, forwarding and snippets.
- **Generation workflow: [Craft Anything](https://github.com/storytold/craft-anything).** The first version used the Craft Anything CLI with Codex CLI to run Study → Build → Check, producing the Electron foundation, core services, tests and packaging configuration. Subsequent development refined interactions, added features and verified real terminal, SSH / SFTP and desktop behavior.
- **Independent implementation.** The project started in Clean room mode, using interface observations and behavior descriptions rather than copying Termius source code, brand icons or user data. Zawo is not an official Termius product and does not claim feature parity.
- **Later design references.** The muted green-gray palette and continuous sidebar layout draw on macOS Find My. The browser sidebar draws on the Codex and Claude desktop apps. Zawo uses its own name and icon.

Craft Anything provided the starting point. The current application also includes subsequent development, testing, signing and notarization work.

<a id="data-and-limitations"></a>

## Data & limitations

Configuration stays on your machine. Sensitive credentials are encrypted using Electron safeStorage backed by the macOS Keychain. For upgrade compatibility, the profile directory remains `~/Library/Application Support/Harbor Terminal` and the bundle ID remains `local.harbor.terminal`; the displayed app name is Zawo.

- No cloud sync or automatic updates.
- Forwarding uses TCP. The dynamic proxy supports SOCKS5 CONNECT, not UDP.
- Workspace templates restore layouts and start new sessions; they do not restore previous processes or terminal scrollback.
- Web content runs in a separate sandbox without access to the application's Node.js or IPC interfaces.

<a id="development"></a>

## Build from source

Requires **macOS, Node.js 24 LTS and npm**. Use `.nvmrc` to select the Node version. Source checkout validation used Apple Silicon and Node.js 24.22.2.

```sh
git clone https://github.com/mailbobg/zawo.git
cd zawo
npm ci
npm run build
npm start
```

Tests and local packaging:

```sh
npm run test:core
npm test
npm run test:browser
npm run test:browser-memory
npm run package
```

Full UI tests require an interactive macOS desktop. Browser layout screenshot tests also require `python3` and Pillow. Tests use temporary profiles, loopback SSH / HTTP services and disposable credentials. See the [development guide](docs/DEVELOPMENT.md) (English).

`npm run package` creates an ad-hoc-signed local build. A formal release requires your own Developer ID certificate and notarization credentials. The repository does not contain signing certificates, account credentials, personal host configuration, runtime logs or installed-app backups.

<a id="contributing"></a>

## Contributing

Bug reports, documentation improvements and pull requests are welcome. When [reporting an issue](https://github.com/mailbobg/zawo/issues), include your Zawo version, macOS version, steps to reproduce and the expected behavior. Remove credentials and private host details from logs or screenshots.

When changing documentation, keep the Chinese, English and German versions consistent. All three share the same screenshots; the [development guide](docs/DEVELOPMENT.md#readme-screenshots) explains how to refresh them.

<a id="license"></a>

## License

Built with Electron 41.3.0, xterm.js, node-pty, ssh2, esbuild and electron-builder.

Licensed under the [MIT License](LICENSE). Third-party dependencies retain their respective licenses. Thanks to [Craft Anything](https://github.com/storytold/craft-anything) for the generation workflow and [Termius](https://termius.com/) for the initial functional and interaction reference.
