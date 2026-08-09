'use strict';

/**
 * Selects a deterministic "artist of the day" so every player who texts on the
 * same calendar day gets the same artist, and the choice rotates daily. The
 * date is injectable to keep selection testable.
 */

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

// UTC date key (YYYY-MM-DD) so the rotation is stable regardless of server timezone.
function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function artistOfTheDay(repository, date = new Date()) {
  const artists = repository.getAll();
  if (artists.length === 0) {
    throw new Error('Cannot pick an artist of the day from an empty repository.');
  }
  const index = hashString(toDateKey(date)) % artists.length;
  return artists[index];
}

module.exports = { artistOfTheDay, toDateKey, hashString };
