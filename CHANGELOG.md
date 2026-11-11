# Changelog

## 1.17.6

Changes since the previous published release, 1.16.2:

- Adds Kaku Light and Kaku Dark with automatic saving and live theme switching.
- Uses seamless Kaku split panes with thin internal dividers, full-width top drag areas, and visible connection names.
- Improves text contrast, cursor appearance, and cached input backgrounds when switching themes.
- Fixes terminal grid sizing so long output does not clip the final prompt or cursor, including in resized split panes.
- Removes the duplicate Zawo dark menu item while preserving compatibility with saved preferences and backups.
- Adds English, Chinese, and German READMEs, with English as the default.

Validation: 81 core tests and 62 application integration checks passed. The app and Apple Silicon DMG were Developer ID signed, notarized, stapled, and verified with Gatekeeper. The installed theme menu and long-output cursor behavior were checked in real local terminals.

## 1.16.2

- Closing the browser sidebar releases all webpage instances and renderer processes.
- Reopening restores only the active tab; other suspended tabs load when selected.
- Retains tab metadata, navigation history, zoom, cookies and forwarding associations.
- Existing downloads and SSH forwarding continue while the browser is closed.
- Forwarding reconnects no longer allocate hidden webpages or issue preview requests.
- Guards resumed tabs against stale events from disposed pages.
- Adds lifecycle, renderer-exit, repeated-open/close and navigation-race regression checks.

Validation on Apple Silicon macOS: 79 core tests, 59 application integration checks, 29 browser checks and 5 browser-memory checks. In the installed two-page fixture, closing the panel reduced summed RSS from approximately 782 MiB to 441 MiB and terminated both webpage renderer processes. RSS includes shared memory; this is a controlled fixture measurement, not a guarantee for every website.

The 1.16.2 app and DMG were Developer ID signed, notarized and stapled, then checked with Gatekeeper and actual installation / startup / browser use.

## 1.16.1

- Normalizes the bare Google main-site entry through its NCR URL.
- Adds the Developer ID signing, notarization and DMG release workflow.

## Earlier versions

Local and SSH terminals, workspace splits, jump hosts, TCP forwarding, SFTP transfers, backups and migration, automatic editor saving, keyboard shortcuts, browser tabs/downloads and local/remote CLI browser integration.
