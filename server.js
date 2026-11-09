const express = require("express");
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeInMemoryStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Route pou Pairing Code Baileys la
app.get("/code", async (req, res) => {
  let phoneNumber = req.query.number;
  if (!phoneNumber) {
    return res.status(400).json({ error: "Tanpri antre nimewo telefòn ou" });
  }

  phoneNumber = phoneNumber.replace(/[^0-9]/g, "");
  
  const sessionDir = path.join(__dirname, "auth_info_baileys");
  
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  
  try {
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      browser: Browsers.macOS("Chrome")
    });

    if (!sock.authState.creds.registered) {
      await delay(1500);
      let code = await sock.requestPairingCode(phoneNumber);
      code = code?.match(/.{1,4}/g)?.join("-") || code;
      
      if (!res.headersSent) {
        res.json({ code });
      }
    } else {
      if (!res.headersSent) {
        res.json({ error: "Nimewo sa a deja konekte!" });
      }
    }

    sock.ev.on("creds.update", saveCreds);
    
    sock.ev.on("connection.update", async (update) => {
      const { connection } = update;
      if (connection === "open") {
        console.log("⚡ Bot la konekte avèk siksè sou WhatsApp!");
      }
    });

  } catch (err) {
    console.error("Erè pandan jenerasyon kòd la:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Echèk nan jenerasyon kòd la. Eseye ankò." });
    }
  }
});

// Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Server listener
app.listen(PORT, "0.0.0.0", () => {
  console.log("⚡ FLUXION CRASH V2 running on port " + PORT);
});
