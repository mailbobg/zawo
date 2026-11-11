# Connection names in Kaku panes — 1.17.4

Show each terminal's existing connection label at the left of the 24px top drag strip in both Kaku themes. Local terminals keep their distinct numbered labels; SSH sessions use the saved host label, matching the original Zawo theme. Use the existing readable muted color and 12px medium text. Keep the strip transparent, with no border, separate title-bar background, or added vertical space.

Long names ellipsize. The header exposes the full name as a tooltip and accessible label; pane renaming updates both. Hover actions reserve their existing right-side area. Name text does not intercept pointer events, preserving full-width drag behavior and the gap above selectable terminal text.

The existing split UI check now verifies visible names, full-name tooltips and ellipsis alongside border-free geometry, full-width hit areas, theme switching and resizing. Native mouse verification successfully dragged a pane from directly over its visible name. Both light and dark screenshots were captured by the isolated preview.

## Installation and verification

81 core tests and 61 integration checks passed (`logs/kaku-pane-names-tests.log`). Installed 1.17.4 at `/Users/bobmax/Applications/Zawo.app` after strict deep signature verification; installed/release app.asar SHA256 is `bec233de6ff74fb54ba890f7a67b2494ea974f87f12602803492f6e7d81b7dca`. Previous 1.17.3 is preserved at `artifacts/upgrade-1.17.4-20261111/Zawo-1.17.3.app`.

The installed UI showed 1.17.4. Native mouse tab drags restored the three-pane layout, with each local terminal name visible at the top. The user's existing Codex conversation was resumed. Claude's existing conversation resume reached its home-directory trust prompt; no trust approval was granted automatically, and the prompt was left for the user.

App notarization `1b48b310-f64c-4eaf-81a2-b1fdd4e77575` and DMG notarization `0aef6e2e-baf9-4768-bfb5-1db746862ff5` were accepted. Both stapled, validated and accepted by Gatekeeper. DMG: `dist/release/Zawo-1.17.4-arm64.dmg`.
