# Full-width pane drag and cached TUI colors — 1.17.2

Kaku panes now have an invisible 24px drag strip spanning their full width. The xterm surface begins 28px below the top, so the strip never overlays selectable terminal text. No frame or title text is added; pane actions stay in the right corner.

## Reproduced color cause

A real Codex 0.167.1 process queried OSC 11 once while Kaku Light was active. It emitted SGR 48;2;244;241;230 for its composer both before and after the terminal changed to Dark. Its draft stayed present, but the hardcoded light plate remained. This matches the startup cache and background blending in upstream `codex-rs/tui/src/terminal_palette.rs` and `style.rs` at rust-v0.167.1.

The new per-pane display adapter observes palette queries without consuming them. When the theme changes, it maps exact terminal-derived background/composer/history surfaces to the current equivalents using scoped CSS for the pinned xterm 5.5 DOM renderer. It updates already rendered and future cells, without rewriting the terminal buffer or input, restarting processes, or walking cells on each frame. Block cursor styles are excluded. Programs that never queried a background and unrelated truecolor values are unaffected. This is a narrow compatibility adapter, not a general rewrite of custom application themes; a change of xterm renderer or upstream surface derivation needs revalidation.

Sources: https://github.com/openai/codex/blob/rust-v0.167.1/codex-rs/tui/src/terminal_palette.rs and https://github.com/openai/codex/blob/rust-v0.167.1/codex-rs/tui/src/style.rs.

The live Codex check can be repeated with `electron test/codex-theme-live.cjs --verify` and `--start-dark` for the reverse direction. It types a draft but never submits it. The diagnostic explicitly unsets the test runner's NO_COLOR to match normal desktop launches.

## Verification and installation — 2026-11-11

- 81 core tests and 60 integration checks passed (`logs/kaku-drag-color-tests.log`). Kaku geometry checks cover full-width header hit testing, separation from xterm text, both theme variants, nested divider joins and split resizing.
- Real Codex 0.167.1 checks passed from both Kaku Light and Kaku Dark startup states, cycling Dark/Kaku Dark/Kaku Light with the unsubmitted draft preserved (`logs/codex-theme-verify-light.log`, `logs/codex-theme-verify-dark.log`).
- Native mouse verification in the isolated three-pane app successfully moved panes from the left and center of their empty top strips. First-row output and the shell prompt could be selected without moving panes. Drops were tested at target edges; action buttons retain their own hit areas.
- Installed 1.17.2 at `/Users/bobmax/Applications/Zawo.app`, preserving 1.17.1 at `artifacts/upgrade-1.17.2-20261111/Zawo-1.17.1.app`. Installed/release app.asar SHA256: `e49869d11bc8cb74dfe508e43ac031987f92cb16938b378fa20719f9fbb2299d`. Strict deep signature verification passed.
- Installed app visibly reported 1.17.2 and opened a working local terminal. A fresh real Codex session started in Kaku Light; switching to the user's Zawo dark preference produced a dark composer with readable preserved draft. Test draft was cleared without submission, Codex exited, and the user's original Zawo dark selection was restored.
- App notarization `dfe63222-2bff-437c-8c97-eab39ea22aee` and DMG notarization `9df7c803-a03b-4891-a906-91e01a82b235` accepted. Both stapled and validated; Gatekeeper reports Notarized Developer ID. Release DMG: `dist/release/Zawo-1.17.2-arm64.dmg`.
