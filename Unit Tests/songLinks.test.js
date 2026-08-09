'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadArtists } = require('../Working/bot/core/artistRepository');
const { buildListenLinks, buildSearchQuery } = require('../Working/bot/core/songLinks');

const DATASET_PATH = path.join(__dirname, '..', 'Working', 'data', 'artists.json');

function firstSongOfFirstArtist() {
  const artist = loadArtists(DATASET_PATH).getAll()[0];
  return { artistName: artist.name, songTitle: artist.songs[0].title };
}

test('builds valid, correctly-encoded links for a real song in the dataset', () => {
  const { artistName, songTitle } = firstSongOfFirstArtist();
  const links = buildListenLinks(artistName, songTitle);

  for (const url of Object.values(links)) {
    assert.ok(url.startsWith('https://'), `expected an https URL, got ${url}`);
    // The URL must be parseable and its query must decode back to the search terms.
    const parsed = new URL(url);
    assert.ok(parsed.href.includes(encodeURIComponent(buildSearchQuery(artistName, songTitle))));
  }
});

test('encodes special characters so links stay valid', () => {
  const links = buildListenLinks('AC/DC', 'Rock & Roll Ain\'t Noise Pollution');
  for (const url of Object.values(links)) {
    assert.doesNotThrow(() => new URL(url));
    assert.ok(!url.includes(' '), 'spaces must be percent-encoded');
  }
});

test('collapses redundant whitespace in the search query', () => {
  assert.equal(buildSearchQuery('  Queen   ', '  Bohemian   Rhapsody '), 'Queen Bohemian Rhapsody');
});

test('requires both an artist and a song title', () => {
  assert.throws(() => buildListenLinks('', 'Song'), /requires both/);
  assert.throws(() => buildListenLinks('Artist', ''), /requires both/);
});
