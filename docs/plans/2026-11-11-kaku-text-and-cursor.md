# Kaku text legibility and cursor defaults — 1.17.3

The installed Kaku configuration explicitly sets `text_min_contrast_ratio = 3.0`, `bold_brightens_ansi_colors = false`, and a blinking bar default. Zawo copied the ANSI palette but retained xterm's 1:1 contrast default. Codex emits 256-color/truecolor status text outside ANSI 0–15: a representative pale gold was only 1.33:1 on Kaku Light. Changing the ANSI palette alone could never fix it.

Kaku themes now use xterm's built-in 3:1 contrast adjustment for all rendered text colors. Dark backgrounds retain the original bright colors when already readable. Other themes retain their existing settings. This uses the renderer's contrast cache, with no DOM traversal or frame observer.

xterm 5.5 also aliases DECSCUSR 0 (terminal default) to blinking block, overriding the configured bar when Codex resets its cursor. A scoped parser handler resolves only 0/default to Kaku's blinking bar; explicit application requests 1–6 continue through xterm unchanged. Inactive Kaku panes hide their cursor rather than displaying xterm's default hollow box. Returning to another theme restores the block default and outline behavior. Parser handlers are disposed with their panes.

The failing regression reproduced 1.33:1 contrast before the fix. The UI test covers truecolor and indexed status colors, both Kaku themes, default cursor reset, explicit block requests, focus/blur, and restoring the original theme.

## Validation

- 81 core tests and 61 integration checks passed (`logs/kaku-text-cursor-tests.log`). The added test checks rendered colors and cursor classes, not only option values.
- Before: representative truecolor status text had 1.3337:1 contrast on Kaku Light; a real Codex session rendered `xterm-cursor-block` after startup. After: the same text renders at least 3:1, and real Codex renders `xterm-cursor-bar` (`logs/kaku-text-cursor-codex.log`).
- The existing real Codex light/dark switching check still passed, preserving its unsubmitted draft and updating cached composer backgrounds.

## Installed verification

Installed 1.17.3 at `/Users/bobmax/Applications/Zawo.app` after strict deep signature verification. Previous 1.17.2 is backed up under `artifacts/upgrade-1.17.3-20261111/`. Installed/release app.asar SHA256: `1b48be2a6c192bd140f4ec4ee90c095a0a782ae359512c376e8cf0e918a7a857`.

The installed UI reported version 1.17.3. Native mouse tab drags restored the left/full-height and right/top-bottom layout. The original Codex conversation was resumed without submitting a prompt. Screenshot verification showed a thin input bar, no hollow cursors in inactive shells, and clearly darker gold/green/magenta status text on Kaku Light. The user's Kaku Light preference remains selected.

App notarization `c6019aa4-0f59-4049-b742-f7f2b796672e` and DMG notarization `fd731d32-d7b2-4f21-97cf-f2e1e97b7db9` were accepted. Both artifacts were stapled and validated; Gatekeeper reports Notarized Developer ID. DMG: `dist/release/Zawo-1.17.3-arm64.dmg`.
