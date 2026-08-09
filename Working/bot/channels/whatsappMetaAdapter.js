'use strict';

/**
 * Adapter for the Meta WhatsApp Cloud API. It isolates every WhatsApp-specific
 * concern — sending messages, parsing inbound webhooks, verifying the webhook
 * subscription and payload signature — behind a small surface so the rest of the
 * bot stays provider-agnostic. The pure helpers (parse/verify) take plain data
 * and perform no network I/O, which keeps them fully unit-testable.
 */

const crypto = require('node:crypto');

function createMetaWhatsAppAdapter(options) {
  const { token, phoneNumberId, graphApiVersion = 'v21.0', fetchImpl = fetch } = options;
  if (!token || !phoneNumberId) {
    throw new Error('Meta WhatsApp adapter requires both a token and a phoneNumberId.');
  }
  const endpoint = `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`;

  async function sendText(recipientId, body) {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipientId,
        type: 'text',
        text: { preview_url: true, body },
      }),
    });

    if (!response.ok) {
      const detail = await readBodySafely(response);
      throw new Error(`WhatsApp send failed (${response.status}): ${detail}`);
    }
    return response.json();
  }

  return { sendText, endpoint };
}

async function readBodySafely(response) {
  try {
    return await response.text();
  } catch (error) {
    return '<unreadable response body>';
  }
}

/**
 * Flattens a Cloud API webhook payload into a simple list of inbound messages.
 * Non-message events (delivery statuses, etc.) are ignored.
 */
function parseInboundMessages(webhookBody) {
  const messages = [];
  const entries = (webhookBody && webhookBody.entry) || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const message of value.messages || []) {
        messages.push({
          userId: message.from,
          text: (message.text && message.text.body) || '',
          type: message.type,
          messageId: message.id,
        });
      }
    }
  }
  return messages;
}

/**
 * Answers Meta's webhook verification handshake, returning the challenge string
 * to echo back when the verify token matches, or null when it does not.
 */
function verifyWebhookSubscription(query, expectedVerifyToken) {
  if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === expectedVerifyToken) {
    return query['hub.challenge'];
  }
  return null;
}

/**
 * Verifies the X-Hub-Signature-256 header against the raw request body using a
 * constant-time comparison. When no app secret is configured, verification is
 * skipped (returns true) so the bot can run in simple setups.
 */
function verifySignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret) {
    return true;
  }
  if (!signatureHeader) {
    return false;
  }
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const provided = Buffer.from(signatureHeader);
  const computed = Buffer.from(expected);
  return provided.length === computed.length && crypto.timingSafeEqual(provided, computed);
}

module.exports = {
  createMetaWhatsAppAdapter,
  parseInboundMessages,
  verifyWebhookSubscription,
  verifySignature,
};
