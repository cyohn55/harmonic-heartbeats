'use strict';

/**
 * Loads and queries the curated artist dataset.
 *
 * The repository validates data integrity at load time so that a malformed
 * dataset fails fast during startup or testing rather than surfacing a broken
 * quiz to a live user. Query methods are pure reads over the loaded data.
 */

const fs = require('fs');

const REQUIRED_ARTIST_FIELDS = ['id', 'name', 'genre', 'songs', 'trivia'];

function validateTriviaQuestion(question, artistName, index) {
  const label = `Artist "${artistName}" trivia[${index}]`;
  if (typeof question.question !== 'string' || question.question.length === 0) {
    throw new Error(`${label} is missing a question string.`);
  }
  if (!Array.isArray(question.options) || question.options.length < 2) {
    throw new Error(`${label} must provide at least two options.`);
  }
  // The single most important invariant: the correct answer must be selectable.
  if (!question.options.includes(question.correctAnswer)) {
    throw new Error(`${label} correctAnswer "${question.correctAnswer}" is not among its options.`);
  }
  if (typeof question.explanation !== 'string' || question.explanation.length === 0) {
    throw new Error(`${label} is missing an explanation.`);
  }
}

function validateSong(song, artistName, index) {
  const label = `Artist "${artistName}" songs[${index}]`;
  if (typeof song.title !== 'string' || song.title.length === 0) {
    throw new Error(`${label} is missing a title.`);
  }
}

function validateArtist(artist, seenIds) {
  for (const field of REQUIRED_ARTIST_FIELDS) {
    if (!(field in artist)) {
      throw new Error(`An artist entry is missing the required field "${field}".`);
    }
  }
  if (seenIds.has(artist.id)) {
    throw new Error(`Duplicate artist id "${artist.id}".`);
  }
  seenIds.add(artist.id);

  if (!Array.isArray(artist.trivia) || artist.trivia.length === 0) {
    throw new Error(`Artist "${artist.name}" must have at least one trivia question.`);
  }
  artist.trivia.forEach((question, i) => validateTriviaQuestion(question, artist.name, i));

  if (!Array.isArray(artist.songs) || artist.songs.length === 0) {
    throw new Error(`Artist "${artist.name}" must have at least one song.`);
  }
  artist.songs.forEach((song, i) => validateSong(song, artist.name, i));
}

class ArtistRepository {
  constructor(artists) {
    this._artists = artists;
    this._byId = new Map(artists.map((artist) => [artist.id, artist]));
  }

  getAll() {
    return this._artists.slice();
  }

  count() {
    return this._artists.length;
  }

  getById(id) {
    return this._byId.get(id) || null;
  }

  getByName(name) {
    const target = name.trim().toLowerCase();
    return this._artists.find((artist) => artist.name.toLowerCase() === target) || null;
  }

  search(query) {
    const normalized = query.trim().toLowerCase();
    if (normalized.length === 0) {
      return this.getAll();
    }
    return this._artists.filter((artist) =>
      artist.name.toLowerCase().includes(normalized) ||
      artist.genre.toLowerCase().includes(normalized));
  }

  /**
   * Returns a pseudo-random artist. Accepts an injectable random source so the
   * selection is deterministic and testable.
   */
  getRandom(randomSource = Math.random) {
    const index = Math.floor(randomSource() * this._artists.length);
    return this._artists[index];
  }
}

function createRepositoryFromData(data) {
  if (!data || !Array.isArray(data.artists)) {
    throw new Error('Artist dataset must contain an "artists" array.');
  }
  const seenIds = new Set();
  data.artists.forEach((artist) => validateArtist(artist, seenIds));
  return new ArtistRepository(data.artists);
}

function loadArtists(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return createRepositoryFromData(JSON.parse(raw));
}

module.exports = { loadArtists, createRepositoryFromData, ArtistRepository };
