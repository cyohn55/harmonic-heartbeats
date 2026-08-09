'use strict';

/**
 * Channel-agnostic trivia quiz state machine.
 *
 * This module contains no I/O and no knowledge of WhatsApp, SMS, or the web UI.
 * It takes an artist's trivia and advances a plain-object quiz state, which the
 * web app and each messaging channel drive independently. State transitions
 * return new objects rather than mutating, which keeps them easy to test and
 * safe to persist between asynchronous messages.
 */

function createQuiz(artist) {
  if (!artist || !Array.isArray(artist.trivia) || artist.trivia.length === 0) {
    throw new Error('createQuiz requires an artist with at least one trivia question.');
  }
  return {
    artistId: artist.id,
    artistName: artist.name,
    questions: artist.trivia,
    currentIndex: 0,
    score: 0,
    finished: false,
  };
}

function currentQuestion(quiz) {
  if (quiz.finished || quiz.currentIndex >= quiz.questions.length) {
    return null;
  }
  return quiz.questions[quiz.currentIndex];
}

/**
 * Applies a selected option to the current question.
 *
 * Returns `{ accepted: false }` (with the quiz unchanged) when the selection is
 * not a valid option, so a caller can re-prompt without corrupting the score.
 */
function submitAnswer(quiz, selectedOption) {
  const question = currentQuestion(quiz);
  if (!question) {
    throw new Error('No active question to answer; the quiz is already finished.');
  }
  if (!question.options.includes(selectedOption)) {
    return { accepted: false, quiz };
  }

  const isCorrect = selectedOption === question.correctAnswer;
  const nextIndex = quiz.currentIndex + 1;
  const finished = nextIndex >= quiz.questions.length;

  const updatedQuiz = {
    ...quiz,
    score: quiz.score + (isCorrect ? 1 : 0),
    currentIndex: nextIndex,
    finished,
  };

  return {
    accepted: true,
    isCorrect,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    quiz: updatedQuiz,
  };
}

function summarize(quiz) {
  const total = quiz.questions.length;
  return {
    score: quiz.score,
    total,
    perfect: total > 0 && quiz.score === total,
  };
}

module.exports = { createQuiz, currentQuestion, submitAnswer, summarize };
