const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
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
    const { version } = await fetchLatestBaileysVersion(); // San sa a, WhatsApp ka rejte lyezon an paske vèsyon an demode

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ["Chrome (Linux)", "Chrome", "115.0.0.0"] // Enpòtan pou WhatsApp pa rejte koneksyon an
    });

    activeSock = sock;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('⚡ FLUXION BOT CONNECTED SUCCESSFULLY!');
        } else if (connection === 'close') {
            console.log('❌ Koneksyon an fèmen, n ap re-inisyalize...');
            isInitializing = false;
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

// Ti fonksyon ki mete yon limit tan sou nenpòt pwomès (anpeche sèvè a rete bloke pou tout tan)
function withTimeout(promise, ms, timeoutMsg) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMsg)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Wout API pou jere koneksyon an byen vit, san rete bloke
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

        // ANSYEN KÒD LA te tann jiska 50 segonn (25 x 2s) anvan l mande kòd la.
        // Sa se rezon prensipal ki fè kòd la ekspire anvan moun nan gen tan antre l.
        // Baileys ka mande kòd pè a touswit apre socket la kreye — pa bezwen tann "ws.isOpen".
        // Nou kite yon ti tan kout (3s) sèlman pou soket la fin enstalye, epi nou mete yon
        // limit tan global (20s) pou demann lan pa janm rete "LOADING..." pou tout tan.
        await delay(3000);

        if (!activeSock) {
            return res.status(500).json({ success: false, error: 'Echèk nan koneksyon ak sèvè WhatsApp la.' });
        }

        let rawCode = await withTimeout(
            activeSock.requestPairingCode(phoneNumber),
            20000,
            'Sèvè WhatsApp la pran twòp tan pou reponn. Eseye ankò.'
        );
        let code = rawCode?.match(/.{1,4}/g)?.join("-") || rawCode;

        return res.json({ success: true, code: code });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: error.message || 'Echèk nan jenerasyon kòd la.' });
    }
});

app.get('/', (req, res) => {
    res.send("FLUXION BUG BOT Backend is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sèvè a ap kouri sou port ${PORT}`);
});
