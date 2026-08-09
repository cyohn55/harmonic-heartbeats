'use strict';

/**
 * Renders quiz state into WhatsApp-friendly text (WhatsApp supports *bold* and
 * _italics_). Formatting is isolated here so the conversation controller stays
 * focused on flow and so message wording can change without touching logic.
 */

const { buildListenLinks } = require('./songLinks');

function formatWelcome(repository) {
  const examples = repository.getAll().slice(0, 4).map((artist) => artist.name).join(', ');
  return [
    '🎶 *Welcome to Harmonic Heartbeats!*',
    '',
    'Reply *PLAY* for today\'s artist, *RANDOM* for a surprise,',
    `or send an artist name (e.g. ${examples}).`,
  ].join('\n');
}

function formatQuestion(question, index, total) {
  const lines = [`🎵 *Question ${index + 1} of ${total}*`, '', question.question, ''];
  question.options.forEach((option, position) => {
    lines.push(`${position + 1}. ${option}`);
  });
  lines.push('', '_Reply with the number of your answer._');
  return lines.join('\n');
}

function formatFeedback(result) {
  const heading = result.isCorrect
    ? '✅ *Correct!*'
    : `❌ Not quite — the answer is *${result.correctAnswer}*.`;
  return `${heading}\n${result.explanation}`;
}

function formatSummary(summary, artistName) {
  const base = `🎉 That's a wrap on *${artistName}*! You scored *${summary.score}/${summary.total}*.`;
  return summary.perfect ? `${base} A perfect score! 🏆` : base;
}

function formatSongs(artist) {
  const lines = ['', `🎧 *Today's ${artist.name} picks:*`];
  artist.songs.forEach((song) => {
    const links = buildListenLinks(artist.name, song.title);
    lines.push('', `*${song.title}* — ${song.fact}`, `▶️ ${links.youtube}`);
  });
  lines.push('', 'Reply *PLAY* to go again!');
  return lines.join('\n');
}

function formatSuggestions(suggestions) {
  const names = suggestions.map((artist) => `• ${artist.name}`).join('\n');
  return `Did you mean one of these?\n${names}\n\nSend the exact name to play.`;
}

module.exports = {
  formatWelcome,
  formatQuestion,
  formatFeedback,
  formatSummary,
  formatSongs,
  formatSuggestions,
};
