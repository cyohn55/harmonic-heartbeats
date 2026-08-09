'use strict';

/**
 * Keeps each player's in-progress quiz between messages, keyed by their WhatsApp
 * id. This in-memory implementation is sufficient for a personal bot with a
 * handful of players: a quiz is short-lived and simply restarts if the process
 * is redeployed. To share state across multiple instances later, swap this for
 * an implementation backed by a KV store that honors the same interface.
 */

class InMemorySessionStore {
  constructor() {
    this._sessions = new Map();
  }

  get(userId) {
    return this._sessions.get(userId) || null;
  }

  set(userId, session) {
    this._sessions.set(userId, session);
  }

  delete(userId) {
    this._sessions.delete(userId);
  }

  size() {
    return this._sessions.size;
  }
}

module.exports = { InMemorySessionStore };
