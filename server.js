const { default: makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

let activeSock = null;
let startTime = Date.now();
let isInitializing = false;

async function startBot() {
    if (isInitializing && activeSock) return activeSock;
    isInitializing = true;

    const { state, saveCreds } = await useMultiFileAuthState('./fluxion_auth');
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ["Chrome (Linux)", "Chrome", "115.0.0.0"] // Pwoteje kont bloke sou WhatsApp
    });

    activeSock = sock;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log('⚡ FLUXION BOT CONNECTED SUCCESSFULLY!');
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const chat = msg.key.remoteJid;
        if (!chat) return;

        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const command = body.trim().toLowerCase();
        const reply = (text) => sock.sendMessage(chat, { text });

        if (command === ".fluxioncomande" || command === ".menu" || command === ".start" || command === ".help") {
            const audioPath = path.join(__dirname, 'menu.mp3');
            if (fs.existsSync(audioPath)) {
                await sock.sendMessage(chat, {
                    audio: { url: audioPath },
                    mimetype: 'audio/mp4',
                    ptt: false
                });
            }
            return reply(`╭━━━〔 ⚡ FLUXION CRASH V2 ⚡ 〕━━━╮
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
┃ • .self
┃ • .public
┃
┃ 〔 MENUS 〕
┃ • .bug-menu
┃ • .groupmenu
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━╯
 
POWER • SPEED • STYLE`);
        }

        if (command === ".ping") return reply("⚡ FLUXION PONG!");
        if (command === ".alive") return reply("⚡ FLUXION CRASH V2 IS ONLINE!");
        if (command === ".uptime") {
            const seconds = Math.floor((Date.now() - startTime) / 1000);
            return reply(`⚡ UPTIME: ${seconds} seconds`);
        }
        if (command === ".owner") return reply("👑 OWNER: SPEED ITACHI");
    });

    isInitializing = false;
    return sock;
}

// Wout API pou jere koneksyon an san erè
app.post('/connect', async (req, res) => {
    let phoneNumber = req.body.phone || req.body.number;
    if (!phoneNumber) return res.status(400).json({ success: false, error: 'Nimewo a obligatwa!' });

    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

    try {
        if (activeSock) {
            try {
                activeSock.end(undefined);
            } catch (e) {}
            activeSock = null;
        }

        if (fs.existsSync('./fluxion_auth')) {
            fs.rmSync('./fluxion_auth', { recursive: true, force: true });
        }

        await startBot();

        let retries = 15;
        while (retries > 0) {
            await delay(2000);
            if (activeSock && activeSock.ws && activeSock.ws.isOpen) break;
            retries--;
        }

        if (!activeSock) {
            return res.status(500).json({ success: false, error: 'Echèk nan koneksyon ak sèvè WhatsApp la.' });
        }

        let rawCode = await activeSock.requestPairingCode(phoneNumber);
        let code = rawCode?.match(/.{1,4}/g)?.join("-") || rawCode;

        return res.json({ success: true, code: code });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: 'Echèk nan jenerasyon kòd la.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen
