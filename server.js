
const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const APP_SECRET = process.env.META_APP_SECRET;
const API_VERSION = process.env.WHATSAPP_API_VERSION || "v25.0";

const startTime = Date.now();

app.disable("x-powered-by");

// CORS
app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://fluxion-crash-v2.vercel.app"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// WhatsApp API request
async function sendMessage(to, message) {
  if (!TOKEN || !PHONE_ID) {
    throw new Error("WhatsApp API is not configured");
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
    console.error("WhatsApp API error:", {
      status: response.status,
      error: result.error?.message || "Unknown API error"
    });

    throw new Error("WhatsApp message failed");
  }

  return result;
}

// Verify Meta webhook
app.get("/webhook", (req, res) => {
  const mode = String(req.query["hub.mode"] || "");
  const receivedToken = String(
    req.query["hub.verify_token"] || ""
  );
  const challenge = String(
    req.query["hub.challenge"] || ""
  );

  if (
    mode === "subscribe" &&
    VERIFY_TOKEN &&
    receivedToken === VERIFY_TOKEN &&
    challenge
  ) {
    return res.status(200).type("text/plain").send(challenge);
  }

  return res.status(403).send("Webhook verification failed");
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
      for (const entry of data.entry || []) {
        for (const change of entry.changes || []) {
          const messages = change.value?.messages || [];

          for (const msg of messages) {
            if (!msg.from || msg.type !== "text") continue;

            const command =
              msg.text?.body?.trim().toLowerCase() || "";

            let reply;

            switch (command) {
              case ".start":
              case ".menu":
              case ".help":
                reply =
                  "╭━━〔 ⚡ FLUXION CRASH V2 〕━━╮\n\n" +
                  "〔 STATUS 〕\n" +
                  "• .start\n" +
                  "• .menu\n" +
                  "• .help\n" +
                  "• .ping\n" +
                  "• .uptime\n\n" +
                  "〔 OWNER 〕\n" +
                  "• .owner\n\n" +
                  "╰━━━━━━━━━━━━━━━━━━━━╯\n" +
                  "POWER • SPEED • STYLE";
                break;

              case ".ping":
                reply = "⚡ FLUXION PONG!";
                break;

              case ".owner":
                reply = "👑 OWNER: SPEED ITACHI";
                break;

              case ".uptime": {
                const seconds = Math.floor(
                  (Date.now() - startTime) / 1000
                );

                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);

                reply =
                  `⚡ FLUXION UPTIME\n` +
                  `${hours}h ${minutes}m ${seconds % 60}s`;
                break;
              }

              default:
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

// JSON routes
app.use(express.json());

// Home
app.get("/", (req, res) => {
  res.json({
    bot: "FLUXION CRASH V2",
    status: "ONLINE",
    version: "2.1.0"
  });
});

// Real API configuration status
app.get("/api/status", (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  res.json({
    success: true,
    backend: "ONLINE",
    whatsapp: TOKEN && PHONE_ID ? "CONFIGURED" : "NOT CONFIGURED",
    authorization: "NOT VERIFIED",
    message:
      "Backend is running. WhatsApp authorization must be verified separately."
  });
});

// Verify WhatsApp Business API credentials
app.get("/api/whatsapp/check", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (!TOKEN || !PHONE_ID) {
    return res.status(503).json({
      success: false,
      whatsapp: "NOT CONFIGURED"
    });
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_ID}`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`
        }
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        whatsapp: "AUTHENTICATION FAILED",
        message: "WhatsApp API credentials could not be verified."
      });
    }

    return res.json({
      success: true,
      whatsapp: "API ACCESS VERIFIED",
      authorization: "BUSINESS API ACCESS VERIFIED",
      phoneNumberId: PHONE_ID,
      displayPhoneNumber: result.display_phone_number || null
    });

  } catch (error) {
    console.error("WhatsApp check error:", error.message);

    return res.status(503).json({
      success: false,
      whatsapp: "API UNAVAILABLE"
    });
  }
});

// Commands
app.get("/api/commands", (req, res) => {
  res.json({
    bot: "FLUXION CRASH V2",
    commands: [
      ".start",
      ".menu",
      ".help",
      ".ping",
      ".owner",
      ".uptime"
    ]
  });
});

// Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    "⚡ FLUXION CRASH V2 running on port " + PORT
  );
});
