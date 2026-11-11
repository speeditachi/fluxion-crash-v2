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

// Servir paj HTML la dirèkteman nan menm sèvè Render a
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#080609">
<title>FLUXION CRASH V2</title>
<style>
:root { --red:#ff1744; --dark:#080609; --panel:#140b13; --border:#4b1427; --green:#00e99a; }
*{box-sizing:border-box;margin:0;padding:0}
body{ background:radial-gradient(ellipse at top,#350819,#080609 55%); color:white;font-family:Segoe UI,Arial,sans-serif; min-height:100vh; }
button,input,select{font:inherit}
a{text-decoration:none;color:inherit}
header{ height:65px;padding:0 16px;display:flex; align-items:center;justify-content:space-between; position:sticky;top:0;z-index:20; background:#090609ed;border-bottom:1px solid #521426; backdrop-filter:blur(15px); }
.brand{color:var(--red);font-weight:950;letter-spacing:1px}
.online{font-size:10px;color:var(--green);font-weight:bold}
.menu-btn,.close-btn{background:none;border:0;color:white;font-size:25px}
.overlay{position:fixed;inset:0;background:#000b;z-index:29;display:none}
.overlay.show{display:block}
.sidebar{ position:fixed;top:0;left:-290px;width:275px;height:100%; background:#100a11;border-right:1px solid var(--red); padding:24px 17px;z-index:30;transition:.3s; overflow-y:auto; }
.sidebar.open{left:0}
.side-top{display:flex;justify-content:space-between;margin-bottom:25px}
.side-top h2{color:var(--red)}
.side-label{color:#888;font-size:10px;letter-spacing:2px;margin:22px 0 12px}
.side-link{ display:block;width:100%;padding:14px;margin-bottom:9px; border:1px solid #421526;border-radius:10px; background:#1b101b;color:white;text-align:left;font-size:12px; }
.side-link:hover{border-color:var(--red);background:#32101d}
.side-info{padding:14px;background:#1b101b;border:1px solid #421526;border-radius:12px;color:#aaa;font-size:12px;line-height:2}
.container{max-width:540px;margin:auto;padding:18px 15px 35px}
.hero{text-align:center;padding-top:8px}
.image-frame{ position:relative;height:440px;overflow:hidden; border:1px solid var(--red);border-radius:22px; box-shadow:0 0 35px #ff174433;margin-bottom:25px; background:#110b19; }
.image-banner{ width:100%;height:100%;object-fit:cover; object-position:center 25%;display:block; }
.image-frame:after{ content:"";position:absolute;inset:45% 0 0; background:linear-gradient(transparent,#080609); pointer-events:none; }
.lightning{font-size:45px;filter:drop-shadow(0 0 12px red)}
.tagline{font-size:10px;color:#ff718b;letter-spacing:4px;margin:12px}
h1{font-size:32px;font-weight:950;letter-spacing:1px;margin:12px}
h1 span{color:var(--red)}
.subtitle{font-size:12px;color:#aaa;line-height:1.8}
.card{ margin-top:23px;padding:21px; background:linear-gradient(145deg,#1a0e19,#0c080e); border:1px solid #481426;border-radius:17px; box-shadow:0 10px 30px #0008; }
.section-title{color:var(--red);font-size:14px;font-weight:900;letter-spacing:2px;margin-bottom:17px}
.section-subtitle{font-size:10px;color:#888;margin-top:-10px;margin-bottom:18px}
.input-group{text-align:left;margin-bottom:17px}
label{display:block;color:#ff718b;font-size:10px;font-weight:bold;letter-spacing:1.5px;margin-bottom:9px}
.phone-row{display:flex;gap:8px}
input,select{ background:#09060b;border:1px solid #4b1828; color:white;border-radius:10px;padding:14px 10px;outline:none; }
select{width:115px}
input{width:100%;min-width:0}
input:focus,select:focus{border-color:var(--red);box-shadow:0 0 12px #ff174433}
.main-btn{ width:100%;padding:16px;border:0;border-radius:11px; color:white;background:linear-gradient(100deg,#ff1744,#a00029); font-weight:900;font-size:12px;letter-spacing:1.5px; box-shadow:0 5px 20px #ff174455; }
.main-btn:disabled{opacity:.5}
.warning{font-size:10px;color:#888;line-height:1.7;margin-top:15px}
#result-box{ display:none;margin-top:20px;padding:20px 14px; border:1px solid var(--green);border-radius:16px; background:linear-gradient(145deg,#071b13,#080c0a); box-shadow:0 0 22px #00e99a22; animation:appear .4s ease; }
@keyframes appear{ from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
.success-title{color:var(--green);font-weight:900;font-size:12px;margin-bottom:20px}
#qr-container{ display:none;width:max-content;max-width:100%; padding:12px;background:white;border-radius:13px;margin:auto; }
#qrcode{min-width:190px;min-height:190px}
#qr-container p{color:#111;font-size:10px;font-weight:900;margin-top:8px}
.code-label{color:#80eac0;font-size:10px;letter-spacing:2px;margin-top:22px}
#pairing-code{ color:var(--green);font-size:27px;font-weight:950; letter-spacing:4px;padding:16px 7px;margin:12px 0; background:#030b07;border:1px dashed var(--green); border-radius:11px;overflow-wrap:anywhere; text-shadow:0 0 12px #00e99a; }
.result-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.copy-btn,.download-btn{ border-radius:10px;padding:14px 5px;font-size:11px;font-weight:900; }
.copy-btn{background:linear-gradient(90deg,#ff1744,#a00029);color:white;border:0}
.download-btn{background:#100a10;color:white;border:1px solid var(--red)}
#copy-message{color:var(--green);font-size:11px;margin-top:13px}
.step{ display:flex;gap:13px;padding:15px; background:#1b101b;border:1px solid #421526; border-radius:12px;margin-bottom:11px; }
.step-number{color:var(--red);font-size:20px;font-weight:900}
.step h3{font-size:12px;margin-bottom:6px}
.step p{font-size:11px;color:#999;line-height:1.7}
.status-row{ display:flex;justify-content:space-between; padding:14px 0;border-bottom:1px solid #321422;font-size:12px; }
.status-row:last-child{border:0}
.status-name{color:#aaa}
.status-value{color:var(--green);font-weight:bold}
.status-pending{color:#ffbd4a}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.action-btn{ padding:15px 6px;text-align:center;background:#1b101b; border:1px solid #481426;border-radius:11px;color:white; font-size:11px;font-weight:bold; }
footer{text-align:center;padding:35px 15px;border-top:1px solid #481426;margin-top:30px}
.footer-brand{color:var(--red);font-size:18px;font-weight:950;letter-spacing:2px}
footer p{font-size:11px;color:#888;margin-top:10px}
.owner-btn{ display:inline-block;margin-top:18px;padding:13px 24px; background:linear-gradient(90deg,#ff1744,#a00029); border-radius:30px;font-size:12px;font-weight:bold; }
@media(min-width:700px){ .container{max-width:620px} .image-frame{height:480px} }
</style>
</head>
<body>
<header>
 <button class="menu-btn" id="menuBtn">☰</button>
 <div class="brand">💀 FLUXION.ACCOUNT</div>
 <div class="online">● SYSTEM ONLINE</div>
</header>
<div class="overlay" id="overlay"></div>
<aside class="sidebar" id="sidebar">
 <div class="side-top">
  <h2>⚡ FLUXION</h2>
  <button class="close-btn" id="closeBtn">×</button>
 </div>
 <div class="side-label">NAVIGATION</div>
 <a href="#home" class="side-link">⌂ HOME</a>
 <a href="#connect" class="side-link">⚡ WHATSAPP CONNECTION</a>
 <a href="#how" class="side-link">▤ HOW IT WORKS</a>
 <a href="#status" class="side-link">◉ SYSTEM STATUS</a>
 <div class="side-label">INFORMATION</div>
 <div class="side-info">
  PLATFORM<br><b>FLUXION CRASH V2</b><br>
  VERSION<br><b>2.2.0</b><br>
  DEVELOPER<br><b>SPEED ITACHI</b><br>
  STATUS<br><b style="color:#00e99a">● ONLINE</b>
 </div>
 <div class="side-label">CONTACT & SHARE</div>
 <a href="https://wa.me/50944618286" target="_blank" rel="noopener" class="side-link">☎ CONTACT OWNER</a>
 <button class="side-link" id="sideShare">↗ SHARE WEBSITE</button>
</aside>
<main class="container" id="home">
 <section class="hero">
  <div class="image-frame">
   <img src="https://images.alphacoders.com/131/1314150.jpg" alt="Goku Ultra Instinct" class="image-banner" onerror="this.onerror=null;this.src='https://images.alphacoders.com/137/1376244.jpg';">
  </div>
  <div class="lightning">⚡</div>
  <div class="tagline">NEXT GENERATION PLATFORM</div>
  <h1>FLUXION <span>CRASH V2</span></h1>
  <p class="subtitle">A modern platform for managing your FLUXION WhatsApp connection.</p>
 </section>
 <section class="card" id="connect">
  <div class="section-title">⚡ WHATSAPP CONNECTION</div>
  <p class="section-subtitle">CONNECT YOUR PERSONAL WHATSAPP</p>
  <form id="connect-form">
   <div class="input-group">
    <label>PHONE NUMBER</label>
    <div class="phone-row">
     <select id="country-code">
      <option value="+509">🇭🇹 +509</option>
      <option value="+1">🇺🇸 +1</option>
      <option value="+33">🇫🇷 +33</option>
      <option value="+1809">🇩🇴 +1809</option>
      <option value="+55">🇧🇷 +55</option>
      <option value="+34">🇪🇸 +34</option>
      <option value="+52">🇲🇽 +52</option>
      <option value="+44">🇬🇧 +44</option>
     </select>
     <input type="tel" id="phone-local" placeholder="Phone number" required>
    </div>
   </div>
   <button type="submit" class="main-btn" id="submit-btn">GENERATE PAIRING CODE →</button>
  </form>
  <div id="result-box">
   <div class="success-title">✓ CONNECTION RESPONSE RECEIVED</div>
   <div id="qr-container">
    <div id="qrcode"></div>
    <p>SCAN WITH WHATSAPP</p>
   </div>
   <div class="code-label">YOUR PAIRING CODE</div>
   <div id="pairing-code">--------</div>
   <div class="result-actions">
    <button type="button" class="copy-btn" id="copy-btn">▣ COPY CODE</button>
    <button type="button" class="download-btn" id="download-qr">↓ DOWNLOAD QR</button>
   </div>
   <p id="copy-message"></p>
  </div>
  <p class="warning">Only connect an account you own or are authorized to manage. Never share your pairing code.</p>
 </section>
 <section class="card" id="how">
  <div class="section-title">▤ HOW IT WORKS</div>
  <p class="section-subtitle">THREE SIMPLE STEPS</p>
  <div class="step"><div class="step-number">01</div><div><h3>ENTER YOUR NUMBER</h3><p>Select your country code and enter your phone number.</p></div></div>
  <div class="step"><div class="step-number">02</div><div><h3>GENERATE CODE</h3><p>Request your connection code from the server.</p></div></div>
  <div class="step"><div class="step-number">03</div><div><h3>CONNECT WHATSAPP</h3><p>Follow WhatsApp's linked-device instructions.</p></div></div>
 </section>
 <section class="card" id="status">
  <div class="section-title">◉ SYSTEM STATUS</div>
  <div class="status-row"><span class="status-name">WEBSITE</span><span class="status-value">● ONLINE</span></div>
  <div class="status-row"><span class="status-name">BACKEND</span><span class="status-value" id="backend-status">● AVAILABLE</span></div>
  <div class="status-row"><span class="status-name">WHATSAPP</span><span class="status-value status-pending" id="ws-status">● NOT CONNECTED</span></div>
  <div class="status-row"><span class="status-name">VERSION</span><span class="status-value">2.2.0</span></div>
 </section>
 <section class="card">
  <div class="section-title">↗ FLUXION COMMUNITY</div>
  <div class="actions">
   <a href="https://wa.me/50944618286" target="_blank" rel="noopener" class="action-btn">☎ CONTACT OWNER</a>
   <button class="action-btn" id="shareBtn">↗ SHARE WEBSITE</button>
  </div>
 </section>
</main>
<footer>
 <div class="footer-brand">💀 FLUXION CRASH V2</div>
 <p>POWERED BY SPEED ITACHI</p>
 <a href="https://wa.me/50944618286" target="_blank" rel="noopener" class="owner-btn">☎ CONTACT OWNER</a>
 <p>© 2026 FLUXION. All rights reserved.</p>
</footer>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
// Nou itilize /connect dirèkteman piske frontend ak backend se menm sèvè a
const BACKEND_URL="/connect";
const sidebar=document.getElementById("sidebar");
const overlay=document.getElementById("overlay");
function closeMenu(){ sidebar.classList.remove("open"); overlay.classList.remove("show"); }
document.getElementById("menuBtn").onclick=()=>{ sidebar.classList.add("open"); overlay.classList.add("show"); };
document.getElementById("closeBtn").onclick=closeMenu;
overlay.onclick=closeMenu;
document.querySelectorAll(".side-link[href^='#']").forEach(a=>a.onclick=closeMenu);

const form=document.getElementById("connect-form");
const submitBtn=document.getElementById("submit-btn");
const resultBox=document.getElementById("result-box");
const pairingCode=document.getElementById("pairing-code");
const qrContainer=document.getElementById("qr-container");
const qrElement=document.getElementById("qrcode");
const copyMessage=document.getElementById("copy-message");

form.addEventListener("submit",async e=>{
 e.preventDefault();
 const country=document.getElementById("country-code").value;
 const local=document.getElementById("phone-local").value.replace(/\\D/g,"").replace(/^0+/,"");
 if(!local){ alert("Enter a valid phone number."); return; }
 const phone=country+local;
 submitBtn.disabled=true;
 submitBtn.textContent="REQUESTING CODE...";
 resultBox.style.display="block";
 pairingCode.textContent="LOADING...";
 qrContainer.style.display="none";
 qrElement.innerHTML="";
 copyMessage.textContent="";
 try{
  const response=await fetch(BACKEND_URL,{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({phone})
  });
  const data=await response.json();
  if(!response.ok||!data.success||!data.code){
   throw new Error(data.error||data.message||"Unable to generate code.");
  }
  pairingCode.textContent=data.code;
  document.getElementById("ws-status").textContent="● CODE GENERATED";
  document.getElementById("ws-status").className="status-value";
  document.getElementById("backend-status").textContent="● ONLINE";
 }catch(error){
  console.error(error);
  resultBox.style.display="none";
  document.getElementById("ws-status").textContent="● NOT CONNECTED";
  document.getElementById("ws-status").className="status-value status-pending";
  document.getElementById("backend-status").textContent="● CHECK CONNECTION";
  alert(error.message||"Backend connection failed.");
 }finally{
  submitBtn.disabled=false;
  submitBtn.textContent="GENERATE PAIRING CODE →";
 }
});
document.getElementById("copy-btn").onclick=async()=>{
 const code=pairingCode.textContent;
 if(!code||code==="LOADING...")return;
 try{
  await navigator.clipboard.writeText(code);
  copyMessage.textContent="✓ CODE COPIED SUCCESSFULLY!";
 }catch(e){
  copyMessage.textContent="Please select and copy the code manually.";
 }
};
</script>
</body>
</html>`);
});

// API /connect
app.post('/connect', async (req, res) => {
    let phoneNumber = req.body.phone || req.body.number;
    if (!phoneNumber) return res.status(400).json({ success: false, error: 'Nimewo a obligatwa!' });

    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

    try {
        if (!activeSock || !activeSock.authState.creds.registered) {
            if (fs.existsSync('./fluxion_auth')) {
                fs.rmSync('./fluxion_auth', { recursive: true, force: true });
            }
            
            await startBot();
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
