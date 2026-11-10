# Development and releases

## Layout

- `src/`: Electron main process, isolated preload, renderer and application services.
- `test/`: unit, loopback integration, UI and optional manual acceptance fixtures.
- `scripts/`: UI build, icon generation, bundle preparation, signing and notarization.
- `assets/awzo.png`: current icon artwork; its historical filename is retained.
- `ui/`, `dist/`, `logs/`, `shots/`: generated output, excluded from Git.

## Setup and tests

Use Node.js 24 LTS (`.nvmrc`), then run `npm ci` followed by `npm run build`. Postinstall prepares the Electron runtime and the Apple Silicon node-pty helper. `npm start` uses the regular application profile; `npm test` uses an isolated temporary profile.

The local Node.js 26.12.0 environment exited during Electron ZIP extraction without reporting an installer error; Node.js 24.22.2 completed the same installation. Postinstall checks that the executable actually exists and fails if installation is incomplete.

Commands:

| Command | Purpose |
|---|---|
| `npm run test:core` | Node tests for storage, networking, forwarding, files, backups and browser policy / CLI |
| `npm test` | Core tests plus real Electron / PTY / SSH / SFTP / UI integration |
| `npm run test:browser` | Browser, sandbox, downloads, forwarding and responsive layout integration |
| `npm run test:browser-memory` | Real webpage disposal, renderer exit, lazy restore, downloads and memory samples |

The UI tests require an interactive macOS desktop and may require approval for the test Electron app to access its Keychain-backed safeStorage key. They are not headless Linux tests. Browser layout capture uses Python 3 and Pillow; install Pillow in your preferred Python environment before running that suite. If your shell globally injects unsupported `NODE_OPTIONS`, run the Electron test command with `env -u NODE_OPTIONS`.

`test/agent-*.cjs`, `test/installed-default-browser.cjs` and `test/google-browser-check.cjs` are explicit opt-in acceptance tools. Some use installed, authenticated AI CLIs or external websites; they are not part of the default regression commands. Do not run them as unattended CI checks.

## Local package

```sh
npm run package
```

Output: `dist/mac-arm64/Zawo.app`, signed ad hoc for local use. It has not been notarized by this command.

## Developer ID release

1. Install your own valid **Developer ID Application** certificate and private key in the macOS Keychain. If multiple matching identities exist, select one with `ZAWO_SIGN_IDENTITY`.
2. Build and sign:

   ```sh
   npm run package:release
   ```

   Output: `dist/release/mac-arm64/Zawo.app`. The script prepares the compatible bundle/helper names, signs nested Mach-O binaries with Hardened Runtime and secure timestamps, then verifies the entire bundle. At this stage it is signed, not yet notarized.

3. Store notarization credentials interactively in Keychain using `xcrun notarytool store-credentials`. Never commit passwords, `.p8` files, exported certificates or Keychain databases. The developer team must have accepted Apple's current agreements.
4. Notarize and create the final DMG:

   ```sh
   ZAWO_NOTARY_PROFILE=your-profile npm run notarize:release
   ```

   The script submits the app ZIP, waits for acceptance, staples the app, creates/signs the DMG, submits the DMG, staples it and verifies both artifacts with Gatekeeper. Credentials are referenced only by Keychain profile name.

Only distribute after `Notarized release ready` appears. Output: `dist/release/Zawo-<version>-arm64.dmg` and `.dmg.sha256`. A failed run can leave intermediate artifacts; these are not finished releases. Submission records are saved in `app-notarization.json` and `dmg-notarization.json`. Inspect a pending submission with `xcrun notarytool info <id> --keychain-profile <profile>` before retrying.

Before publishing, mount the final DMG read-only, verify the contained app and Applications link, and launch it with an isolated profile:

```sh
/path/to/Zawo.app/Contents/MacOS/Zawo --screenshot /absolute/path/to/startup.png
```

The established bundle ID (`local.harbor.terminal`), private bundle/helper names and profile directory remain stable for upgrade compatibility. The display name is Zawo. Developer ID and notarization credentials are not required to run source tests or build an ad-hoc local app.
