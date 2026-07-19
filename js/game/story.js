// story.js — "The Second Deal" narrative layer. Line pools, bark triggers, arc state.
//
// Voice contract (STORY.md): velvet, ominous, precise. Second person, present tense.
// Short lines — nothing over ~18 words. No modern idiom, no proper nouns from the real
// world, no lore dumps over four lines. The House speaks in ledgers, accounts, contracts,
// hospitality. Authored boss exchanges & endings below are VERBATIM from STORY.md.
//
// Arc state lives on run.arc (serialized with the run). This module reads/writes it but
// never persists on its own — run.save() owns the storage.

// ---------- acts ----------
export function actOf(floor) { return floor <= 7 ? 1 : floor <= 14 ? 2 : 3; }
export function actRoman(floor) { return ['I', 'II', 'III'][actOf(floor) - 1]; }

// ---------- arc state defaults / migration ----------
// Shape: { actSeen:[], openingSeen, weepingBride, conciergeStage, ringId, ringKept,
//          confessionSeen, whisperSeen:{1:[],2:[],3:[]} }
export function ensureArc(run) {
  const a = run.arc || (run.arc = {});
  if (!Array.isArray(a.actSeen)) a.actSeen = [];
  if (typeof a.weepingBride !== 'number') a.weepingBride = 0;
  if (typeof a.conciergeStage !== 'number') a.conciergeStage = 0;
  if (typeof a.openingSeen !== 'boolean') a.openingSeen = false;
  if (typeof a.confessionSeen !== 'boolean') a.confessionSeen = false;
  if (a.ringId == null) a.ringId = null;
  if (typeof a.ringKept !== 'boolean') a.ringKept = false;
  if (!a.whisperSeen || typeof a.whisperSeen !== 'object') a.whisperSeen = { 1: [], 2: [], 3: [] };
  for (const k of [1, 2, 3]) if (!Array.isArray(a.whisperSeen[k])) a.whisperSeen[k] = [];
  return a;
}

export function markActSeen(run, act) { const a = ensureArc(run); if (!a.actSeen.includes(act)) a.actSeen.push(act); }
export function hasActSeen(run, act) { return ensureArc(run).actSeen.includes(act); }

// ======================================================================
// 1. OPENING VIGNETTE + ACT INTERSTITIALS  (verbatim, STORY.md §Delivery)
// ======================================================================
// Three pages, shown in sequence before floor 1. Page 1 = the world, page 2 = who
// you are and how you fell, page 3 = the hollow years, tonight, the goal, the stakes.
export const OPENING = [
  {
    title: 'The House',
    lines: [
      'At the end of every ruined gambler\'s last road, there is a House that does not take money.',
      'It deals for what you are. Names. Years. Weddings. The color of your eyes.',
      'Win, and it pays out miracles. Lose, and you walk home lighter.',
      'Everyone walks home lighter.',
    ],
  },
  {
    title: 'The Debtor',
    lines: [
      'You found it the way everyone does — at the bottom, with nothing left the world upstairs would take.',
      'The House sat you down anyway. It lent you a stake against yourself. And at first, you won.',
      'Then the cards turned. Hand after hand it took your name, your years, your wedding, the color of your eyes.',
      'When nothing else was left, it dealt one final hand — and you signed the Marker. The deed to your soul.',
    ],
  },
  {
    title: 'Tonight',
    lines: [
      'You have lived hollow ever since. Food without taste. Sleep without dreams. A mirror that forgets your face.',
      'The Marker is why. It sits twenty-one floors down, filed in a drawer with brass corners.',
      'Tonight, for the first time in all these years, the doors forgot to lock.',
      'Descend. Beat the dealer on every floor. At the last table, beat the House itself.',
      'Win back the Marker and walk out whole — or bust, and be filed beside it forever.',
    ],
  },
];

