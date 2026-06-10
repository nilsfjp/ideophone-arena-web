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
