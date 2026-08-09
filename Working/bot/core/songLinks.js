'use strict';

/**
 * Builds real, always-valid "listen" links for a song by delegating to each
 * streaming service's public search endpoint. Using search URLs (rather than
 * hardcoded track IDs) keeps links working even as catalogs change, and scales
 * to any artist/song without per-track curation.
 */

function buildSearchQuery(artistName, songTitle) {
  return `${artistName} ${songTitle}`.trim().replace(/\s+/g, ' ');
}

function buildListenLinks(artistName, songTitle) {
  if (!artistName || !songTitle) {
    throw new Error('buildListenLinks requires both an artistName and a songTitle.');
  }
  const encodedQuery = encodeURIComponent(buildSearchQuery(artistName, songTitle));
  return {
    youtube: `https://www.youtube.com/results?search_query=${encodedQuery}`,
    appleMusic: `https://music.apple.com/us/search?term=${encodedQuery}`,
    spotify: `https://open.spotify.com/search/${encodedQuery}`,
  };
}

module.exports = { buildListenLinks, buildSearchQuery };
