# THE HOUSE — Game Specification v1

A roguelite blackjack dungeon crawler for desktop Chrome. Read PRODUCT.md and DESIGN.md first; they govern voice, palette, type, and motion. This file governs mechanics, content, architecture, and acceptance criteria.

## 0. Tech constraints

- **Zero build step.** Static `index.html` + ES modules + CSS. Runs from any static file server. No frameworks, no bundler, no npm deps. Google Fonts is the only external request.
- Hybrid rendering: **DOM/CSS for cards, HUD, screens** (accessibility + crisp text); **two canvas layers** for FX — `#fx-bg` (ambient embers/dust, candlelight, vignette, behind the table) and `#fx-fg` (particles, above cards, below HUD, `pointer-events:none`).
- 60fps target. One `requestAnimationFrame` loop drives canvases + tweens + hit-stop time-scale. All DOM animation via CSS transforms/opacity only.
- Deterministic seeded RNG (mulberry32 or similar). Run seed shown on death screen; `?seed=` URL param replays a seed.
- Save: full run state serialized to `localStorage` after every room; "Continue" on title screen. Stats (runs, wins, best floor) persisted separately.

## 1. Core fantasy & loop

You descend the 21 floors of a condemned casino, playing blackjack against the things that still deal there. **Winning hands wounds the dealer. Losing hands wounds you.** Between fights you buy relics and charms, enchant or excise cards from the single shoe you and the dealer both draw from, and pray at shrines. Bosses on floors 7, 14, 21 break the rules. Die and the run ends.

## 2. Blackjack combat

### 2.1 The duel

