'use strict';

/**
 * Reads bot configuration from environment variables. Secrets (access token,
 * app secret) are never hardcoded — they are supplied by the hosting platform's
 * secret manager. `loadConfig` accepts an env object so it can be tested without
 * mutating the real process environment.
 */

const REQUIRED_KEYS = ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN'];

function loadConfig(env = process.env) {
  const missing = REQUIRED_KEYS.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const allowedRecipients = (env.ALLOWED_RECIPIENTS || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return {
    token: env.WHATSAPP_TOKEN,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    verifyToken: env.WHATSAPP_VERIFY_TOKEN,
    appSecret: env.WHATSAPP_APP_SECRET || null,
    allowedRecipients, // an empty list means "allow everyone"
    graphApiVersion: env.WHATSAPP_GRAPH_VERSION || 'v21.0',
    port: Number.parseInt(env.PORT || '3000', 10),
  };
}

function isRecipientAllowed(config, userId) {
  return config.allowedRecipients.length === 0 || config.allowedRecipients.includes(userId);
}

module.exports = { loadConfig, isRecipientAllowed };
