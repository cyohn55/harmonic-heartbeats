'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadArtists } = require('../Working/bot/core/artistRepository');
const { artistOfTheDay, toDateKey } = require('../Working/bot/core/dailyArtist');

const DATASET_PATH = path.join(__dirname, '..', 'Working', 'data', 'artists.json');

test('the same calendar day always yields the same artist', () => {
  const repo = loadArtists(DATASET_PATH);
  const morning = new Date('2026-08-09T08:00:00Z');
  const evening = new Date('2026-08-09T22:30:00Z');
  assert.deepEqual(artistOfTheDay(repo, morning), artistOfTheDay(repo, evening));
});

test('the selected artist is always a real member of the dataset', () => {
  const repo = loadArtists(DATASET_PATH);
  const ids = new Set(repo.getAll().map((artist) => artist.id));
  for (let dayOffset = 0; dayOffset < 60; dayOffset += 1) {
    const date = new Date(Date.UTC(2026, 0, 1 + dayOffset));
    assert.ok(ids.has(artistOfTheDay(repo, date).id));
  }
});

test('the rotation actually changes across the dataset over time', () => {
  const repo = loadArtists(DATASET_PATH);
  const seen = new Set();
  for (let dayOffset = 0; dayOffset < 60; dayOffset += 1) {
    const date = new Date(Date.UTC(2026, 0, 1 + dayOffset));
    seen.add(artistOfTheDay(repo, date).id);
  }
  assert.ok(seen.size > 1, 'expected more than one distinct artist across 60 days');
});

test('toDateKey renders a stable UTC YYYY-MM-DD key', () => {
  assert.equal(toDateKey(new Date('2026-08-09T23:59:59Z')), '2026-08-09');
});
