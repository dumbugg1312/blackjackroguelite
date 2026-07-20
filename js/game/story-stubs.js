// story-stubs.js — authored copy for the Lounge, its songs, and the Pawnbroker.
//
// (Named "stubs" for historical reasons; the narrative pass has filled every value.
// Richer, act-aware Concierge greetings live in js/game/story.js — the Lounge screen
// draws its greeting from there and uses this file's copy for the after-line fallback.)
// Keys are stable; consumers: ui/lounge.js, ui/pawnbroker.js.

import { SONG_FLAVOR } from './story.js';

export const STORY_STUBS = {
  // ---- The Lounge (SPEC2 §C new room) ----
  lounge: {
    title: 'The Lounge',
    // Fallback greeting; the screen prefers story.conciergeGreeting('lounge', floor).
    greeting: 'Elias Vann sets down a glass you did not order. "One song," he says. "Choose."',
    conciergeName: 'Elias Vann, the Concierge',
    afterChoose: 'He lifts the needle. The song follows you down.',
  },

  // ---- Lounge songs (flavor mirrors story.SONG_FLAVOR) ----
  songs: {
    encore: { line: SONG_FLAVOR.encore },
    tell: { line: SONG_FLAVOR.tell },
    lullaby: { line: SONG_FLAVOR.lullaby },
  },

  // ---- The Pawnbroker (SPEC2 §E meta screen) — Abe Fisch, Point Cadet.
  // The one living man in Biloxi who knows what the Magnolia is; he has been buying
  // back what's left of its losers since 1931. Appraises you, unimpressed. ----
  pawnbroker: {
    intro: 'Abe Fisch keeps the only lit window on Point Cadet, across from the Magnolia\'s doors. He turns your marker in the light. "Back so soon, Creel. Take one thing on credit — or owe me nothing."',
    skip: 'Owe him nothing',
    afterTake: 'He slides it across without looking up. "Bring it back in one piece. Or don\'t come back."',
  },
};
