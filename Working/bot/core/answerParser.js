'use strict';

/**
 * Interprets a free-text chat reply as a selection among a question's options.
 * Accepts either a 1-based option number ("2") or the option text itself
 * (case-insensitive), returning the canonical option string or null when the
 * reply matches nothing.
 */

function parseOptionSelection(question, rawText) {
  const text = String(rawText).trim();
  if (text.length === 0) {
    return null;
  }

  // Match the option text first, so an answer whose text is itself a number
  // (e.g. an album titled "21") is not mistaken for a positional selection.
  const lowered = text.toLowerCase();
  const textMatch = question.options.find((option) => option.toLowerCase() === lowered);
  if (textMatch) {
    return textMatch;
  }

  // Otherwise, treat a bare number as a 1-based option position.
  if (/^\d+$/.test(text)) {
    const position = Number.parseInt(text, 10);
    if (position >= 1 && position <= question.options.length) {
      return question.options[position - 1];
    }
  }

  return null;
}

module.exports = { parseOptionSelection };
