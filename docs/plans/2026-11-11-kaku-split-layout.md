# Kaku split layout correction — Electron 1.17.1

The first Kaku presets retained Zawo's rounded pane cards. The user supplied a Kaku screenshot showing a continuous canvas with internal separators. Kaku Light/Dark now remove the pane border, radius and permanent title row, use one-pixel internal lines with nine-pixel draggable hit areas, and join nested splits without a gap. A small dot identifies the active pane; pane actions remain available on header hover or keyboard focus. Existing non-Kaku themes retain their layouts. Native remains archived.

Validation covers three real local shells in left/right plus top/bottom splits, both Kaku presets, live theme switching, zero borders/radii, floating headers, one-pixel lines, unclipped T intersections, resize on both axes and restoration of the original theme layout. Screenshots: `shots/kaku-light-seamless-split.png` and `shots/kaku-dark-seamless-split.png`. Real mouse drags also changed the vertical split to 46% and horizontal split to 44%; focus moved between panes normally.

Release and installation verification is recorded below once finished.
