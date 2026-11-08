
const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const APP_SECRET = process.env.META_APP_SECRET;
const API_VERSION = process.env.WHATSAPP_API_VERSION || "v25.0";

app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    "https://fluxion-crash-v2.vercel.app"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

async function sendMessage(to, message) {
  if (!TOKEN || !PHONE_ID) {
    throw new Error("WhatsApp credentials are missing");
  }

  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: message }
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("WhatsApp API error:", result);
    throw new Error("WhatsApp message failed");
  }

  return result;
}

// Webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === VERIFY_TOKEN &&
    challenge
  ) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Receive WhatsApp messages
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.get("x-hub-signature-256");

    if (!APP_SECRET || !signature || !Buffer.isBuffer(req.body)) {
      return res.sendStatus(401);
    }

    const expected =
      "sha256=" +
      crypto
        .createHmac("sha256", APP_SECRET)
        .update(req.body)
        .digest("hex");

    const receivedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      return res.sendStatus(401);
    }

    let data;

    try {
      data = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.sendStatus(400);
    }

    res.sendStatus(200);

    try {
      const entries = data.entry || [];

      for (const entry of entries) {
        for (const change of entry.changes || []) {
          const messages = change.value?.messages || [];

          for (const msg of messages) {
            if (msg.type !== "text" || !msg.from) continue;

            const text = msg.text?.body?.trim().toLowerCase() || "";

            let reply;

            if ([".start", ".menu", ".help"].includes(text)) {
              reply =
                "⚡ FLUXION CRASH V2\n\n" +
                ".menu - Main menu\n" +
                ".help - Help\n" +
                ".ping - Check status\n" +
                ".uptime - Running time\n" +
                ".owner - Owner";
            } else if (text === ".ping") {
              reply = "⚡ FLUXION PONG!";
            } else if (text === ".owner") {
              reply = "👑 FLUXION CRASH V2 OWNER";
            } else if (text === ".uptime") {
              reply = "⚡ FLUXION CRASH V2 IS ONLINE!";
            } else {
              reply =
                "Welcome to FLUXION CRASH V2!\n" +
                "Send .menu to see available commands.";
            }

            await sendMessage(msg.from, reply);
          }
        }
      }
    } catch (error) {
      console.error("Webhook processing error:", error.message);
    }
  }
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    bot: "FLUXION CRASH V2",
    status: "ONLINE",
    version: "2.0.0"
  });
});

app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    whatsapp: TOKEN && PHONE_ID ? "CONFIGURED" : "NOT CONFIGURED",
    message: "Backend is running"
  });
});

app.get("/api/commands", (req, res) => {
  res.json({
    commands: [
      ".menu",
      ".help",
      ".owner",
      ".ping",
      ".uptime"
    ]
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("⚡ FLUXION CRASH V2 running on port " + PORT);
});

