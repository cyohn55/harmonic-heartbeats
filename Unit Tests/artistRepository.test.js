'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  loadArtists,
  createRepositoryFromData,
} = require('../Working/bot/core/artistRepository');

const DATASET_PATH = path.join(__dirname, '..', 'Working', 'data', 'artists.json');

test('loads the real curated dataset without validation errors', () => {
  const repo = loadArtists(DATASET_PATH);
  assert.ok(repo.count() > 0, 'expected at least one artist in the dataset');
});

test('every trivia question in the real dataset has a selectable correct answer', () => {
  const repo = loadArtists(DATASET_PATH);
  for (const artist of repo.getAll()) {
    for (const question of artist.trivia) {
      assert.ok(
        question.options.includes(question.correctAnswer),
        `"${artist.name}" has a correctAnswer outside its options`,
      );
    }
  }
});

test('artist ids are unique across the real dataset', () => {
  const repo = loadArtists(DATASET_PATH);
  const ids = repo.getAll().map((artist) => artist.id);
  assert.equal(new Set(ids).size, ids.length, 'artist ids must be unique');
});

test('getById round-trips an artist actually present in the dataset', () => {
  const repo = loadArtists(DATASET_PATH);
  const sample = repo.getAll()[0];
  assert.deepEqual(repo.getById(sample.id), sample);
  assert.equal(repo.getById('id-that-does-not-exist'), null);
});

test('search matches by name and genre using data drawn from the dataset', () => {
  const repo = loadArtists(DATASET_PATH);
  const sample = repo.getAll()[0];

  const byName = repo.search(sample.name);
  assert.ok(
    byName.some((artist) => artist.id === sample.id),
    'search by an artist name should return that artist',
  );

  const byGenre = repo.search(sample.genre);
  assert.ok(
    byGenre.some((artist) => artist.id === sample.id),
    'search by an artist genre should return that artist',
  );

  assert.equal(repo.search('   ').length, repo.count(), 'blank search returns all');
});

test('getRandom is deterministic when given a fixed random source', () => {
  const repo = loadArtists(DATASET_PATH);
  const firstArtist = repo.getAll()[0];
  const lastArtist = repo.getAll()[repo.count() - 1];

  assert.deepEqual(repo.getRandom(() => 0), firstArtist);
  assert.deepEqual(repo.getRandom(() => 0.999999), lastArtist);
});

test('rejects a dataset whose correctAnswer is not among the options', () => {
  const brokenData = {
    artists: [{
      id: 'broken',
      name: 'Broken Artist',
      genre: 'Test',
      songs: [{ title: 'A Song' }],
      trivia: [{
        question: 'Is this valid?',
        options: ['Yes', 'No'],
        correctAnswer: 'Maybe',
        explanation: 'The correct answer is missing from the options.',
      }],
    }],
  };
  assert.throws(() => createRepositoryFromData(brokenData), /not among its options/);
});

test('rejects a dataset with duplicate artist ids', () => {
  const duplicateData = {
    artists: [
      { id: 'dup', name: 'One', genre: 'G', songs: [{ title: 'S' }], trivia: [{ question: 'q', options: ['a', 'b'], correctAnswer: 'a', explanation: 'e' }] },
      { id: 'dup', name: 'Two', genre: 'G', songs: [{ title: 'S' }], trivia: [{ question: 'q', options: ['a', 'b'], correctAnswer: 'a', explanation: 'e' }] },
    ],
  };
  assert.throws(() => createRepositoryFromData(duplicateData), /Duplicate artist id/);
});
