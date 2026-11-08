
const pino = require("pino");

let startTime = Date.now();
let botMode = "public";
const pendingBugChoice = new Set();

async function startBot() {
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
  } = await import("@whiskeysockets/baileys");

  const { state, saveCreds } =
    await useMultiFileAuthState("fluxion_auth");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log("⚡ FLUXION CRASH V2 CONNECTED!");
    }

    if (connection === "close") {
      const code =
        lastDisconnect?.error?.output?.statusCode;

      if (code !== DisconnectReason.loggedOut) {
        startBot();
      } else {
        console.log("WhatsApp logged out. Reconnect manually.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg.message || msg.key.fromMe) return;

    const chat = msg.key.remoteJid;
    if (!chat) return;

    const sender = msg.key.participant || chat;

    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const command = body.trim().toLowerCase();

    if (botMode === "private" &&
        !chat.endsWith("@g.us") &&
        sender !== chat) return;

    if (pendingBugChoice.has(chat)) {
      if (command === "android") {
        pendingBugChoice.delete(chat);
        return sock.sendMessage(chat, {
          text: `🤖 ANDROID MENU

.android-info
.android-test
.android-check
.android-report`
        });
      }

      if (command === "ios") {
        pendingBugChoice.delete(chat);
        return sock.sendMessage(chat, {
          text: `🍎 iOS MENU

.ios-info
.ios-test
.ios-check
.ios-report

🐞 BUG REPORT
.bug
.bugcheck
.reportbug`
        });
      }

      return;
    }

    const reply = (text) =>
      sock.sendMessage(chat, { text });

    if (command === ".fluxioncomande" ||
        command === ".menu" ||
        command === ".start" ||
        command === ".help") {
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

    if (command === ".bug-menu") {
      pendingBugChoice.add(chat);
      return reply(`╔══════ • ══════╗
║
║ ⚡ FLUXION BUG MENU
║
║ 🤖 ANDROID
║ 🍎 iOS
║
║ Reponn ANDROID oswa IOS
║
╚══════ • ══════╝`);
    }

    if (command === ".groupmenu") {
      return reply(`👥 FLUXION GROUP MENU

.tag
.tagall
.hidetag
.welcome
.goodbye
.antilink
.antispam
.open
.close
.kick
.promote
.demote

Fonksyon admin yo ap ajoute separeman.`);
    }

    if (command === ".ping") {
      const ms = Date.now() - msg.messageTimestamp * 1000;
      return reply("⚡ FLUXION PONG!");
    }

    if (command === ".alive") {
      return reply("⚡ FLUXION CRASH V2 IS ONLINE!");
    }

    if (command === ".uptime") {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      return reply(`⚡ UPTIME: ${seconds} seconds`);
    }

    if (command === ".owner") {
      return reply("👑 OWNER: SPEED ITACHI");
    }

    if (command === ".self" || command === ".public") {
      return reply("Fonksyon sa a bezwen verifikasyon pwopriyetè anvan aktivasyon.");
    }
  });
}

startBot().catch(console.error);
