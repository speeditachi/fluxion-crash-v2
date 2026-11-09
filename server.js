const { default: makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Si yon moun ale sou paj dakèy la, voye l dirèkteman sou /connect
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Fluxion Connect</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { background: #0f050f; color: #fff; font-family: sans-serif; text-align: center; padding-top: 50px; }
                input, button { padding: 12px; margin: 10px; font-size: 16px; border-radius: 8px; border: none; }
                button { background: #e50914; color: white; cursor: pointer; }
                .box { max-width: 400px; margin: auto; padding: 20px; border: 1px solid #e50914; border-radius: 12px; }
            </style>
        </head>
        <body>
            <div class="box">
                <h2>CONNECT WHATSAPP</h2>
                <form action="/connect" method="POST">
                    <input type="text" name="phone" placeholder="+509XXXXXXXX" required><br>
                    <button type="submit">CONTINUE</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

// Wout pou jere koneksyon WhatsApp ak kòd pèlen an
app.post('/connect', async (req, res) => {
    const phoneNumber = req.body.phone || req.body.number;
    if (!phoneNumber) {
        return res.status(400).json({ error: 'Nimewo a obligatwa!' });
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState('./session');
        const sock = makeWASocket({
            auth: state,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false
        });

        sock.ev.on('creds.update', saveCreds);

        await delay(3000);

        if(!sock.authState.creds.registered) {
            let code = await sock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            
            return res.send(`
                <body style="background:#0f050f;color:#fff;text-align:center;padding-top:50px;font-family:sans-serif;">
                    <h2>Jumelage prêt</h2>
                    <h1 style="color:#00ff00;letter-spacing:3px;">${code}</h1>
                    <p>Antre kòd sa a sou WhatsApp ou (Appareils liés -> Lier avec le numéro de téléphone)</p>
                </body>
            `);
        } else {
            return res.send('<h3>Deja konekte!</h3>');
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send('Echèk nan voye kòd la.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sèvè a ap kouri sou port ${PORT}`);
});