export const INTERSTITIAL = {
  2: {
    title: 'The Vaults',
    lines: [
      'Seven dealers down. Fourteen floors between you and the Marker.',
      'This is where the House keeps what it won: names, weddings, summers.',
      'Yours waits below, in a drawer with brass corners. It knows you\'re coming. The cards are getting heavier.',
    ],
  },
  3: {
    title: 'The Pit',
    lines: [
      'Fourteen dealers down. Six floors left. Then the House itself, and the Marker in its hand.',
      'No music this far down. Just the sound the shoe makes when it\'s afraid.',
      'It has stopped sending dealers. Now it sends family.',
    ],
  },
};

// ======================================================================
// 2. THE VOICE OF THE HOUSE — landing whispers (≥8/act, courtesy→curiosity→fear)
// ======================================================================
const WHISPERS = {
  1: [ // Act I — the House is amused, polite, condescending
    'Welcome down. Mind the last step; others didn\'t.',
    'Take your time. We kept your seat warm a long while.',
    'You look just like your signature.',
    'The parlors are yours tonight. Do enjoy them.',
    'Lose slowly. It\'s more hospitable that way.',
    'A drink? No — you gave us your thirst years ago.',
    'How charming, that you think you came here to win.',
    'Every guest feels lucky on the first floor.',
    'Sit anywhere. It all belongs to the House.',
  ],
  2: [ // Act II — the House is interested, curious, cataloguing
    'You\'re further down than the others got.',
    'The House is watching your hands now.',
    'We have a drawer with your name on it. Brass corners.',
    'Curious. You play like someone with something to lose.',
    'Down here we keep the winters you don\'t remember.',
    'The cards are heavier now. Have you noticed?',
    'You\'re making the House think. It doesn\'t like that.',
    'Somewhere on this floor, your wedding is filed.',
    'Keep coming. We are almost interested in you.',
  ],
  3: [ // Act III — the House is afraid; no music, only dread
    'There is no music this far down.',
    'The House would like to renegotiate.',
    'Stop. Please. You were such a quiet account.',
    'It is sending family now. Do not take the chair.',
    'Listen — the shoe is shaking.',
    'You are close enough to frighten it.',
    'Turn back. There is still so much we could keep.',
    'The candle is guttering. So is the House.',
    'No dealers left. Only the thing in the walls.',
  ],
};

// Seeded, no-repeat-until-exhausted draw of one whisper for the upcoming landing.
export function drawWhisper(run, upcomingFloor) {
  const a = ensureArc(run);
  const act = actOf(upcomingFloor);
  const pool = WHISPERS[act];
  let seen = a.whisperSeen[act];
  if (seen.length >= pool.length) seen = a.whisperSeen[act] = [];
  const avail = pool.map((_, i) => i).filter((i) => !seen.includes(i));
  const idx = avail[Math.floor(run.rng.next() * avail.length)];
  seen.push(idx);
  return pool[idx];
}

