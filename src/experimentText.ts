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
