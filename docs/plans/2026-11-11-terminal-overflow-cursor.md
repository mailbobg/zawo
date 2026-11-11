# Keep the final prompt visible after long output — 1.17.5

A real `ls -1` listing of 150 fixture files reproduced the reported missing cursor. The terminal remained focused and rendered a cursor, but its bottom was 631px while the mount's usable content bottom was 600px. The last rows were clipped, not hidden by the cursor-blink logic.

The pinned xterm FitAddon reads its parent mount's computed width/height as usable dimensions, subtracting padding only on xterm's own element. Zawo's global border-box rule made the padded mount report dimensions including pane padding. This overstated PTY columns and rows; Kaku's 28px top drag strip made the problem especially noticeable. Other themes were affected to a lesser extent.

Set only `.terminal-mount` to `box-sizing: content-box`, so the computed dimensions supplied to FitAddon exclude that padding. Flex layout, the existing padding, header drag targets and selection areas remain intact. No forced focus, scroll-to-bottom, synthetic Enter, or cursor timer is introduced; users can still read scrollback normally.

## Regression evidence

`test/terminal-overflow-ui.cjs` executes real `ls` output exceeding one screen, tests all five palettes, then resizes and tests two stacked panes. It asserts cursor and screen geometry against usable content boundaries and rejects browser scrolling of the mount. The test failed before the fix at 31px of vertical overflow; afterwards the final cursor stayed inside each content area. Horizontal column fitting is also corrected.

A native mouse/keyboard check ran `ls -1 /usr/bin` in a small split pane. The last filenames and prompt remained visible; the cursor was observed on the prompt without an extra Enter. This also addresses clipping of the lowest TUI status rows, caused by the same size mismatch.

## Full regression

81 core tests passed. The first full integration run timed out in the pre-existing built-in local-host shell-output check before reaching the new overflow test; its isolated rerun passed, followed by all 62 integration checks passing in a complete rerun. Logs: `terminal-overflow-tests.log`, `terminal-overflow-local-host.log`, `terminal-overflow-integration-retry.log`. No unrelated production workaround was added for that transient test failure.

## Release and installed verification

Version 1.17.5 was Developer ID signed and notarized. Apple accepted app submission `af245dc3-7482-4e15-8fa1-c9d54c5364df` and DMG submission `307a2457-5173-4ac5-a11b-98a01630f60f`; both tickets were stapled and validated, with Gatekeeper reporting Notarized Developer ID.

Installed `/Users/bobmax/Applications/Zawo.app`; the installed and release app.asar SHA-256 matched `fd47387180a7fc14f545d47d54d77ff4c1e146ae3507db24e320294c41c2c011`. Previous version backup: `artifacts/upgrade-1.17.5-20261111/Zawo-1.17.4.app`. The user closed all existing sessions before installation, so none were recreated. One local terminal was opened for verification, preserving the user's current dark theme.

The installed app displayed 1.17.5. Native keyboard execution of `ls -1 /usr/bin` produced multiple screens of output. Subsequent screenshots showed the final prompt and visible cursor within the pane, without another Enter or a refocusing click after the command. The test terminal was left open.
