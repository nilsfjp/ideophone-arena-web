// EXPERIMENTALLY FROZEN TEXT — DO NOT REWORD (CLAUDE.md invariant 1).
//
// These are the participant-facing trial strings of the 2AFC experiment,
// adjudicated with the researcher on 2026-06-10. They carry experimental
// meaning: changing, "improving", duplicating, or relocating them alters the
// instrument. All trial renderers must import from this module; no trial
// string literals may exist in components. The {target}/{other} translations
// are interpolated between prefix and suffix and rendered in bold, with no
// quotation marks.
export const LISTEN_INSTRUCTION = "Listen to these two Japanese words.";

export const MEANING_TARGET_PREFIX = "One of them means ";
export const MEANING_OTHER_PREFIX = "The other means ";

export const CHOICE_QUESTION_PREFIX = "Which one do you think means ";
export const CHOICE_QUESTION_SUFFIX = "?";

// EXPERIMENTALLY FROZEN TEXT — RATING TASK (27D, adjudicated 2026-07-02).
//
// Thesis/Gorilla-verbatim copy for the Rating Lab (reflective measure), from
// docs/research/design-archive/gorilla-rating-task-*.png. The instructions are
// the Gorilla text with a dynamic word count and the fixed time estimate
// dropped; every other string is verbatim. Bold spans (<strong>) interpolate
// between the prefix/segment constants exactly as the choosing-task strings
// do: the count is NOT bolded; "1", "7", "no resemblance", and
// "strong resemblance" are.
export const RATING_INTRO_PREFIX = "In this task, you will rate ";
export const RATING_INTRO_AFTER_COUNT =
  " words from the previous task. In each trial, you will be shown a Japanese word together with its English meaning. Your task is to rate how much you think the word resembles its meaning on a scale from ";
export const RATING_INTRO_TO = " to ";
export const RATING_SENTENCE_END = ".";
export const RATING_SCALE_MIN = "1";
export const RATING_SCALE_MAX = "7";

export const RATING_INDICATES = " indicates ";
export const RATING_WHILE = " while ";
export const RATING_ANCHOR_LOW_INLINE = "no resemblance";
export const RATING_ANCHOR_HIGH_INLINE = "strong resemblance";

export const RATING_HOW_TO =
  "Click on a number (1–7) to select your rating, then press 'Next' to submit your response.";

export const RATING_LISTEN_LINE_1 = "Listen to the Japanese word below.";
export const RATING_LISTEN_LINE_2 = "Click to replay.";
export const RATING_MEANING_PREFIX = "It means ";
export const RATING_QUESTION =
  "Do you think there is a resemblance between the word and its meaning?";
export const RATING_SCALE_LOW_LABEL = "No resemblance";
export const RATING_SCALE_HIGH_LABEL = "Strong resemblance";
export const RATING_REPLAY_BUTTON = "Replay";
export const RATING_NEXT_BUTTON = "Next";

// EXPERIMENTALLY FROZEN TEXT — WORD MINT / PRODUCTION (NIL-83, adjudicated
// 2026-07-06; SPEC-view-designs.md section 8).
//
// Overriding principle from the adjudication: player copy is LANGUAGE-NEUTRAL —
// no string names Japanese. The kana reveal and the romaji examples carry the
// language implicitly, which is what keeps the cross-linguistic mode possible.
//
// Case: authored sentence case and uppercased by CSS (.specimen, .mint-chip are
// text-transform: uppercase). Section 8 prints them uppercase because that is
// their rendered form, not their source form.
//
// Interpolation follows the choosing/rating convention: the value is a JSX
// element placed between prefix and suffix constants. There is no markdown
// renderer in this codebase and none is to be added.
export const MINT_INSTRUCTION =
  "Invent a word whose sound fits the meaning below. Type it in roman letters.";

export const MINT_ONE_SHOT_LABEL = "One try per word";
export const MINT_ONE_SHOT_SUPPORT = "Your first instinct is the data.";
export const MINT_SUBMIT_BUTTON = "Mint this word";

// The two example words render in <em>; the attempt is never consumed by a
// parse failure, so this helper is guidance, not a penalty.
export const MINT_PARSE_ERROR_PREFIX =
  "That didn't read as speakable syllables — try simple roman letters, like ";
export const MINT_PARSE_ERROR_EXAMPLE_ONE = "gorogoro";
export const MINT_PARSE_ERROR_BETWEEN = " or ";
export const MINT_PARSE_ERROR_EXAMPLE_TWO = "pika";
export const MINT_PARSE_ERROR_SUFFIX = ".";

// {displayForm} interpolates in <strong lang="ja">, rendered verbatim from the
// DTO — never converted, never derived (invariant 1/3).
export const MINT_REVEAL_PREFIX = "The real word is ";
export const MINT_REVEAL_SUFFIX = ".";

export const MINT_SCORE_LABEL = "Similarity · 0–100";

// Section 8.2 freezes each band as "{score} — <tail>", so the score is part of
// the sentence. These are the tails; the numeral interpolates before them (and
// also stands alone as the large .score-figure, per section 2.3.4).
export const MINT_BAND_ALMOST = " — your instinct is almost the same word.";
export const MINT_BAND_MOST =
  " — your instinct shares most of its shape with the real word.";
export const MINT_BAND_SOME = " — your word and the real one share some bones.";
export const MINT_BAND_DIFFERENT =
  " — a different creature — which is also data.";

export const MINT_NEXT_BUTTON = "Next meaning";
export const MINT_BACK_BUTTON = "Back to modes";

// Section 8.3 chip vocabulary, in the frozen feature order. Romaji/English only:
// no kana glyphs in chrome. The "· Q" and "· N" notations match the scorer's
// normalization and are deliberate.
export const MINT_CHIP_REDUP = "Doubled shape";
export const MINT_CHIP_SOKUON = "Sharp cut · Q";
export const MINT_CHIP_FINAL_N = "Nasal ending · N";
export const MINT_CHIP_RI_SUFFIX = "-ri ending";
export const MINT_CHIP_VOICED_ONSET = "Heavy onset";
export const MINT_CHIP_HEAVY_VOWEL_RATIO = "Vowel weight";
export const MINT_CHIP_LENGTH_PREFIX = "Length · ";
export const MINT_CHIP_LENGTH_SUFFIX = " morae";

// Section 8.4: "WORD {i} OF {n} · YOUR MEAN {m}". The mean segment is omitted
// until the player has minted at least one word — a mean of zero samples has no
// frozen form, and inventing one would be a copy decision.
export const MINT_STATUS_WORD_PREFIX = "Word ";
export const MINT_STATUS_OF = " of ";
export const MINT_STATUS_MEAN_PREFIX = " · your mean ";

// NOT FROZEN BY SECTION 8. Nils ruled the mockup's `.yours-line` ships trimmed
// of its generated clause (2026-07-09), so the player's typed word is visible
// outside the collapsed comparison table. Pending a section 8 amendment.
export const MINT_YOURS_PREFIX = "You minted ";
export const MINT_YOURS_SUFFIX = ".";
