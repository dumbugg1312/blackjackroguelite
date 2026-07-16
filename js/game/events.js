// events.js — shrine vignettes. Each choice's run(api) drives mechanical effects.
// The shrine UI supplies `api` (see ui/shrine.js). Choices may be gated by enabled(run).

export const EVENTS = [
  {
    id: 'mirror', name: 'The Mirror',
    body: 'A tall glass, silvered black with age. Your reflection deals a hand you never played. "Double a card," it offers, "or take one from me. Either way, I crack."',
    choices: [
      {
        label: 'Duplicate a card', hint: 'Copy any card in your shoe. −4 HP.',
        run: async (api) => {
          const card = await api.pickCard('Duplicate which card?');
          if (!card) return api.result('You step back. The glass waits.');
          api.duplicateCard(card);
          api.hp(-4);
          api.result('The mirror cracks. Now there are two of it — and less of you.');
        },
      },
      {
        label: 'Remove a card', hint: 'Excise any card from your shoe. −4 HP.',
        run: async (api) => {
          const card = await api.pickCard('Remove which card?');
          if (!card) return api.result('You step back. The glass waits.');
          api.removeCard(card);
          api.hp(-4);
          api.result('The mirror cracks. The card is gone from both sides of the glass.');
        },
      },
    ],
  },
  {
    id: 'blood_font', name: 'Blood Font',
    body: 'A basin of something darker than wine. It has been waiting to be paid. "Fifteen," it whispers, "and I will give you a trinket of the dead."',
    choices: [
      {
        label: 'Pay 15 HP', hint: 'Gain a random relic.',
        enabled: (run) => run.hp > 15,
        run: async (api) => { api.hp(-15); const r = api.giveRandomRelic(); api.result(r ? `The font accepts your blood. You lift the ${r.name}.` : 'The font accepts your blood, but the dead have nothing left to give.'); },
      },
      { label: 'Refuse', hint: 'Keep your blood.', run: async (api) => api.result('The basin stills. It can wait a hundred more years.') },
    ],
  },
  {
    id: 'odds_maker', name: 'The Odds-Maker',
    body: 'A thin man made of receipts. He flips a bone coin without looking. "Thirty chips says it comes up mine. Guess right and I pay eighty. Guess wrong and I keep it. Fair, no?"',
    choices: [
      {
        label: 'Bet 30 chips', hint: 'Coin flip: win 80, or lose the 30.',
        enabled: (run) => run.chips >= 30,
        run: async (api) => {
          api.chips(-30);
          if (api.coinFlip()) { api.chips(80); api.result('The coin lands your way. Eighty chips clatter into your palm.'); }
          else api.result('The coin lands his way. It always was his coin.');
        },
      },
      { label: 'Walk away', hint: 'Decline the wager.', run: async (api) => api.result('He shrugs, a rustle of paper. "Another time."') },
    ],
  },
  {
    id: 'vault', name: 'Abandoned Vault',
    body: 'The door hangs open. Inside: forty-five chips in a neat stack, and a single black card that seems to eat the light around it. Taking the money means taking the card too.',
    choices: [
      {
        label: 'Take the chips', hint: '+45 chips, but a Debt card enters your shoe.',
        run: async (api) => { api.chips(45); api.addDebt(); api.result('You pocket the chips. The Debt card slides into your shoe, cold as a coin on a corpse.'); },
      },
      { label: 'Leave it sealed', hint: 'Take nothing.', run: async (api) => api.result('You close the door. Some debts are better left uncollected.') },
    ],
  },
  {
    id: 'seamstress', name: 'The Seamstress',
    body: 'She works by candlelight, threading gold through nothing at all. "Give me a card," she says without looking up. "I will make it worth more than it was. No charge. I like the work."',
    choices: [
      {
        label: 'Accept her gift', hint: 'Enchant a random card for free.',
        run: async (api) => { const info = api.enchantRandom(); api.result(info ? `Her needle flashes. A card is now ${info}.` : 'Her needle stills. Every card is already spoken for.'); },
      },
      { label: 'Decline', hint: 'Leave the cards plain.', run: async (api) => api.result('She nods, unsurprised, and keeps sewing the dark.') },
    ],
  },
  {
    id: 'last_patron', name: 'Last Patron',
    body: 'An old woman at the bar, the only warmth in the room. She pours you something that smells like every summer you forgot. "Drink," she says. "It will mend you whole. It will also take a little of you forever. Everything here does."',
    choices: [
      {
        label: 'Drink', hint: 'Heal to full. Max HP −6.',
        run: async (api) => { api.maxHp(-6); api.healFull(); api.result('You are whole again — a smaller whole than before. She smiles like she knew you once.'); },
      },
      { label: 'Politely decline', hint: 'No change.', run: async (api) => api.result('"Suit yourself, love." She drinks it herself.') },
    ],
  },
  {
    id: 'smoke_break', name: 'Smoke Break',
    body: 'A door propped open to an alley that should not exist this deep underground. Cold air. A crushed pack of cigarettes. No dealer, no cards, no bargain. For the length of one held breath, the House is not watching you.',
    choices: [
      { label: 'Breathe', hint: 'Genuinely nothing happens.', run: async (api) => api.result('Nothing happens. It is the kindest thing the House has ever done.') },
      { label: 'Go back inside', hint: 'Nothing happens, faster.', run: async (api) => api.result('The door clicks shut behind you. The felt is exactly where you left it.') },
    ],
  },
  {
    id: 'register', name: 'The Register',
    body: 'An antique till, its drawer already open. A card slot on top reads: INSERT TRINKET FOR STORE CREDIT. It hums, hungry for one of yours.',
    choices: [
      {
        label: 'Sell a relic', hint: 'Trade a relic for 60 chips.',
        enabled: (run) => run.relics.length > 0,
        run: async (api) => { const r = await api.pickRelic('Feed which relic to the register?'); if (!r) return api.result('The drawer waits. You keep what\'s yours.'); api.sellRelic(r); api.chips(60); api.result(`The register swallows the ${r.name} and coughs up sixty chips.`); },
      },
      { label: 'Keep everything', hint: 'Sell nothing.', run: async (api) => api.result('The drawer slides shut with a disappointed chime.') },
    ],
  },
  {
    id: 'dealers_pity', name: "The Dealer's Pity",
    body: 'A dealer with no face slides a single chip toward you, then a knife. "One or the other," the silence says. "Coin for the road, or blood for a blade that never misses."',
    choices: [
      { label: 'Take 35 chips', hint: '+35 chips.', run: async (api) => { api.chips(35); api.result('The chip multiplies in your hand into a small, cold fortune.'); } },
      {
        label: 'Take the blade', hint: 'Bloodstain a random card (+5 dmg when winning). −5 HP.',
        run: async (api) => { api.hp(-5); const info = api.enchantRandom('bloodstained'); api.result(info ? 'The blade opens your hand and a card drinks. It is Bloodstained now.' : 'The blade finds nothing to mark.'); },
      },
    ],
  },
  {
    id: 'the_wager', name: 'A Standing Wager',
    body: 'Chalk on the wall keeps a tally of everyone who has stood here. "Wager your future winnings," a voice offers. "Take twenty now. Pay it back the first time you win, doubled."',
    choices: [
      { label: 'Take the loan', hint: '+20 chips now; a Debt card enters your shoe.', run: async (api) => { api.chips(20); api.addDebt(); api.result('Twenty chips, warm as a promise. The Debt card is the interest.'); } },
      { label: 'Owe nothing', hint: 'Decline.', run: async (api) => api.result('The chalk adds a mark anyway. You do not ask for what.') },
    ],
  },

  // ---- New generic shrines (SPEC2 task: bring the pool to ≥16) ----
  {
    id: 'cloakroom', name: 'The Cloakroom',
    body: 'A wall of numbered hooks, all empty but one. A brass ticket lies on the counter with your number on it. Whatever you checked here, you checked a long time ago.',
    choices: [
      { label: 'Reclaim your coat', hint: 'Heal 10 HP.', run: async (api) => { api.hp(10); api.result('You shrug into something that still fits, and remembers being warm. +10 HP.'); } },
      { label: 'Pocket the ticket instead', hint: '+30 chips.', run: async (api) => { api.chips(30); api.result('Brass is brass. You leave the coat for whoever comes after. +30 chips.'); } },
    ],
  },
  {
    id: 'music_box', name: 'The Music Box',
    body: 'A rosewood box, lid ajar, the comb inside furred with dust. Wind it, and it will sweeten one card in your shoe. Leave it, and the quiet stays kind.',
    choices: [
      { label: 'Wind it', hint: 'Enchant a random card for free.', run: async (api) => { const info = api.enchantRandom(); api.result(info ? `The comb sings once. A card is now ${info}.` : 'The comb is bare. Every card already sings.'); } },
      { label: 'Let it sleep', hint: 'Nothing happens.', run: async (api) => api.result('You close the lid. Some songs are better left unwound.') },
    ],
  },
  {
    id: 'night_teller', name: 'The Night Teller',
    body: 'A caged window, a clerk with no eyes behind it. "Deposits or withdrawals," it says. "You may borrow against yourself. The rate is blood. It is always blood."',
    choices: [
      { label: 'Withdraw against yourself', hint: '−8 HP → +40 chips.', enabled: (run) => run.hp > 8, run: async (api) => { api.hp(-8); api.chips(40); api.result('The drawer opens on forty chips and closes on a little more of you.'); } },
      { label: 'Deposit a favor', hint: '−20 chips → gain a random relic.', enabled: (run) => run.chips >= 20, run: async (api) => { api.chips(-20); const r = api.giveRandomRelic(); api.result(r ? `The clerk files your chips and slides back the ${r.name}.` : 'The clerk takes your chips and offers only silence.'); } },
      { label: 'Close the window', hint: 'Decline.', run: async (api) => api.result('The cage rattles shut. It will be open again, for someone.') },
    ],
  },
  {
    id: 'the_portrait', name: 'The Portrait',
    body: 'A painted guest hangs above a cold hearth — your posture, your hands, a face the varnish has taken. A knife rests on the mantel, as if left for you.',
    choices: [
      { label: 'Cut a strip of canvas', hint: 'Bloodstain a random card. −5 HP.', run: async (api) => { api.hp(-5); const info = api.enchantRandom('bloodstained'); api.result(info ? 'The canvas bleeds a little. A card takes the stain.' : 'The knife finds no card to mark.'); } },
      { label: 'Walk past it', hint: 'Take nothing.', run: async (api) => api.result('You do not meet its eyes. It keeps them anyway.') },
    ],
  },

  // ==================================================================
  // SCRIPTED ENCOUNTERS — arc-gated (story:true). See story.js / SPEC2 §B.
  // ==================================================================
  {
    id: 'concierge_1', name: 'The Concierge', story: true,
    gate: (run) => (run.arc.conciergeStage || 0) === 0,
    body: 'A man in a brass-buttoned coat keeps this floor. He has your face, almost, worn thin by years. You reach for a chip to tip him.',
    choices: [
      {
        label: 'Offer him a chip', hint: 'A courtesy.',
        run: async (api) => { api.setConciergeStage(1); api.result('He folds your hand shut around it, gently. "Keep your coin. Down here it only buys you deeper."'); },
      },
      {
        label: 'Ask who he is', hint: 'Just talk.',
        run: async (api) => { api.setConciergeStage(1); api.result('"I keep the doors," he says. "I was a guest once, like you. Mind the chair." He will not say more.'); },
      },
    ],
  },
  {
    id: 'concierge_2', name: 'The Concierge', story: true, order: 2,
    gate: (run) => (run.arc.conciergeStage || 0) === 1 && (run.floor + 1) >= 8,
    body: 'The Concierge slides open a long drawer with brass corners. Inside, a card with your name — and under it, three trinkets of the dead. "One is yours," he says. "The House owes you that much. Choose before it changes its mind."',
    choices: [
      {
        label: 'Take one', hint: 'A free peek — choose 1 of 3 relics.',
        run: async (api) => { const r = await api.relicPeek('The drawer offers three'); api.setConciergeStage(2); api.result(r ? `You lift the ${r.name}. He closes the drawer over your name again.` : 'You leave the drawer as it lies. He closes it, unsurprised.'); },
      },
      {
        label: 'Close the drawer', hint: 'Take nothing.',
        run: async (api) => { api.setConciergeStage(2); api.result('"As you like." He slides your name back into the dark. "Some things are lighter left unowned."'); },
      },
    ],
  },
  {
    id: 'bride_1', name: 'The Weeping Bride', story: true,
    gate: (run) => (run.arc.weepingBride || 0) === 0,
    body: 'A bride sits at a dead table, veil grey with dust, a hand of cards she will not turn. "I had a ring," she says, not looking up. "Diamonds. Find it for me. It will be in the shoe by now — it always finds the shoe."',
    choices: [
      {
        label: 'Promise to find it', hint: 'The Ring — a Gilded 5♦ — enters your shoe.',
        run: async (api) => { api.addRing(); api.setBrideStage(1); api.result('Something small and bright slips into the shoe. It is warm, as though lately worn.'); },
      },
      {
        label: 'Leave her to her hand', hint: 'Take nothing.',
        run: async (api) => api.result('She does not look up. The cards stay face down, and stay, and stay.'),
      },
    ],
  },
  {
    id: 'bride_2', name: 'The Weeping Bride', story: true, order: 4,
    gate: (run) => (run.arc.weepingBride || 0) === 1 && run.hasRingCard(),
    body: 'The bride is standing now, veil thrown back on a face you cannot quite hold. "You carry it," she says. "I feel it in the shoe. Give it back — or keep it, and let it remember me for you."',
    choices: [
      {
        label: 'Return the Ring', hint: 'Remove it. Gain a rare relic and 40 chips.',
        run: async (api) => { api.removeRing(); const r = api.giveRareRelic(); api.chips(40); api.setBrideStage(2); api.result(r ? `You lay the Ring in her palm. She weeps, once, and presses the ${r.name} into yours.` : 'You lay the Ring in her palm. She weeps, once, and folds forty chips into your hand.'); },
      },
      {
        label: 'Keep the Ring', hint: 'It upgrades — also +4 damage in your winning hands.',
        run: async (api) => { api.upgradeRing(); api.setBrideStage(2); api.result('You keep it. The Ring drinks a little red now, and remembers her in every hand you win.'); },
      },
    ],
  },
];

// Choose the next shrine: prefer an eligible scripted (arc) encounter, else a generic one.
export function pickShrineEvent(run) {
  const scripted = EVENTS.filter((e) => e.story && typeof e.gate === 'function' && e.gate(run));
  if (scripted.length && run.rng.chance(0.75)) return run.rng.pick(scripted);
  const generic = EVENTS.filter((e) => !e.story);
  return run.rng.pick(generic);
}
