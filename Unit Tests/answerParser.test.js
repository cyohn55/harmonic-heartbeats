'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadArtists } = require('../Working/bot/core/artistRepository');
const { parseOptionSelection } = require('../Working/bot/core/answerParser');

const DATASET_PATH = path.join(__dirname, '..', 'Working', 'data', 'artists.json');

function firstQuestion() {
  return loadArtists(DATASET_PATH).getAll()[0].trivia[0];
}

test('a valid 1-based number selects the matching option', () => {
  const question = firstQuestion();
  question.options.forEach((option, index) => {
    assert.equal(parseOptionSelection(question, String(index + 1)), option);
  });
});

test('the option text is matched case-insensitively', () => {
  const question = firstQuestion();
  const option = question.options[0];
  assert.equal(parseOptionSelection(question, option.toUpperCase()), option);
  assert.equal(parseOptionSelection(question, `  ${option.toLowerCase()}  `), option);
});

test('out-of-range numbers and unknown text return null', () => {
  const question = firstQuestion();
  assert.equal(parseOptionSelection(question, '0'), null);
  assert.equal(parseOptionSelection(question, String(question.options.length + 1)), null);
  assert.equal(parseOptionSelection(question, 'definitely not an option'), null);
  assert.equal(parseOptionSelection(question, ''), null);
});
