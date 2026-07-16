# THE HOUSE — "The Second Deal" Specification (update to SPEC.md)

Goal: denser decisions, more per-hand variety, momentum and spectacle, smoother difficulty, and a story spine (see STORY.md). Everything below is additive to SPEC.md unless it says "replaces". Save format may change but must migrate or invalidate old saves gracefully (title screen: "The House has rearranged the furniture" → old save cleared, lifetime stats kept).

## A. Combat density systems

### A1. Heat (win-streak momentum) — the signature system
- Consecutive won hands build **Heat**: +1 per win (dealer bust counts; naturals count). Cap 5.
- Player damage multiplier: `1 + 0.15 × Heat` (applied after additive bonuses, before boss-quirk multipliers; document order in combat.js).
- Push: keeps Heat (no gain). Loss or bust: Heat resets to 0.
- UI: a row of five candle flames near the player panel that light one by one; at Heat ≥3 the table's candle pool visibly brightens; SFX pitch of the win chord rises with Heat. Damage numbers at Heat ≥3 render larger with ember trails.
- Relic hooks: at least two new relics interact (see D).

### A2. Split
- When the first two cards share a rank, **Split [P]** appears: split into two hands, each dealt one card, played left-to-right, each resolved against the dealer separately (full damage each). One Double allowed per split hand; no re-splits. Naturals after split count as 21, not blackjack.
- UI: hands fan apart with the active hand lit and lifted; the inactive hand dims. Totals per hand. Heat counts each resolved hand separately (a split can gain 2 Heat, or gain then lose).

### A3. Five-Card Charlie
- Reach 5 cards without busting = automatic win at hand end, damage = total + 50% ("CHARLIE" stamp, gold staging, distinct chord). Rare by design; The Long Odds stake (below) supersedes it when active.

### A4. Table Stakes (per-hand modifiers)
- From floor 3 on, each hand after the first in a fight has a **30% chance** to flip a Stake card (ornate mini-card by the shoe, flip animation + tooltip; announced via aria-live). Never during boss phase transitions; bosses use their own reduced pool (Blood, Glass, Double or Nothing only).
- Pool (implement all 8):
  1. **Blood Stakes** — winner of this hand heals 6.
  2. **Glass Table** — dealer's hole card is dealt face up.
  3. **Double or Nothing** — all damage this hand ×2, both directions.
  4. **The Long Odds** — win with 5+ cards: damage ×3.
  5. **Dead Air** — charms are sealed this hand.
  6. **House Rules** — you see the next shoe card this hand (Marked Deck preview UI).
  7. **The Rake** — winner takes 12 chips from the loser (House-side losses pay you).
  8. **Cold Room** — Heat neither gained nor lost this hand.
- Stake weights uniform except Double or Nothing ×0.5 weight.

### A5. Pacing (replaces current timings)
- Cut dealer resolution delays ~30% across the board (deal stagger 90→70ms, dealer draw pause ~600→420ms, resolution beat ~1200→850ms).
- **Space** (or click on empty felt) fast-forwards the current hand's animation queue to 4× (never skips information: every card still lands visibly; damage numbers still post).
- Damage preview: while choosing an action, the Stand button shows the damage you'd deal if the stand wins (`~18`), including Heat and bonuses; tooltip explains. Keeps decisions legible (PRODUCT principle 4).

## B. Story integration (content per STORY.md — implement all mechanisms listed there)

