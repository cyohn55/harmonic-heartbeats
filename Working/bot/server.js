'use strict';

/**
 * Thin HTTP layer that connects the Meta WhatsApp webhook to the channel-
 * agnostic conversation controller. It performs only wiring and I/O: verify the
 * webhook, authenticate the payload, hand each message to the controller, and
 * deliver the controller's replies. All game logic lives in ./core.
 *
 * Built on Node's standard library (http, crypto) plus the global fetch, so the
 * service has zero runtime dependencies to install.
 */

const http = require('node:http');
const path = require('node:path');

const { loadConfig, isRecipientAllowed } = require('./config');
const { loadArtists } = require('./core/artistRepository');
const { InMemorySessionStore } = require('./sessionStore');
const { handleMessage } = require('./core/conversation');
const {
  createMetaWhatsAppAdapter,
  parseInboundMessages,
  verifyWebhookSubscription,
  verifySignature,
} = require('./channels/whatsappMetaAdapter');

const DATASET_PATH = path.join(__dirname, '..', 'data', 'artists.json');

function collectRequestBody(request) {
  return new Promise((resolve, reject) => {
    let data = '';
    request.on('data', (chunk) => { data += chunk; });
    request.on('end', () => resolve(data));
    request.on('error', reject);
  });
}

function createServer(overrides = {}) {
  const config = overrides.config || loadConfig();
  const repository = overrides.repository || loadArtists(DATASET_PATH);
  const store = overrides.store || new InMemorySessionStore();
  const adapter = overrides.adapter || createMetaWhatsAppAdapter({
    token: config.token,
    phoneNumberId: config.phoneNumberId,
    graphApiVersion: config.graphApiVersion,
  });

  async function processInbound(rawBody) {
    let body;
    try {
      body = JSON.parse(rawBody || '{}');
    } catch (error) {
      return;
    }
    for (const message of parseInboundMessages(body)) {
      if (!message.text || !isRecipientAllowed(config, message.userId)) {
        continue;
      }
      const { replies } = handleMessage({ userId: message.userId, text: message.text }, { repository, store });
      for (const reply of replies) {
        try {
          await adapter.sendText(message.userId, reply);
        } catch (error) {
          console.error('Failed to send WhatsApp reply:', error.message);
        }
      }
    }
  }

  return http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === 'GET' && url.pathname === '/') {
      response.writeHead(200, { 'Content-Type': 'text/plain' });
      response.end('Harmonic Heartbeats WhatsApp bot is running.');
      return;
    }

    if (request.method === 'GET' && url.pathname === '/webhook') {
      const query = Object.fromEntries(url.searchParams.entries());
      const challenge = verifyWebhookSubscription(query, config.verifyToken);
      if (challenge !== null) {
        response.writeHead(200, { 'Content-Type': 'text/plain' });
        response.end(challenge);
      } else {
        response.writeHead(403);
        response.end('Verification failed');
      }
      return;
    }

    if (request.method === 'POST' && url.pathname === '/webhook') {
      const rawBody = await collectRequestBody(request);
      if (!verifySignature(rawBody, request.headers['x-hub-signature-256'], config.appSecret)) {
        response.writeHead(401);
        response.end('Invalid signature');
        return;
      }
      // Acknowledge immediately so Meta does not retry, then process and reply.
      response.writeHead(200);
      response.end('OK');
      processInbound(rawBody).catch((error) => console.error('Inbound processing error:', error));
      return;
    }

    response.writeHead(404);
    response.end('Not found');
  });
}

if (require.main === module) {
  const server = createServer();
  const port = Number.parseInt(process.env.PORT || '3000', 10);
  server.listen(port, () => console.log(`Harmonic Heartbeats bot listening on port ${port}`));
}

module.exports = { createServer };
