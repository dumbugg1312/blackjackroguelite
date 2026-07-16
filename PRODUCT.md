# Product

## Register

brand

(Design IS the product: this is a game. The visual experience, motion, and mood are the deliverable, not a wrapper around it.)

## Users

Solo players in a desktop Chrome browser, playing 20–45 minute roguelite runs. They know Balatro / Slay the Spire conventions (nodes, relics, shops, bosses) and basic blackjack. They came for juice: they expect every card flip, chip burst, and boss reveal to feel physical and satisfying.

## Product Purpose

**THE HOUSE** — a roguelite blackjack dungeon crawler. The player descends 21 floors of a condemned fin-de-siècle casino, fighting enemy dealers at blackjack. Winning hands deals damage; losing hands costs blood. Between fights: shops, shrines, and card surgery. Bosses on floors 7, 14, and 21 warp the rules of blackjack itself. Death ends the run. Success looks like: "one more run" compulsion + people asking how a browser game feels this good.

## Brand Personality

Velvet, ominous, precise. A grand casino at 3am, decades after it closed — rose velvet gone dark, tarnished brass, one candle, and something in the walls that still wants to play. Never campy-spooky, never neon-Vegas. The dread is elegant.

## Anti-references

- Neon Las Vegas / synthwave casino (cyan-magenta glow grids).
- Cartoon-goblin fantasy dungeon UI (stone textures, parchment scrolls, chunky wood buttons).
- Generic dark-mode SaaS with cards-and-gradients.
- Flash-game gambling sites: no faux-3D green felt oval with photoreal chips.

## Design Principles

1. **The table is a stage.** Every fight is staged like theatre: dramatic light, deliberate reveals, the enemy as a character across the table.
2. **Juice is information.** Screen shake, particles, and slow-motion always communicate game state (damage size, crit, kill) — never decoration for its own sake.
3. **The House has a voice.** Enemy dealers speak in short lines; UI copy is in-world ("The shoe is reshuffled", "The House keeps your blood on account").
4. **Readable under pressure.** Hand totals, HP, and odds-relevant info are legible at a glance mid-animation. Clarity beats atmosphere whenever they conflict.
5. **No loading, no build, no excuses.** Static files, instant boot, 60fps in Chrome.

## Accessibility & Inclusion

- WCAG AA contrast for all HUD text and body copy (≥4.5:1).
- Full `prefers-reduced-motion` alternative (crossfades, no shake, no particles storms).
- Keyboard-first play: H hit, S stand, D double, number keys for charms, Enter to confirm.
- `aria-live` announcements for hand outcomes and damage.
- Suits distinguished by shape + color (never color alone); red/black card info never the only signal.