- New module `js/game/story.js`: line pools, bark triggers, arc state (weepingBride, conciergeStage, actSeen flags) serialized with the run.
- Bark rendering: one line near the enemy portrait, Archivo italic, types in fast (reduced-motion: instant), auto-fades ~4s; never overlaps the rule plaque; max one bark per hand.
- Opening vignette + act interstitials: full-screen, verbatim text from STORY.md, advance on click/Enter/Space, skippable, shown once per run (interstitials once per act).
- Landing whispers: one Voice-of-the-House line per landing from act pools (≥8/act, no repeats until pool exhausts; seeded RNG).
- Dealer dialogue: every enemy + elite gets intro/barks/death lines per STORY.md §4 voice notes. Bosses use the authored exchanges verbatim.
- Concierge: portrait sigil (brass key motif), shop + parlor greetings by act, three scripted shrine encounters (STORY.md §5/Shrine arcs) wired into the shrine pool with arc-state gating (encounter 2 grants the free relic peek; encounter 3 is dialogue-only and must appear in Act III before floor 20).
- Weeping Bride 2-parter: Part 1 adds a **Gilded ring card** (a Gilded-enchanted 5♦, named "the Ring" in tooltips) to the shoe; Part 2 (gated on carrying it) offers: return it (remove card, gain rare relic + 40 chips) or keep it (it upgrades: also +4 damage in winning hands — i.e., gains Bloodstained on top of Gilded).
- Relic/charm flavor lines: every existing + new relic/charm gets one italic in-world line.
- Death epitaphs keyed to cause; victory flows into the **final choice** screen (two endings, verbatim copy), lifetime stats split Escapes/Inheritances; Inheritance subtly alters the title screen subtitle for that profile thereafter.

## C. Structure, economy, difficulty (replaces current numbers)

- Enemy scaling: HP `24 + floor×6` (elite ×1.5), Attack `6 + floor×1.0` (elite +3). Bosses: Bouncer 118/13, Cardsharp 165/17, House 220/19 (re-sim after Heat lands; target: a basic-strategy-only player reaches floor 7 in a median run; a player using relics/parlors well reaches 14+; the House win rate from full HP ~35%).
- Heal +6 HP automatically after every cleared fight ("You bind your wounds. The House disapproves."). Parlor heal 18 → 22.
- Chips: fight-clear payouts +20%. Charm drop rate in spoils up (at least one charm option in 2 of every 3 spoils).
- New room type: **The Lounge** (rare, Acts II–III): the Concierge pours; choose one of three "songs" (temporary buffs lasting the next 3 fights: e.g., +3 flat damage on wins / dealers reveal hole below 30% HP / heal 4 per hand won). One visit per act max.

## D. New content

- **New relics (≥6):** Asbestos Gloves (Heat cap 5→7), Slow Burn (loss lowers Heat by 1 instead of reset), Splitting Headache (split hands +4 damage each), Charlie's Watch (4-card no-bust hands +6 damage), Stakeholder (you may reroll a Stake card once per fight), Concierge's Key (Lounge songs last 5 fights; the Concierge nods).
- **New charms (≥4):** Matchbook (light one Heat immediately), Second Opinion (redraw your last card), Velvet Glove (this hand, your bust becomes a stand at 21... once), Bribe (skip the dealer's turn; hand resolves against dealer's current showing +10).
- **New stake-aware enemy (1):** "The Oddsmaker" (Acts II–III) — every hand at his table flips a Stake (his plaque says so).
- All new content follows existing hook architecture; tooltips + flavor lines mandatory.

## E. Meta-progression (light)

- **The Pawnbroker:** after the profile's first death, every New Descent opens with a one-screen choice of 1 of 3 heirloom relics (small starter pool: Candle Stub, Rabbit's Foot, Tourniquet, Counterfeit Chip, Matchbook×2-as-relic variant "Matchbox"). Skippable ("Owe him nothing"). Voice: he appraises you, unimpressed.
- Lifetime stats screen additions: Escapes, Inheritances, deepest floor, total hands won, biggest single hit.

## F. Acceptance criteria

1. All SPEC.md §12 criteria still pass (zero console errors, saves round-trip incl. new story/arc/Heat state, reduced-motion, keyboard: add P for split, Space fast-forward).
2. Heat, Split, Charlie, all 8 Stakes, Lounge, Pawnbroker function and are save-stable; damage-order documentation updated.
3. Full story pass present: opening, 2 interstitials, landing whispers all 3 acts, barks on all enemies, boss exchanges, Concierge ×3, Bride ×2, flavor lines on every relic/charm, keyed epitaphs, two endings with split lifetime tallies.
4. A scripted full playthrough (debug harness) from floor 1 to both endings without errors.
5. Balance sim: report median floor reached under basic strategy before/after.
