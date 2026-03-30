require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');

const { UiLogger } = require('./logger');
const { HehoClient } = require('./hehoClient');
const { InstagramBridge } = require('./instagramBridge');

const app = express();
const port = process.env.PORT || 3000;

const logger = new UiLogger();
const hehoClient = new HehoClient({
  apiKey: process.env.HEHO_API_KEY,
  chatbotId: process.env.HEHO_CHATBOT_ID,
});
const bridge = new InstagramBridge({ logger, hehoClient });

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'heho-ig-dev-secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/status', (_req, res) => {
  res.json({
    ok: true,
    ...bridge.status(),
    hasHehoConfig: Boolean(process.env.HEHO_API_KEY && process.env.HEHO_CHATBOT_ID),
  });
});

app.get('/api/logs', (_req, res) => {
  res.json({ ok: true, logs: logger.list() });
});

app.post('/api/connect', async (req, res) => {
  const { username, identifier, password, proxyUrl } = req.body || {};
  const loginId = (identifier || username || '').trim();
  const chosenProxy = (proxyUrl || process.env.IG_PROXY_URL || '').trim();

  if (!loginId || !password) {
    return res.status(400).json({ ok: false, error: 'identifier and password are required.' });
  }

  try {
    const result = await bridge.connect({ username: loginId, password, proxyUrl: chosenProxy });
    return res.json({ ok: true, ...result });
  } catch (error) {
    logger.error('Instagram connect failed.', { error: error.message });
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/disconnect', (req, res) => {
  void req;
  const result = bridge.disconnect();
  res.json({ ok: true, ...result });
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body || {};
  if (!message) {
    return res.status(400).json({ ok: false, error: 'message is required.' });
  }

  try {
    const reply = await bridge.chatWithHeho(message);
    return res.json({ ok: true, reply });
  } catch (error) {
    logger.error('UI chat with Heho failed.', { error: error.message });
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(port, () => {
  logger.info('Server started.', { port });
  // eslint-disable-next-line no-console
  console.log(`Heho-IG bridge listening on port ${port}`);
});
