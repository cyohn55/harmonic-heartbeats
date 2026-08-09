'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadArtists } = require('../Working/bot/core/artistRepository');
const {
  createQuiz,
  currentQuestion,
  submitAnswer,
  summarize,
} = require('../Working/bot/core/quizEngine');

const DATASET_PATH = path.join(__dirname, '..', 'Working', 'data', 'artists.json');

function firstArtist() {
  return loadArtists(DATASET_PATH).getAll()[0];
}

// Picks any option that is not the correct answer, so tests never hardcode a
// specific wrong string and stay valid as the dataset evolves.
function anIncorrectOption(question) {
  return question.options.find((option) => option !== question.correctAnswer);
}

test('a fresh quiz starts at the first question with a zero score', () => {
  const quiz = createQuiz(firstArtist());
  assert.equal(quiz.currentIndex, 0);
  assert.equal(quiz.score, 0);
  assert.equal(quiz.finished, false);
  assert.equal(currentQuestion(quiz), quiz.questions[0]);
});

test('answering every question correctly yields a perfect score', () => {
  const artist = firstArtist();
  let quiz = createQuiz(artist);

  while (!quiz.finished) {
    const question = currentQuestion(quiz);
    const result = submitAnswer(quiz, question.correctAnswer);
    assert.equal(result.accepted, true);
    assert.equal(result.isCorrect, true);
    quiz = result.quiz;
  }

  const summary = summarize(quiz);
  assert.equal(summary.score, artist.trivia.length);
  assert.equal(summary.total, artist.trivia.length);
  assert.equal(summary.perfect, true);
});

test('answering every question incorrectly yields a zero score', () => {
  const artist = firstArtist();
  let quiz = createQuiz(artist);

  while (!quiz.finished) {
    const question = currentQuestion(quiz);
    const result = submitAnswer(quiz, anIncorrectOption(question));
    assert.equal(result.isCorrect, false);
    quiz = result.quiz;
  }

  const summary = summarize(quiz);
  assert.equal(summary.score, 0);
  assert.equal(summary.perfect, false);
});

test('an option outside the question is not accepted and leaves state unchanged', () => {
  const quiz = createQuiz(firstArtist());
  const result = submitAnswer(quiz, 'this is not one of the options');
  assert.equal(result.accepted, false);
  assert.equal(result.quiz.currentIndex, 0);
  assert.equal(result.quiz.score, 0);
});

test('submitting after the quiz is finished throws', () => {
  const artist = firstArtist();
  let quiz = createQuiz(artist);
  while (!quiz.finished) {
    quiz = submitAnswer(quiz, currentQuestion(quiz).correctAnswer).quiz;
  }
  assert.equal(currentQuestion(quiz), null);
  assert.throws(() => submitAnswer(quiz, 'anything'), /already finished/);
});

test('createQuiz rejects an artist without trivia', () => {
  assert.throws(() => createQuiz({ id: 'x', name: 'X', trivia: [] }), /at least one trivia question/);
});