// ======================================================================
// 3. DEALER DIALOGUE — intro / barks (blackjack, dealerWin, low) / death
//    Each dealer in its own register (STORY.md §4).
// ======================================================================
const DEALERS = {
  usher: { // kind, teacherly
    intro: 'Welcome down. Sit. I will show you how we play.',
    blackjack: ['A natural. Oh — well played, truly.', 'You learn faster than I meant to teach.'],
    dealerWin: ['There now. No harm in it.', 'Gently. The House is patient with beginners.'],
    low: ['You\'re better at this than the last one.'],
    death: 'He bows, kindly. "You were a quick study. I\'m sorry for what\'s below."',
  },
  croupier: { // rusted, grinding, mechanical
    intro: 'My hands are stiff, but the rake never sleeps.',
    blackjack: ['Tch. The wheel slipped.', 'Rare. I\'ll oil the count.'],
    dealerWin: ['Grind, grind. Down it goes.', 'The rake turns whether you like it or not.'],
    low: ['My joints... are seizing.'],
    death: 'His hands lock mid-deal, and the rake finally, gratefully, stops.',
  },
  weeper: { // apologizes; feeds on your ruin
    intro: 'Your ruin nourishes me. Please... overreach.',
    blackjack: ['No — I\'m sorry, I didn\'t mean for you to win.', 'Forgive me. I was so hungry.'],
    dealerWin: ['I\'m sorry. I\'m so sorry. Cry with me.', 'Forgive me — your grief is delicious.'],
    low: ['Please. I only wanted a little of you.'],
    death: 'The Weeper weeps for itself now, and dissolves into the salt of it.',
  },
  pitfiend: { // relentless, taking
    intro: 'I do not stop. I do not blink. I take.',
    blackjack: ['A twitch. It won\'t happen twice.', 'Luck. I do not fear luck.'],
    dealerWin: ['More. Down you go.', 'I take. That is all I do.'],
    low: ['No. I do not lose. I take.'],
    death: 'It reaches for more and finds nothing, and the nothing takes it.',
  },
  counter: { // cold, precise, arithmetical
    intro: 'I have nothing to hide. That is what makes me cruel.',
    blackjack: ['An outlier. I will correct for it.', 'The distribution betrayed me. Once.'],
    dealerWin: ['Predicted. To the card.', 'I saw that hand before you drew it.'],
    low: ['My figures... no longer hold.'],
    death: 'Every card he counted comes due at once, and the sum erases him.',
  },
  valet: { // marble, imperious, decides the rules
    intro: 'A tie is a loss. I decide what a tie is.',
    blackjack: ['A crack in the marble. Nothing more.', 'The stone permits you one.'],
    dealerWin: ['As decided. As always decided.', 'I ruled it a loss. It is a loss.'],
    low: ['The marble is... fracturing.'],
    death: 'The valet cracks head to heel and comes down in cold white pieces.',
  },
  chandler: { // wax, patient, transactional
    intro: 'Every light has its price. So does every card.',
    blackjack: ['You burned bright. It costs the same.', 'The wick will remember this.'],
    dealerWin: ['Burn for me. The wax runs low.', 'Every flame is billed in the end.'],
    low: ['I am guttering. Snuff me kindly.'],
    death: 'The Chandler burns to the socket, and for once a light goes out for good.',
  },
  widow: { // flirts like a trap
    intro: 'Your royalty means nothing at my table, darling.',
    blackjack: ['Ooh. Bold. I could almost keep you.', 'A natural, and such lovely hands to lose it with.'],
    dealerWin: ['Bow to me, sweet thing.', 'Poor little kings. Come closer.'],
    low: ['Don\'t. Don\'t you dare, darling.'],
    death: 'The Widow blows you one last kiss, and the veil settles over nothing at all.',
  },
  auditor: { // cites policy
    intro: 'Doubling is a form of hope. I have filed a complaint.',
    blackjack: ['Noted, under exceptions. Rare.', 'An irregularity. I will document it.'],
    dealerWin: ['Per the ledger. Per policy.', 'Filed against your account. Duly.'],
    low: ['This... exceeds my authority.'],
    death: 'The Auditor stamps his own file PENDING and is duly, finally closed.',
  },
  clerk: { // funereal, quiet
    intro: 'I always start with ten. It is the weight of the lid.',
    blackjack: ['The nail slips. Rare, that.', 'Even the lid can be lifted once.'],
    dealerWin: ['Rest now. Filed away.', 'The lid closes. It always closes.'],
    low: ['The box is... coming open.'],
    death: 'The Coffin Clerk lies down in his own long drawer and pulls it shut.',
  },
  bailiff: { // elite — legal menace
    intro: 'Two writs. I serve whichever hurts you more.',
    blackjack: ['Objection. Overruled by the cards.', 'A technicality in your favor. Enjoy it.'],
    dealerWin: ['Sentenced. Order in the pit.', 'The crueler writ, as promised.'],
    low: ['I move for... a recess.'],
    death: 'The Bailiff serves himself last, and files out of the record entirely.',
  },
  saint: { // elite — devotional, zealous
    intro: 'Every ace is a prayer. They all answer to me.',
    blackjack: ['Blasphemy. A beautiful blasphemy.', 'The aces strayed. I forgive them.'],
    dealerWin: ['Amen. The aces are mine.', 'Kneel. The prayer is answered.'],
    low: ['My saints... are abandoning me.'],
    death: 'Her aces desert her all at once, and the halo falls dark around nothing.',
  },
  oddsmaker: { // Acts II–III, stake-aware, gambler's cadence
    intro: 'The odds move every hand. I make sure of it.',
    blackjack: ['The line didn\'t cover that. Rare.', 'You beat the number. Briefly.'],
    dealerWin: ['The house edge holds.', 'As the line predicted. It always does.'],
    low: ['The odds are... turning on me.'],
    death: 'He sets his own line at nothing, and pays it out to the felt.',
  },
};

