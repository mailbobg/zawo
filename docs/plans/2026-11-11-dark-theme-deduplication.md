# Remove duplicate Zawo dark option — 1.17.6

`green` (labelled Zawo dark) and `dark` already share the same `darkTheme` object and surrounding terminal styling. Remove the duplicate choice, leaving Dark, Light, Kaku Light and Kaku Dark.

Keep the legacy `green` palette and preference validation for existing profiles and backups. Display that saved value as Dark in the settings selector, including error recovery; the next explicit save uses `dark`. No appearance migration or preference reset is needed.

Validation: the settings UI exposes exactly four choices and resolves the original default to Dark. Existing live theme, split, cursor/readability and long-output tests now select the four available options. `npm run build` and `npm test` passed: 81 core tests and 62 integration checks. Log: `logs/theme-dedup-tests.log`.

Installed 1.17.6 at `/Users/bobmax/Applications/Zawo.app`, after Developer ID signature verification and accepted/stapled app notarization (`a3c3441d-ffc7-4c93-b332-831805c18b61`). Installed/release app.asar SHA-256 both equal `55ab8eaf5c9309e06db2db36529f8c025e0c541e875bbf4fe49037da7bd8728c`. Previous app backup: `artifacts/upgrade-1.17.6-20261111/Zawo-1.17.5.app`.

Native verification observed version 1.17.6 and exactly Dark, Light, Kaku Light, Kaku Dark in the dropdown. The user's Kaku Light selection, font size 12 and scrollback 5000 persisted. Three idle local shells were reopened using the saved Upgrade 1.17.6 layout template; pane names and split proportions were preserved and the tab renamed back to Workspace. This restores layout, not shell processes or scrollback. The saved layout template remains available.
