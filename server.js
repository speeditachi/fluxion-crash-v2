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
        browser: ["Chrome (Linux)", "", ""]
    });

    activeSock = sock;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log('⚡ FLUXION BOT CONNECTED SUCCESSFULLY!');
        }
        if (connection === 'close') {
            isInitializing = false;
            activeSock = null;
        }
    });

    // Koute kòmand .menu pou voye odyo a sou WhatsApp
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

// Wout API pou bay kòd la ak bon jesyon tan ak koneksyon
app.post('/connect', async (req, res) => {
    let phoneNumber = req.body.phone || req.body.number;
    if (!phoneNumber) return res.status(400).json({ success: false, error: 'Nimewo a obligatwa!' });

    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

    try {
        // Toujou netwaye ansyen sesyon an pou nou pati sou a zewo pwòp
        if (fs.existsSync('./fluxion_auth')) {
            fs.rmSync('./fluxion_auth', { recursive: true, force: true });
        }
        
        activeSock = null;
        await startBot();

        // N ap tann jiskaske koneksyon an louvri nèt sou rezo a
        console.log("Ap tann koneksyon ouvri pou nimewo:", phoneNumber);
        
        let connected = false;
        for (let i = 0; i < 20; i++) {
            await delay(1000);
            if (activeSock && activeSock.ws && activeSock.ws.isOpen) {
                connected = true;
                break;
            }
        }

        if (!connected) {
            throw new Error("Koneksyon ak sèvè WhatsApp la pran twò lontan.");
        }

        // Lè koneksyon an louvri nèt, nou bay yon ti tan pou estrikti a estabilize
        await delay(2000); 
        let code = await activeSock.requestPairingCode(phoneNumber);
        
        if (!code) {
            throw new Error("WhatsApp pa t retounen oken kòd.");
        }

        return res.json({ success: true, code: code });

    } catch (error) {
        console.error("Erè nan pairing:", error);
        if (fs.existsSync('./fluxion_auth')) {
            fs.rmSync('./fluxion_auth', { recursive: true, force: true });
        }
        activeSock = null;
        return res.status(500).json({ success: false, error: error.message || 'Echèk nan jenerasyon kòd la.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sèvè a ap kouri sou port ${PORT}`);
});
