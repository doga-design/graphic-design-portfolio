# Distro Disco — Bottom Navigation (extracted)

Self-contained bottom tab bar from the Distro Disco prototype: same frosted pill shape, inline SVG icons, colors, press states, and per-tab tap animations (including center Support globe spark burst).

## Package contents

| File | Purpose |
|------|---------|
| `bottom-nav.css` | All nav + scrim styles and keyframe animations |
| `bottom-nav.js` | Active state, icon replay animations, touch press polyfill |
| `bottom-nav-snippet.html` | **Full preview page** (open in browser — not a paste fragment) |
| `bottom-nav-markup.fragment.html` | Markup to paste into your app (scrim + nav + inline SVGs) |
| `assets/navbar-back.svg` | Bar chrome / border |
| `assets/navbar-mask.svg` | Frosted fill mask shape |
| `demo.html` | Live preview — open in a browser |

## Quick start

1. Copy the whole `components/bottom-nav/` folder into your project.
2. Load **Public Sans** (or match `--navy` labels to your body font).
3. In your app shell, wrap the nav in a positioned host (see `bottom-nav.css` → `.bottom-nav-host`):

```html
<link rel="stylesheet" href="path/to/bottom-nav/bottom-nav.css">
<div class="bottom-nav-host">
  <!-- paste contents of bottom-nav-markup.fragment.html (not bottom-nav-snippet.html) -->
</div>
<script src="path/to/bottom-nav/bottom-nav.js"></script>
<script>
  var api = initBottomNav(document, { initialTab: 'home' });
</script>
```

**Do not** open `bottom-nav-markup.fragment.html` in a browser — it has no document shell or CSS. Use `bottom-nav-snippet.html` or `demo.html` to preview.

Or add `data-auto-init` on `<nav class="bottom-nav" data-auto-init>` and include the script — it wires itself on `DOMContentLoaded`.

## Wiring your app

Listen for selection (no routing built in):

```js
document.querySelector('.bottom-nav').addEventListener('bottomnav:select', function (e) {
  console.log(e.detail.tab); // home | events | support | volunteer | forums
});
```

Sync active tab from your router:

```js
var api = initBottomNav(document);
api.setActiveTab('forums');
```

## Layout requirements

- Parent container: `position: relative`, typical phone width (~390px) and height.
- Nav uses `position: absolute; bottom: 14px` — same as the prototype.
- Optional `.nav-scrim`: gradient fade above the bar (included in snippet).
- Leave ~150px padding at the bottom of scrollable content so lists aren’t hidden under the bar.

## Design tokens (override in `:root` if needed)

| Token | Default | Used for |
|-------|---------|----------|
| `--navy` | `#23214A` | Active label color |
| `--icon-size-nav` | `38px` | Side tab SVG size |
| `--icon-size-nav-center` | `48px` | Center globe |
| `--nav-center-circle-size` | `68px` | Center pill |
| `--dur-bounce` | `500ms` | Shared bounce timing |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Spring easing |
| `--z-bottom-nav` | `9999` | Stacking |
| `--z-nav-scrim` | `9998` | Scrim below bar |

Inactive icons: grayscale + 60% opacity. Active: `#ffeed8` circle, scale 1.1, full color. Press: scale 0.9 (`.touch-active` on touch devices).

## Interactions included

- **Home**: bounce + accent pulse
- **Events**: calendar squeeze + header slide
- **Support (center)**: bounce, globe accent pop, spark flicker, particle shoot (`.fired`)
- **Volunteer**: bag toss + settle + ripple
- **Forums**: bubble pop + staggered dot pop
- **Touch**: `touch-active` class on `touchstart` for visible press before tap completes

## Demo

Open `demo.html` or `bottom-nav-snippet.html` locally (or serve the folder). Tap each tab to verify animations.

## Source

Extracted from `index.html` (markup), `css/activities.css` (styles), and `app.js` (nav click / donate micro-interaction logic).
