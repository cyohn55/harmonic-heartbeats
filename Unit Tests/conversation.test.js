'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadArtists } = require('../Working/bot/core/artistRepository');
const { InMemorySessionStore } = require('../Working/bot/sessionStore');
const { handleMessage } = require('../Working/bot/core/conversation');

const DATASET_PATH = path.join(__dirname, '..', 'Working', 'data', 'artists.json');
const PLAYER_ID = '15551234567';

function newContext() {
  return {
    repository: loadArtists(DATASET_PATH),
    store: new InMemorySessionStore(),
    // Fixed clock and random source keep artist selection deterministic in tests.
    dateProvider: () => new Date('2026-08-09T12:00:00Z'),
    randomSource: () => 0,
  };
}

function send(deps, text) {
  return handleMessage({ userId: PLAYER_ID, text }, deps);
}

test('an unknown greeting returns the welcome message', () => {
  const deps = newContext();
  const { replies } = send(deps, 'hello');
  assert.equal(replies.length, 1);
  assert.match(replies[0], /Welcome to Harmonic Heartbeats/);
  assert.equal(deps.store.size(), 0, 'greeting should not start a quiz');
});

test('PLAY starts the daily quiz and stores an active session', () => {
  const deps = newContext();
  const { replies } = send(deps, 'PLAY');
  assert.match(replies[0], /Today's artist/);
  assert.match(replies[1], /Question 1 of/);
  assert.equal(deps.store.size(), 1, 'an active quiz should be stored');
});

test('a full correct playthrough reports a perfect score and song picks, then clears state', () => {
  const deps = newContext();
  send(deps, 'play');

  const artist = deps.store.get(PLAYER_ID).quiz.questions;
  const total = artist.length;

  let lastReplies = [];
  for (let questionNumber = 0; questionNumber < total; questionNumber += 1) {
    const quiz = deps.store.get(PLAYER_ID).quiz;
    const correct = quiz.questions[quiz.currentIndex].correctAnswer;
    lastReplies = send(deps, correct).replies;
  }

  const joined = lastReplies.join('\n');
  assert.match(joined, /Correct/);
  assert.match(joined, new RegExp(`scored \\*${total}/${total}\\*`));
  assert.match(joined, /perfect score/i);
  assert.match(joined, /picks:/);
  assert.match(joined, /youtube\.com/);
  assert.equal(deps.store.size(), 0, 'session should be cleared once the quiz ends');
});

test('a wrong answer reveals the correct answer and advances', () => {
  const deps = newContext();
  send(deps, 'play');
  const quiz = deps.store.get(PLAYER_ID).quiz;
  const question = quiz.questions[0];
  const wrong = question.options.find((option) => option !== question.correctAnswer);

  const { replies } = send(deps, wrong);
  assert.match(replies[0], /Not quite/);
  assert.match(replies[0], new RegExp(question.correctAnswer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('an unrecognized answer re-prompts without changing the score', () => {
  const deps = newContext();
  send(deps, 'play');
  const { replies } = send(deps, 'not a real option');
  assert.match(replies[0], /didn't catch that/);
  assert.equal(deps.store.get(PLAYER_ID).quiz.currentIndex, 0);
  assert.equal(deps.store.get(PLAYER_ID).quiz.score, 0);
});

test('an artist can be started by name', () => {
  const deps = newContext();
  const target = deps.repository.getAll()[5];
  const { replies } = send(deps, target.name);
  assert.match(replies[0], new RegExp(target.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(deps.store.get(PLAYER_ID).quiz.artistId, target.id);
});

test('STOP ends an active quiz and clears the session', () => {
  const deps = newContext();
  send(deps, 'play');
  assert.equal(deps.store.size(), 1);
  const { replies } = send(deps, 'stop');
  assert.match(replies[0], /Ended/);
  assert.equal(deps.store.size(), 0);
});
