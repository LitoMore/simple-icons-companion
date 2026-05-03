# Simple Icons Companion

A userscript for GitHub's Simple Icons SVG diff viewer.

It adds an **Overlay** view mode next to GitHub's built-in **2-up**, **Swipe**, and **Onion Skin** modes on `simple-icons/simple-icons` SVG file diffs. It also adds **Points** and **Color** checkboxes below the view-mode selector.

## Modes

- **Overlay** renders the deleted icon underneath the added icon, with the added icon filled in `#fff`.
- **Points** overlays SVG path points on whichever preview mode is active, including **2-up**, **Swipe**, **Onion Skin**, and **Overlay**. Initial move points are yellow and path endpoints are red.
- **Color** applies the deleted icon's previous Simple Icons hex color and the added icon's current hex color from `data/simple-icons.json`.

## Install

Install a userscript manager such as Tampermonkey, Violentmonkey, or Userscripts, then open the raw userscript URL:

```text
https://github.com/LitoMore/simple-icons-companion/raw/refs/heads/main/simple-icons-companion.user.js
```

The script runs only on:

```text
https://github.com/simple-icons/simple-icons/*
https://viewscreen.githubusercontent.com/diff/svg*
```

The `viewscreen.githubusercontent.com` match is required because GitHub renders SVG diffs inside that iframe.

## License

MIT