// Boss exchanges (VERBATIM authored, STORY.md). intro / phase (mid) / low / death.
const BOSSES = {
  bouncer: {
    intro: 'You\'re not on the list. You\'re in it.',
    phase: 'The list is getting shorter.',
    low: 'The list is getting shorter.',
    death: 'He checks his ledger one last time — and files you under pending.',
  },
  cardsharp: {
    intro: 'I dealt your wedding, you know. Lovely hand. Shame how it played out.',
    swap: 'Let me fix that for you.',
    low: 'Let me fix that for you.',
    death: 'He fans himself out on the felt — every card a face you almost remember.',
  },
  house: {
    intro: 'Sit. You\'ve come twenty floors to hear me say it: the Marker is real. Your signature is real. Nothing in this room is yours — including the chair.',
    phase: 'THE FINE PRINT.',
    low: 'We can renegotiate.',
    death: 'The walls go quiet. For the first time in a hundred years, the House holds no cards.',
  },
};

export function introLine(enemy) {
  if (enemy.tier === 'boss') return (BOSSES[enemy.id] || {}).intro || enemy.def.intro;
  const d = DEALERS[enemy.id];
  return d ? d.intro : enemy.def.intro;
}
export function deathLine(enemy) {
  if (enemy.tier === 'boss') return (BOSSES[enemy.id] || {}).death || '';
  const d = DEALERS[enemy.id];
  return d ? d.death : '';
}
export function bossSwapLine(enemy) { return (BOSSES[enemy.id] || {}).swap || ''; }

// Pick a bark for a trigger, avoiding lines already used this fight when possible.
// trigger: 'blackjack' | 'dealerWin' | 'low'
export function barkLine(enemy, trigger, rng, seen) {
  let pool;
  if (enemy.tier === 'boss') {
    const b = BOSSES[enemy.id] || {};
    // Bosses speak their single authored line for the moment.
    if (trigger === 'low') return b.low || '';
    if (trigger === 'phase') return b.phase || '';
    return ''; // bosses do not chatter on win/blackjack; their beats are scripted
  }
  const d = DEALERS[enemy.id];
  if (!d) return '';
  pool = d[trigger];
  if (!pool || !pool.length) return '';
  const fresh = pool.filter((l) => !seen || !seen.has(l));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(rng() * from.length)];
}

