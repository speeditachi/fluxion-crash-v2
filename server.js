const { default: makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sèvi ak dosye estatik pou koòdone wèb la
app.use(express.static(path.join(__dirname, 'public')));

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

        // Tann yon ti moman pou koneksyon an enisyalize
        await delay(3000);

        if(!sock.authState.creds.registered) {
            let code = await sock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            
            return res.json({ 
                success: true, 
                code: code, 
                message: "Jumelage prêt" 
            });
        } else {
            return res.json({ 
                success: true, 
                message: "Deja konekte!" 
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Echèk nan voye kòd la.' });
    }
});

// Port sèvè a dwe pran nan anviwònman Render la
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sèvè a ap kouri sou port ${PORT}`);
});
