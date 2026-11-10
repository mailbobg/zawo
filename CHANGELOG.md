# Changelog

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