// ======================================================================
// 5. THE CONCIERGE — act-specific greetings (shop / parlor / lounge)
// ======================================================================
// He was the last debtor to beat the House — and he took the chair. Courtesy (I) →
// oblique warning (II) → the edge of confession (III). Never more than two sentences.
const CONCIERGE = {
  shop: {
    1: 'Welcome to the Cage. Spend freely — coin means nothing where you\'re going.',
    2: 'Buy what you can carry. The floors below don\'t take returns.',
    3: 'Arm yourself. And when it offers you the chair, remember I greeted you here first.',
  },
  parlor: {
    1: 'Rest. Cut the deck. The House allows you this much, for now.',
    2: 'Bind your wounds while it still lets you. It\'s counting them.',
    3: 'Rest, then. You\'ll want your hands steady for what wears my old face.',
  },
  lounge: {
    1: 'One song, on the House. Choose — it follows you down.',
    2: 'I poured for the last one who got this far, too. Choose your song.',
    3: 'Sit. Let me pour. Down here a song is the only mercy left in the walls.',
  },
};
export function conciergeGreeting(place, floor) {
  const m = CONCIERGE[place]; if (!m) return '';
  return m[actOf(floor)] || m[1];
}

// The Concierge's Act III confession — the third scripted encounter, delivered as a
// guaranteed full-screen beat before floor 20. Final line is VERBATIM (STORY.md §5).
export const CONFESSION = {
  title: 'The Concierge',
  lines: [
    'You reached my floor. The last one who did was me.',
    'I beat the House. Then it rose, and offered me the chair.',
    'When it offers you the chair — and it will — choose the door. I didn\'t.',
  ],
};

// Lounge song flavor (in-world italic lines).
export const SONG_FLAVOR = {
  encore: 'The crowd that clapped for this is a hundred years of dust.',
  tell: 'A tune only played when the dealer is losing his nerve.',
  lullaby: 'The House used to hum it, back when it still slept.',
};

// ======================================================================
// 7. FINAL CHOICE — the two endings (VERBATIM, STORY.md §Endings)
// ======================================================================
export const ENDINGS = {
  escape: {
    id: 'escape',
    label: 'Take the Marker',
    sub: 'Burn the debt.',
    text: 'You burn it in the candle. It goes up like a decade. Upstairs, the doors stand open on a gray morning you have never seen before. — THE DEBT IS PAID.',
    banner: 'THE DEBT IS PAID',
  },
  inheritance: {
    id: 'inheritance',
    label: 'Take the Chair',
    sub: 'Sit where he sat.',
    text: 'The House rises to let you sit. It always needed a dealer more than a debtor. Somewhere upstairs, the doors forget to lock.',
    banner: 'UNDER NEW MANAGEMENT',
  },
};

// ======================================================================
// 8. DEATH EPITAPHS — keyed to cause of death (≥6; STORY.md §Death)
// ======================================================================
const EPITAPHS = {
  bust: [
    'You reached for one card too many. The House thanks you for your greed.',
    'Twenty-two. The oldest way to lose everything at once.',
    'You overreached, and the felt drank the difference.',
  ],
  dealer: [
    'The dealer\'s hand was quieter than yours, and quieter always wins here.',
    'You lost the way most guests do — politely, hand by hand.',
    'No single blow. Just the arithmetic of the House, done twice over.',
  ],
  bouncer: [
    'You never made the list. The Bouncer files you where the small change goes.',
    'The First Gate holds. It was built to hold.',
  ],
  cardsharp: [
    'He dealt your wedding, and now he deals your wake.',
    'A card you almost recognized turned in his hand, and it was over.',
  ],
  house: [
    'You came twenty-one floors to sign, and the House held the pen the whole time.',
    'The Fine Print had your name in it from the beginning.',
  ],
  boss: [
    'Something that broke the rules broke you with them.',
    'The rules ended here, exactly as promised.',
  ],
  debt: [
    'A dead card, a dead account. The House balances its books in blood.',
    'You borrowed against a future the House already owned.',
  ],
};

// cause: 'bust' | 'dealer' | 'debt' | boss id ('bouncer'|'cardsharp'|'house') | 'boss'
export function epitaph(cause, rng) {
  const pool = EPITAPHS[cause] || EPITAPHS.dealer;
  return pool[Math.floor((rng ? rng() : Math.random()) * pool.length)];
}

// The standing line under every death.
export const DEATH_STANDING = 'THE HOUSE KEEPS YOUR BLOOD ON ACCOUNT.';
