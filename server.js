const { default: makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Paj wèb la ak koòdone w la
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>FLUXIONS.ACCOUNT</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { background: #070207; color: #fff; font-family: sans-serif; text-align: center; padding: 20px; }
                .box { max-width: 400px; margin: auto; padding: 20px; border: 1px solid #e50914; border-radius: 12px; background: #0f050f; }
                input, button { width: 100%; padding: 12px; margin: 10px 0; font-size: 16px; border-radius: 8px; border: none; box-sizing: border-box; }
                input { background: #1a081a; color: #fff; border: 1px solid #e50914; }
                button { background: #e50914; color: white; cursor: pointer; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="box">
                <h2>CONNECT WHATSAPP</h2>
                <form action="/connect" method="POST">
                    <input type="text" name="phone" placeholder="+509XXXXXXXX" required>
                    <button type="submit">CONTINUE →</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

let activeSock = null;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    });

    activeSock = sock;
    sock.ev.on('creds.update', saveCreds);

    // Koute mesaj .menu pou voye odyo a
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const messageType = Object.keys(m.message)[0];
        let text = messageType === 'conversation' ? m.message.conversation : 
                   messageType === 'extendedTextMessage' ? m.message.extendedTextMessage.text : "";

        if (text && text.trim().toLowerCase() === '.menu') {
            const audioPath = path.join(__dirname, 'menu.mp3');
            if (fs.existsSync(audioPath)) {
                await sock.sendMessage(m.key.remoteJid, {
                    audio: { url: audioPath },
                    mimetype: 'audio/mp4',
                    ptt: false
                });
            }
        }
    });
}

// Wout k ap pran nimewo a vre epi jere kòd pèlen an
app.post('/connect', async (req, res) => {
    let phoneNumber = req.body.phone || req.body.number;
    if (!phoneNumber) return res.status(400).send('Nimewo a obligatwa!');

    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

    try {
        startBot();
        await delay(4000);

        if (activeSock && !activeSock.authState.creds.registered) {
            let code = await activeSock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            
            return res.send(`
                <body style="background:#070207;color:#fff;text-align:center;padding-top:50px;font-family:sans-serif;">
                    <div style="max-width:400px;margin:auto;padding:20px;border:1px solid #00ff00;border-radius:12px;background:#0f050f;">
                        <h2 style="color:#fff;">FLUXIONS - Jumelage Prêt</h2>
                        <h1 style="color:#00ff00;letter-spacing:3px;font-size:32px;">${code}</h1>
                        <p style="color:#aaa;font-size:14px;">Antre kòd sa a sou WhatsApp ou (Appareils liés → Lier avec le numéro de téléphone)</p>
                    </div>
                </body>
            `);
        } else {
            return res.send('<h3 style="color:#fff;text-align:center;padding-top:50px;">Bot la deja konekte oswa li ap chaje! Rafrechi paj la.</h3>');
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send('Echèk nan jenerasyon kòd la.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sèvè a ap kouri sou port ${PORT}`);
});
