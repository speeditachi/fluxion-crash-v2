const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Route de baz pou tcheke si sèvè a ap mache
app.get('/', (req, res) => {
    res.send("FLUXION BUG BOT Backend is running!");
});

// Route pou jenere Pairing Code la
app.post('/pair', async (req, res) => {
    let { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ success: false, error: "Nimewo telefòn lan obligatwa" });
    }

    // Netwaye nimewo a
    phone = phone.replace(/[^0-9]/g, '');

    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: Browsers.ubuntu('Chrome'), // Sa anpeche WhatsApp bloke Render
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0
        });

        sock.ev.on('creds.update', saveCreds);

        // Bay Baileys yon ti tan pou l limen kòrèkteman anvan l mande kòd la
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phone);
                // Mete yon tirè nan mitan l pou l ka pi fasil pou lekti (pa egzanp: SC9N-P1NH)
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                
                return res.json({ success: true, code });
            } catch (err) {
                console.error("Erè nan requestPairingCode:", err);
                return res.status(500).json({ success: false, error: "Echèk nan jenerasyon kòd la sou WhatsApp" });
            }
        }, 3000);

    } catch (error) {
        console.error("Erè sèvè:", error);
        res.status(500).json({ success: false, error: "Erè entèn nan sèvè a" });
    }
});

app.listen(PORT, () => {
    console.log(`Sèvè FLUXION ap kouri sou pò ${PORT}`);
});