- Player has HP (start **70/70**). Enemy has HP + an **Attack** stat (see roster). Fight = repeated hands until one side dies.
- **One shared shoe:** the player's deck (starts as a standard 52) is the only deck; both player and dealer draw from it. Deck edits (removals, duplicates, enchantments) affect both sides — this is the central strategic axis. Shoe reshuffles discards when <15 cards remain (toast: "The shoe is reshuffled.").
- Hand flow (standard blackjack, dealer hole card hidden):
  1. Deal: player 2 up, dealer 1 up + 1 hole.
  2. Player acts: **Hit / Stand / Double Down** (double = one card then forced stand; damage dealt AND taken this hand ×2). Charms usable any time during your turn.
  3. Naturals check first: player natural 21 = instant crit resolution; dealer natural revealed immediately.
  4. Dealer reveals hole, then draws by its rule (default: hits until ≥17; enemies may differ — always shown on the enemy's rule plaque).
- Aces 1/11, faces 10, standard totals. Soft totals displayed (e.g. "7 / 17").

### 2.2 Damage resolution

- **Player wins:** damage = player total + bonuses. (A won 20 deals 20.)
- **Player natural blackjack:** damage = 21 × 1.5 = **32**, crit staging (hit-stop, big stamp).
- **Player busts:** take enemy Attack × **1.25** (your own greed cuts deeper).
- **Dealer wins:** take enemy Attack.
- **Dealer natural:** take enemy Attack × 1.5.
- **Push:** nothing (relics can change this).
- **Dealer busts:** counts as a player win with damage = player total + 5 overflow bonus.
- Damage variance: none — deterministic, so mastery reads. All modifiers additive before multipliers; multipliers stack multiplicatively; order documented in code.

### 2.3 Chips (currency)

- Earn: won hand +6 chips (+1 per point of margin over the dealer, cap +10); fight cleared +30–45 by floor; elites/bosses pay more; some relics/enchantments pay.
- Chips carry across the run. Displayed with brass styling always.

## 3. The descent (map/rooms)

- **21 floors.** Bosses fixed at **7, 14, 21**. Elites guaranteed at 5, 11, 17 offered among choices.
- After each room, the player chooses the next floor's door from **2–3 options** (generated, weighted): 
  - **Table** (standard fight) — weight high.
  - **High-Stakes Table** (elite: harder enemy, +relic reward).
  - **Cage** (shop).
  - **Shrine** (event — see §6).
  - **Parlor** (rest: heal 18 HP **or** excise a card from the shoe **or** enchant a random card).
- Door choice UI: three doors on the landing, each with icon + label + one-line whisper. Boss floors show a single ominous door.
- Difficulty ramp: enemy HP ≈ `26 + floor*7` (elites ×1.5), Attack ≈ `7 + floor*1.1` (elites +3), rounded; bosses hand-tuned (§5). Act flavor shifts every 7 floors (Act I "The Parlors", Act II "The Vaults", Act III "The Pit").

## 4. Enemy roster (regular + elite)

Each enemy: name, one-line intro voice, HP/Attack per formula, and **one rule quirk** displayed on a plaque. Implement at least 10; sample:

| Name | Quirk |
|---|---|
| The Usher | none — teaches the game (floors 1–2 only) |
| Rusted Croupier | Every 3rd hand, attacks for half Attack regardless of outcome |
| The Weeper | Heals 4 whenever you bust |
| Pit Fiend | Dealer hits until 18 |
| The Counter | Plays with its hole card face-up, but Attack +3 |
| Marble Valet | Pushes count as dealer wins |
| The Chandler | Your first hit each hand costs 2 HP (wax tax) |
| Velvet Widow | Your face cards count as 9 while she deals |
| The Auditor | Doubling down is forbidden |
| Coffin Clerk | Starts every hand with a 10 showing |
| Elite — The Bailiff | Two hole cards; uses the better hand |
| Elite — Saint of Aces | All aces in the shoe favor the dealer (count 11 for her, 1 for you) |

## 5. Bosses

- **Floor 7 — THE BOUNCER.** Massive HP. Quirk: hands that win with total <17 deal him nothing ("He doesn't feel small change"). Phase 2 (<50% HP): his Attack +4.
- **Floor 14 — THE CARDSHARP.** Each hand, after your first action, he swaps one of your cards with the next card in the shoe (telegraphed with a sleight-of-hand animation). Doubles pay him: if you double and lose, he heals the difference.
- **Floor 21 — THE HOUSE.** Two phases with distinct rule plaques:
  - Phase 1 "The Rake": pushes count as House wins; House takes 2 chips from you per hand dealt (down to 0).
  - Phase 2 "The Fine Print" (at ≤50% HP, full staging: lights die, candle relights): your busts heal The House by the bust amount; but every hand you win at exactly 21 deals double. 
  - Victory = run won: full victory staging + stats screen.
- Boss intros: banner ribbon, name in Rozha One, one line of voice, drone sting. Boss HP bar is ornate (brass caps).

## 6. Shrines (events) — implement ≥8

Text-choice vignettes, in-world voice, one screen each, choices with mechanical consequences. Samples: 
- **The Mirror**: duplicate any card in your shoe / or remove one — the mirror cracks either way (-4 HP).
- **Blood Font**: pay 15 HP → gain a random relic.
- **The Odds-Maker**: bet 30 chips on a coin-flip for 80 or nothing.
- **Abandoned Vault**: gain 45 chips, but a **Debt** card (dead card, counts 0, does nothing) enters the shoe.
- **The Seamstress**: enchant a random card for free.
- **Last Patron**: heal to full, but your max HP -6.
- **Smoke Break**: nothing happens. Genuinely nothing. (Voice moment.)
- **The Register**: trade a relic for 60 chips.

## 7. Relics (passives) — implement ≥18

Rose-velvet framed trinkets in a HUD tray with tooltips. Samples: Loaded Die (first hand each fight: see the dealer's hole card), Brass Knuckles (your 20s deal +6), Marked Deck (you always see the next card of the shoe), Widow's Ring (pushes deal 8 damage), Tourniquet (busts cost 25% less), Velvet Rope (dealers must stand on soft 17), Counterfeit Chip (shop prices -20%), Embalmer's Thread (heal 5 after each fight), Rabbit's Foot (+1 chip per point of margin), Debt Collector (dealer bust overflow bonus +7), Candle Stub (+10 max HP), House Key (choose from 3 doors always), Cold Coffee (once per fight, undo your last hit), Iron Stomach (first bust each fight deals no damage), Gilded Shoe (reshuffles pay 10 chips), Widow's Veil (enemy quirks disabled on hands where you stand ≤16), Ledger (naturals pay +15 chips), Noose (your 21s deal +9). Rarity tiers common/rare/legendary affect shop price & drop weights.

## 8. Charms (consumables, 3 slots) — implement ≥8

One-use, usable mid-hand: Glass Eye (peek next 3 shoe cards), Sleight (discard your last drawn card), Dead Man's Hand (your total becomes 20, end turn... once), Transfusion (heal 12), Loaded Spring (dealer's next draw is forced from the bottom: worst card for them — implement as: dealer's first draw is the lowest-value card remaining), Insurance Slip (negate the next damage you'd take), Pocket Ace (add an Ace to your hand right now), Cigarette (remove your fear: next bust deals 0 — expires end of fight).

## 9. Card enchantments & shoe surgery

- **Excise** (remove card) and **Duplicate** via Parlors/Shrines/shop.
- Enchantments (visible foil/vein on the card, tooltip): **Gilded** (+4 chips when drawn by you), **Bloodstained** (+5 damage when in your winning hand), **Sharp** (counts +1 or -1, your choice on draw — prompt), **Heavy** (dealer drawing this must stand), **Cursed** (from events: -4 damage when in your winning hand — can be cleansed at Parlors).
- Shop sells: 2 relics, 2 charms, 1 enchantment service, 1 excise service, 1 "mystery card" (random enchanted card added to shoe). Prices scale mildly by act; reroll button (18 chips).

## 10. Screens & flow

`Title → (Continue?) → Descent map landing → rooms… → Death/Victory → Title`

1. **Title**: game name in huge Rozha One, candle-lit; New Descent / Continue / stats line (runs, wins, best floor) / mute toggle / seed entry (small).
2. **Landing (door choice)**: between every room.
3. **Fight (the table)**: enemy across the table (portrait = stylized CSS/SVG sigil, not an image file), rule plaque, HP bars, shoe (card back stack, shows count), player hand + totals, action bar (Hit/Stand/Double + tooltips + hotkeys), charm slots, relic tray, chip counter, floor indicator ("FLOOR 9 — THE VAULTS").
4. **Reward** after fight: chips count-up + choice of 1-of-3 (relic/charm/chips) card panels.
5. **Cage (shop)**, **Shrine (event)**, **Parlor (rest)** per above.
6. **Death**: "THE HOUSE KEEPS YOUR BLOOD ON ACCOUNT" + run stats (floors, damage dealt, hands won, biggest hand) + seed + New Descent.
7. **Victory** (beat floor 21): inverse staging, warm light for the only time in the game.
8. **Deck viewer**: always-available button — see the exact current shoe composition (grid grouped by rank, enchantments visible, counts). This is core strategy UX, make it excellent.
9. **How to play**: compact overlay from title/pause: 3 panels (Blackjack, The Descent, The Shoe is Shared).

## 11. Architecture (files)

```
index.html
css/tokens.css        ← DESIGN.md tokens verbatim
css/base.css  css/cards.css  css/table.css  css/screens.css  css/fx.css
js/main.js            ← boot, screen router, RAF loop, time-scale
js/engine/rng.js      ← seeded mulberry32, shuffle
js/engine/tween.js    ← minimal tween/timeline (respects time-scale)
js/engine/particles.js← canvas particle system (embers, chip bursts, card shreds)
js/engine/fx.js       ← shake, hit-stop, flashes, floating numbers, vignette/candle bg
js/engine/audio.js    ← WebAudio synth SFX + mute persistence
js/game/cards.js      ← card model, shoe, hand totals (soft/hard), enchantment hooks
js/game/combat.js     ← the hand state machine (deal→player→dealer→resolve), all damage math
js/game/enemies.js    ← roster + bosses (data + quirk hooks)
js/game/relics.js  js/game/charms.js  js/game/enchants.js  js/game/events.js
js/game/map.js        ← 21-floor generation, door weighting
js/game/run.js        ← run state, save/load, stats
js/ui/*.js            ← one module per screen + hud.js, deckview.js, tooltip.js
```

- Quirks/relics/charms/enchants implemented as **hook points** on the combat state machine (e.g. `onHandStart, onPlayerDraw, onDealerRule, modifyDamageDealt, modifyDamageTaken, onResolve`) so content is data + small functions, not special cases scattered through combat.
- Combat state machine must be async-animation-friendly: logic emits an ordered event list; UI plays it with timing; state is never mid-animation ambiguous.

## 12. Acceptance criteria

1. Boots from a static server with zero console errors; 60fps steady during deals and particle bursts.
2. Full run playable start→death and start→victory; Continue restores mid-run exactly.
3. All keyboard shortcuts work; focus-visible states everywhere; `aria-live` outcome announcements; reduced-motion honored globally.
4. Every relic/charm/enchant/quirk listed above functions and has a tooltip.
5. Deck viewer always reflects the true shoe.
6. No DESIGN.md violations: token-only colors, no banned patterns (no side-stripes, no gradient text, no glassmorphism-by-default).
7. The juice checklist: card fly+flip deals, hover tilt, damage numbers + proportional shake, hit-stop on naturals/kills, ghost HP drain, chip burst particles, descent wipe between screens, boss intro ribbons, ambient embers + candle flicker.
