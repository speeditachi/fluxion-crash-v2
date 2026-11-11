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
        printQRInTerminal: false
    });

    activeSock = sock;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log('⚡ FLUXION BOT CONNECTED SUCCESSFULLY!');
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

// Wout API pou bay kòd la san erè
app.post('/connect', async (req, res) => {
    let phoneNumber = req.body.phone || req.body.number;
    if (!phoneNumber) return res.status(400).json({ success: false, error: 'Nimewo a obligatwa!' });

    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

    try {
        if (!activeSock || !activeSock.authState.creds.registered) {
            // Efase ansyen dosye sesyon an si l te bloke sou yon vye koneksyon ki kase
            if (fs.existsSync('./fluxion_auth')) {
                fs.rmSync('./fluxion_auth', { recursive: true, force: true });
            }
            
            await startBot();
            // Bay socket la tan pou l konekte ak rezo WhatsApp la
            let retries = 10;
            while (retries > 0) {
                await delay(2000);
                if (activeSock && activeSock.ws && activeSock.ws.isOpen) break;
                retries--;
            }
        }

        if (activeSock && !activeSock.authState.creds.registered) {
            let code = await activeSock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            
            return res.json({ success: true, code: code });
        } else {
            return res.json({ success: false, error: 'Bot la deja konekte sou yon lòt sesyon!' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: 'Echèk nan jenerasyon kòd la.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sèvè a ap kouri sou port ${PORT}`);
});
