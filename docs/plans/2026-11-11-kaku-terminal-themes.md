# Kaku terminal themes — Electron Zawo 1.17.0

Add selectable Kaku Light and Kaku Dark palettes, based on the locally installed Kaku 0.19.0 bundled Resources/kaku.lua. The user's Kaku profile selects Light. Match terminal background, foreground, ANSI colors, cursor, selection and terminal chrome, retaining the existing library sidebar and original themes. Theme selection saves immediately and updates existing panes; new panes inherit it. Preserve font size and scrollback controls.

Scope: Electron only; the Native preview remains archived. Kaku uses WezTerm and separate foreground/background remapping. xterm cannot reproduce that remapping directly: ANSI black remains dark in the dark preset to preserve TUI backgrounds, and truecolor program output is not rewritten. Fonts remain Zawo's existing system monospace stack. Dark chrome muted text is slightly lighter for legibility. Kaku MIT notice is shipped in ui/KAKU-LICENSE.txt.

Validation: preference restart persistence and unknown-value rejection; UI tests switch all five themes with live split shells, check tab/search/canvas colors, and verify new-pane inheritance. Full existing tests cover SSH/SFTP/forwarding and browser regressions. Production upgrade requires preserving user sessions until approved if any are active.

## Verified locally

- `npm test`: 80 core tests and 59 integration checks passed; log: `logs/kaku-theme-tests.log`.
- Native mouse clicks in an isolated Electron profile: selected both Kaku themes, closed/reopened Settings and confirmed automatic persistence. ANSI-colored shell output, Chinese text and focused bar cursor were inspected visually.
- `npm run package:release`: Developer ID signing and deep/strict codesign verification passed.
- The signed 1.17.0 application launched with `--screenshot` in an isolated capture profile and produced `shots/kaku-release-startup.png`.
- User authorized immediate installation. Installed 1.17.0 after quitting 1.16.2; bundle signature and app.asar match verified. Installation launched normally without a Keychain prompt. Native mouse/keyboard verification selected Kaku Light and ran a real colored shell command; preferences.json confirms the saved choice. Old bundle retained under artifacts/upgrade-1.17.0-20261111-131852.
- App and DMG notarization accepted; tickets stapled and Gatekeeper accepted both. Release: dist/release/Zawo-1.17.0-arm64.dmg.
