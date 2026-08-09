'use strict';

// Prints today's artist as GitHub Actions step outputs (name/genre/song), reusing
// the exact same dataset and deterministic daily-selection the website uses, so the
// email and the site always agree on the day's artist.

const path = require('node:path');

const repoRoot = path.join(__dirname, '..', '..');
const { loadArtists } = require(path.join(repoRoot, 'Working', 'bot', 'core', 'artistRepository'));
const { artistOfTheDay } = require(path.join(repoRoot, 'Working', 'bot', 'core', 'dailyArtist'));

const repository = loadArtists(path.join(repoRoot, 'Working', 'data', 'artists.json'));
const artist = artistOfTheDay(repository);
const featuredSong = artist.songs[0];

process.stdout.write(`name=${artist.name}\n`);
process.stdout.write(`genre=${artist.genre}\n`);
process.stdout.write(`song=${featuredSong.title}\n`);
