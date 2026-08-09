'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const {
  createMetaWhatsAppAdapter,
  parseInboundMessages,
  verifyWebhookSubscription,
  verifySignature,
} = require('../Working/bot/channels/whatsappMetaAdapter');

test('sendText posts a correctly-shaped request and returns the parsed body', async () => {
  const captured = {};
  const fakeFetch = async (url, init) => {
    captured.url = url;
    captured.init = init;
    return { ok: true, json: async () => ({ messages: [{ id: 'wamid.test' }] }) };
  };

  const adapter = createMetaWhatsAppAdapter({
    token: 'TEST_TOKEN',
    phoneNumberId: '123456',
    graphApiVersion: 'v21.0',
    fetchImpl: fakeFetch,
  });

  const result = await adapter.sendText('15550000000', 'Hello there');

  assert.equal(captured.url, 'https://graph.facebook.com/v21.0/123456/messages');
  assert.equal(captured.init.method, 'POST');
  assert.equal(captured.init.headers.Authorization, 'Bearer TEST_TOKEN');

  const payload = JSON.parse(captured.init.body);
  assert.equal(payload.messaging_product, 'whatsapp');
  assert.equal(payload.to, '15550000000');
  assert.equal(payload.text.body, 'Hello there');
  assert.deepEqual(result.messages[0].id, 'wamid.test');
});

test('sendText throws with detail when the API responds with an error', async () => {
  const fakeFetch = async () => ({ ok: false, status: 400, text: async () => 'Bad Request' });
  const adapter = createMetaWhatsAppAdapter({ token: 't', phoneNumberId: 'p', fetchImpl: fakeFetch });
  await assert.rejects(() => adapter.sendText('1', 'hi'), /send failed \(400\): Bad Request/);
});

test('parseInboundMessages extracts text messages and ignores status events', () => {
  const webhookBody = {
    entry: [{
      changes: [{
        value: {
          messages: [{ from: '15551112222', id: 'wamid.1', type: 'text', text: { body: 'play' } }],
        },
      }, {
        value: { statuses: [{ id: 'wamid.1', status: 'delivered' }] },
      }],
    }],
  };
  const messages = parseInboundMessages(webhookBody);
  assert.equal(messages.length, 1);
  assert.deepEqual(messages[0], { userId: '15551112222', text: 'play', type: 'text', messageId: 'wamid.1' });
});

test('parseInboundMessages tolerates an empty or malformed payload', () => {
  assert.deepEqual(parseInboundMessages({}), []);
  assert.deepEqual(parseInboundMessages({ entry: [{}] }), []);
});

test('webhook subscription verification echoes the challenge only on a token match', () => {
  const query = { 'hub.mode': 'subscribe', 'hub.verify_token': 'secret', 'hub.challenge': 'CHALLENGE_123' };
  assert.equal(verifyWebhookSubscription(query, 'secret'), 'CHALLENGE_123');
  assert.equal(verifyWebhookSubscription(query, 'wrong'), null);
  assert.equal(verifyWebhookSubscription({ 'hub.mode': 'unsubscribe' }, 'secret'), null);
});

test('signature verification accepts a genuine signature and rejects a forged one', () => {
  const appSecret = 'app-secret-value';
  const rawBody = JSON.stringify({ hello: 'world' });
  const goodSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

  assert.equal(verifySignature(rawBody, goodSignature, appSecret), true);
  assert.equal(verifySignature(rawBody, 'sha256=deadbeef', appSecret), false);
  assert.equal(verifySignature(rawBody, undefined, appSecret), false);
  // When no secret is configured, verification is intentionally skipped.
  assert.equal(verifySignature(rawBody, undefined, null), true);
});
