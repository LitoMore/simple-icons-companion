# Simple Icons Companion

A userscript for GitHub's Simple Icons SVG preview and diff viewer.

It adds an **Overlay** view mode next to GitHub's built-in **2-up**, **Swipe**, and **Onion Skin** modes on `simple-icons/simple-icons` SVG file diffs. It also adds **Points** and **Color** checkboxes below the view-mode selector.
For added-only and deleted-only SVG previews, it adds the **Points** and **Color** checkboxes below the single preview.

## Modes

- **Overlay** renders the deleted icon underneath the added icon, with the added icon filled in `#fff`.
- **Points** overlays SVG path points on whichever preview mode is active, including **2-up**, **Swipe**, **Onion Skin**, and **Overlay**. Initial move points are yellow and path endpoints are red.
- **Color** applies the relevant Simple Icons hex color from `data/simple-icons.json`.

## Install

Install a userscript manager such as Tampermonkey, Violentmonkey, or Userscripts, then open the latest release userscript URL:

```
https://github.com/LitoMore/simple-icons-companion/releases/latest/download/simple-icons-companion.user.js
```

Release assets are generated from source when a tag is pushed, so the built userscript is not tracked in this repository.

The script runs only on:

```text
https://github.com/simple-icons/simple-icons/pull/*/changes
https://github.com/simple-icons/simple-icons/pull/*/files
https://viewscreen.githubusercontent.com/added/svg*
https://viewscreen.githubusercontent.com/deleted/svg*
https://viewscreen.githubusercontent.com/diff/svg*
```

The `viewscreen.githubusercontent.com` matches are required because GitHub renders SVG previews and diffs inside those iframes.

## License

MIT
