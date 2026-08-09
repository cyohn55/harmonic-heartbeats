'use strict';

/**
 * The channel-agnostic conversation controller: the "brain" of the bot.
 *
 * Given an inbound message and its dependencies (artist repository, session
 * store, and injectable clock/random source), it advances the player's quiz and
 * returns the outbound text replies. It performs no I/O itself, so it can be
 * driven identically by the WhatsApp webhook, a future SMS channel, or a test.
 */

const { createQuiz, currentQuestion, submitAnswer, summarize } = require('./quizEngine');
const { parseOptionSelection } = require('./answerParser');
const { artistOfTheDay } = require('./dailyArtist');
const formatter = require('./messageFormatter');

const STOP_COMMANDS = new Set(['stop', 'quit', 'cancel', 'exit']);
const DAILY_COMMANDS = new Set(['play', 'start', 'trivia', 'daily', 'go']);
const RANDOM_COMMANDS = new Set(['random', 'surprise']);
const HELP_COMMANDS = new Set(['help', 'hi', 'hello', 'hey', 'menu']);

function startQuiz(artist, store, userId) {
  const quiz = createQuiz(artist);
  store.set(userId, { quiz });
  const question = currentQuestion(quiz);
  return [
    `🎸 Today's artist: *${artist.name}* (${artist.genre})`,
    formatter.formatQuestion(question, quiz.currentIndex, quiz.questions.length),
  ];
}

function resolveArtist(repository, query) {
  const exactMatch = repository.getByName(query);
  if (exactMatch) {
    return { artist: exactMatch };
  }
  const matches = repository.search(query);
  if (matches.length === 1) {
    return { artist: matches[0] };
  }
  if (matches.length > 1) {
    return { suggestions: matches.slice(0, 5) };
  }
  return {};
}

function continueActiveQuiz(session, incomingText, store, userId, repository) {
  const question = currentQuestion(session.quiz);
  const selectedOption = parseOptionSelection(question, incomingText);

  if (selectedOption === null) {
    return {
      replies: [
        '🤔 I didn\'t catch that.',
        formatter.formatQuestion(question, session.quiz.currentIndex, session.quiz.questions.length),
      ],
    };
  }

  const result = submitAnswer(session.quiz, selectedOption);
  const replies = [formatter.formatFeedback(result)];

  if (result.quiz.finished) {
    store.delete(userId);
    const artist = repository.getById(result.quiz.artistId);
    replies.push(formatter.formatSummary(summarize(result.quiz), result.quiz.artistName));
    replies.push(formatter.formatSongs(artist));
  } else {
    store.set(userId, { quiz: result.quiz });
    const nextQuestion = currentQuestion(result.quiz);
    replies.push(formatter.formatQuestion(nextQuestion, result.quiz.currentIndex, result.quiz.questions.length));
  }

  return { replies };
}

function startFromCommand(incomingText, store, userId, deps) {
  const { repository, dateProvider, randomSource } = deps;
  const text = incomingText.trim();
  const lowered = text.toLowerCase();
  const [firstWord, ...restWords] = text.split(/\s+/);
  const remainder = restWords.join(' ');

  if (text.length === 0 || HELP_COMMANDS.has(lowered)) {
    return { replies: [formatter.formatWelcome(repository)] };
  }
  if (RANDOM_COMMANDS.has(lowered)) {
    return { replies: startQuiz(repository.getRandom(randomSource), store, userId) };
  }
  if (DAILY_COMMANDS.has(lowered)) {
    return { replies: startQuiz(artistOfTheDay(repository, dateProvider()), store, userId) };
  }

  // A command with an artist name ("play queen"), or a bare artist name.
  const query = DAILY_COMMANDS.has(firstWord.toLowerCase()) && remainder ? remainder : text;
  const resolved = resolveArtist(repository, query);
  if (resolved.artist) {
    return { replies: startQuiz(resolved.artist, store, userId) };
  }
  if (resolved.suggestions) {
    return { replies: [formatter.formatSuggestions(resolved.suggestions)] };
  }
  return { replies: [formatter.formatWelcome(repository)] };
}

function handleMessage(incoming, deps) {
  const {
    repository,
    store,
    dateProvider = () => new Date(),
    randomSource = Math.random,
  } = deps;

  const userId = incoming.userId;
  const text = String(incoming.text || '').trim();

  if (STOP_COMMANDS.has(text.toLowerCase())) {
    store.delete(userId);
    return { replies: ['👋 Ended. Reply *PLAY* whenever you want more trivia!'] };
  }

  const session = store.get(userId);
  if (session && session.quiz && !session.quiz.finished) {
    return continueActiveQuiz(session, text, store, userId, repository);
  }

  return startFromCommand(text, store, userId, { repository, dateProvider, randomSource });
}

module.exports = { handleMessage };
