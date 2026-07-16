# Design

## Mood

"Condemned grand casino, 3:12am — rose velvet gone black, tarnished brass fittings, a single candle on the felt, and a dealer who has been dead for a hundred years." Fin-de-siècle theatre, not Vegas. Color strategy: **Committed** — the rose-velvet primary and brass accent carry the identity over a near-black stage; the environment (table felt, candlelight) is painted by the renderer, not by the body background.

## Color (OKLCH only — these are the tokens; never invent hex)

```css
:root {
  /* stage */
  --bg:            oklch(0.07 0 0);             /* the dark of the hall */
  --surface:       oklch(0.13 0.012 353);       /* panels, drawers, shop stalls */
  --surface-2:     oklch(0.17 0.018 353);       /* raised elements, hovers */
  --line:          oklch(0.32 0.03 353);        /* hairline borders */

  /* text */
  --ink:           oklch(0.93 0.01 353);        /* body/HUD text, ≥7:1 on bg */
  --muted:         oklch(0.66 0.02 353);        /* secondary text, ≥4.5:1 on bg */

  /* brand */
  --primary:       oklch(0.57 0.158 353);       /* rose velvet — player, damage-to-enemy, hearts/diamonds accents */
  --primary-deep:  oklch(0.38 0.12 353);        /* felt, deep velvet fields */
  --primary-hot:   oklch(0.70 0.19 20);         /* blood/damage flashes, crits */
  --accent:        oklch(0.78 0.13 85);         /* tarnished brass/gold — chips, currency, legendary */
  --accent-deep:   oklch(0.55 0.09 85);         /* brass shadows, borders */

  /* semantics */
  --win:           oklch(0.75 0.13 145);        /* rare: heal, positive deltas */
  --curse:         oklch(0.60 0.12 305);        /* curses, corrupted cards, elite auras */

  /* cards */
  --card-face:     oklch(0.96 0.008 85);        /* aged ivory card stock */
  --card-ink:      oklch(0.18 0.02 353);        /* pips: spades/clubs */
  --card-red:      oklch(0.50 0.17 15);         /* pips: hearts/diamonds */
}
```

Text on `--primary` or `--accent` fills is near-white `--ink` (Helmholtz-Kohlrausch: saturated mid-luminance fills take white text). Dark text only on `--card-face` and `--accent` at pale tints.

## Typography

- **Display — "Rozha One"** (Google Fonts): high-contrast Didone, theatre-playbill voice. Titles, boss names, floor numbers, big damage numbers, "BUST"/"BLACKJACK" stamps. Letter-spacing never tighter than -0.03em.
- **Body/UI — "Archivo"** (Google Fonts): grotesque workhorse. HUD, buttons, tooltips, shop text. Use `font-variant-numeric: tabular-nums` on every counter (HP, chips, totals).
- Card pip indices may use Rozha One for rank characters.
- Scale: modular, ratio ≥1.25. Display ceiling 6rem. `text-wrap: balance` on headings.
- Load both via Google Fonts `<link>` with `display=swap` and preconnect.

## Space, shape, layout

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 40 / 64.
- Radii: cards 10px; panels 4px (sharp, furniture-like); pills 999px only for charm slots.
- Borders: 1px `--line`; brass 1px `--accent-deep` for currency/legendary. **Never** left/right accent stripes.
- Z-scale (semantic): `--z-table:0; --z-cards:10; --z-fx:20; --z-hud:30; --z-overlay:40; --z-modal:50; --z-toast:60;`
- The game is a fixed stage centered in the viewport (max ~1280×800 design space, scales down responsively to ~960px; below that show a graceful "the table needs more room" card). Letterbox with pure `--bg`.

## Motion

- Ease: `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo family) everywhere. No bounce/elastic.
- Card deals: 260–340ms fly + 3D flip (rotateY), staggered 90ms per card.
- Damage: white→`--primary-hot` flash 80ms, shake amplitude proportional to damage, floating Rozha One damage numeral (rise + fade 700ms).
- Blackjack/kill: 180ms hit-stop (time-scale 0.15) then release — the signature moment.
- Screen transitions: 300ms vertical descent wipe (you are going DOWN the tower).
- Ambient: canvas ember/dust drift, candle-flicker lighting; paused under reduced motion.
- Every animation has a `prefers-reduced-motion` fallback: instant or 150ms crossfade; shake and particle storms disabled entirely.

## Components

- **Card**: DOM element, real 3D flip (`transform-style: preserve-3d`), ivory face with corner indices + center pip layout, ornate rose-and-brass back (CSS/SVG pattern, no images). Hover: 4° tilt toward cursor + lift shadow. Enchanted cards carry a subtle animated foil sheen; cursed cards a `--curse` vein.
- **Button**: `--surface-2` fill, `--ink` label, 1px `--line`; primary action = `--primary` fill, white label; brass variant for purchases. Pressed = translateY(1px) + shadow collapse. Focus-visible: 2px `--accent` offset ring.
- **HP bars**: player rose, enemy bone-white on `--surface`; chip damage shows a trailing "ghost" segment that drains after 400ms.
- **Tooltip**: `--surface-2`, 1px brass border, Rozha One title + Archivo body; positioned with fixed/portal, never clipped.
- **Toast/banner**: full-width brass-ruled ribbon for floor titles and boss intros.

## Sound

WebAudio, synthesized (no asset files): card slide (filtered noise swish), chip clink (metallic FM ping), damage thud (low sine + noise burst), blackjack chord (minor-major lift), boss drone. Master mute toggle persisted. Start audio context on first user gesture only.
