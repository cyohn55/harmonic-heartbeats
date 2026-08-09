'use strict';

// Prints today's artist as GitHub Actions step outputs (name/genre/song), reusing
// the exact same dataset and deterministic daily-selection the website uses, so the
// email and the site always agree on the day's artist.
//
// Specific dates can pin a specific artist via data/dailyArtistOverrides.json (the
// same override list the website reads); on those dates the pinned artist wins over
// the normal daily rotation.

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..', '..');
const { loadArtists } = require(path.join(repoRoot, 'Working', 'bot', 'core', 'artistRepository'));
const { artistOfTheDay, toDateKey } = require(path.join(repoRoot, 'Working', 'bot', 'core', 'dailyArtist'));

const repository = loadArtists(path.join(repoRoot, 'Working', 'data', 'artists.json'));

// A pinned artist for today (if any) takes precedence over the daily rotation.
const loadOverrides = () => {
  try {
    return JSON.parse(fs.readFileSync(path.join(repoRoot, 'data', 'dailyArtistOverrides.json'), 'utf8'));
  } catch (error) {
    return {};
  }
};

const overrides = loadOverrides();
const pinnedId = overrides[toDateKey(new Date())];
const artist = (pinnedId && repository.getById(pinnedId)) || artistOfTheDay(repository);
const featuredSong = artist.songs[0];

process.stdout.write(`name=${artist.name}\n`);
process.stdout.write(`genre=${artist.genre}\n`);
process.stdout.write(`song=${featuredSong.title}\n`);
