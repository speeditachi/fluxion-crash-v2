
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();

app.use(express.json({ limit: '20kb' }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*'
}));

const PORT = process.env.PORT || 3000;
const AUTH_DIR = path.join(__dirname, 'fluxion_auth');
const API_KEY = process.env.FLUXION_API_KEY;

let activeSock = null;
let isInitializing = false;
let reconnectTimer = null;
let startTime = Date.now();
let lastPairRequest = 0;
let authState = null;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function authorized(req) {
  if (!API_KEY) return false;

  const supplied = req.headers['x-api-key'];

  if (typeof supplied !== 'string') return false;

  const a = Buffer.from(supplied);
  const b = Buffer.from(API_KEY);

  return a.length === b.length &&
    crypto.timingSafeEqual(a, b);
}

async function startBot() {
  if (activeSock || isInitializing) return activeSock;

  isInitializing = true;

  try {
    if (!authState) {
      authState = await useMultiFileAuthState(AUTH_DIR);
    }

    const { state, saveCreds } = authState;
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['FLUXION', 'Chrome', '1.0.0'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000
    });

    activeSock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async update => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        console.log('⚡ FLUXION CONNECTED!');
      }

      if (connection === 'close') {
        if (activeSock === sock) activeSock = null;

        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        console.log('WhatsApp disconnected:', statusCode);

        if (statusCode !== DisconnectReason.loggedOut) {
          if (!reconnectTimer) {
            reconnectTimer = setTimeout(async () => {
              reconnectTimer = null;
              await startBot();
            }, 5000);
          }
        } else {
          console.log('Session logged out. New pairing required.');
          authState = null;
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const chat = msg.key.remoteJid;
        if (!chat) continue;

        const body =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          '';

        const command = body.trim().toLowerCase();

        const reply = async text => {
          await sock.sendMessage(chat, { text });
        };

        try {
          if (
            ['.menu', '.start', '.help', '.fluxioncomande']
              .includes(command)
          ) {
            await reply(
`╭━━━〔 ⚡ FLUXION CRASH V2 ⚡ 〕━━━╮
┃
┃ 〔 STATUS 〕
┃ • .start
┃ • .menu
┃ • .help
┃ • .ping
┃ • .alive
┃ • .uptime
┃
┃ 〔 OWNER 〕
┃ • .owner
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

POWER • SPEED • STYLE
POWERED BY SPEED ITACHI`
            );
          }

          else if (command === '.ping') {
            await reply('⚡ FLUXION PONG!');
          }

          else if (command === '.alive') {
            await reply('⚡ FLUXION CRASH V2 IS ONLINE!');
          }

          else if (command === '.uptime') {
            const seconds = Math.floor(
              (Date.now() - startTime) / 1000
            );

            await reply(`⚡ UPTIME: ${seconds} seconds`);
          }

          else if (command === '.owner') {
            await reply('👑 OWNER: SPEED ITACHI');
          }

        } catch (error) {
          console.error('Command error:', error.message);
        }
      }
    });

    return sock;

  } catch (error) {
    activeSock = null;
    console.error('Bot startup error:', error.message);
    throw error;

  } finally {
    isInitializing = false;
  }
}

// Pairing endpoint: yon sèl sesyon pou yon sèl kont
app.post('/connect', async (req, res) => {
  if (!authorized(req)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  let phone = req.body.phone || req.body.number;

  if (typeof phone !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Phone number required'
    });
  }

  phone = phone.replace(/\D/g, '');

  if (phone.length < 8 || phone.length > 15) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone number'
    });
  }

  if (Date.now() - lastPairRequest < 30000) {
    return res.status(429).json({
      success: false,
      error: 'Wait 30 seconds before another request'
    });
  }

  if (fs.existsSync(path.join(AUTH_DIR, 'creds.json'))) {
    try {
      const saved = JSON.parse(
        fs.readFileSync(
          path.join(AUTH_DIR, 'creds.json'),
          'utf8'
        )
      );

      if (saved.registered) {
        return res.status(409).json({
          success: false,
          error: 'WhatsApp session already registered'
        });
      }
    } catch (e) {
      console.log('Could not read saved credentials.');
    }
  }

  lastPairRequest = Date.now();

  try {
    const sock = await startBot();

    if (!sock) {
      throw new Error('WhatsApp socket unavailable');
    }

    await sleep(2000);

    if (activeSock !== sock) {
      throw new Error('Connection changed. Try again.');
    }

    const rawCode = await sock.requestPairingCode(phone);
    const code = rawCode.match(/.{1,4}/g)?.join('-') || rawCode;

    return res.json({
      success: true,
      code
    });

  } catch (error) {
    console.error('Pairing error:', error.message);

    return res.status(500).json({
      success: false,
      error: 'Pairing failed. Please try again.'
    });
  }
});

// System status
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    backend: 'ONLINE',
    whatsapp: activeSock ? 'INITIALIZED' : 'DISCONNECTED',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    bot: 'FLUXION CRASH V2'
  });
});

// Home
app.get('/', (req, res) => {
  res.send('⚡ FLUXION CRASH V2 Backend is ONLINE!');
});

// Start server
app.listen(PORT, async () => {
  console.log(`FLUXION server running on port ${PORT}`);

  try {
    await startBot();
  } catch (error) {
    console.error('Initial bot startup failed:', error.message);
  }
});
