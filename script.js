const connectBtn = document.getElementById("connectBtn");
const phoneInput = document.getElementById("phone");
const message = document.getElementById("message");
const waStatus = document.getElementById("waStatus");

const API_URL = "https://fluxion-crash-v2.onrender.com";

if (connectBtn && phoneInput && message && waStatus) {
  connectBtn.addEventListener("click", async () => {
    let phone = phoneInput.value.trim();

    // Retire nenpòt siy plis (+) oswa espas paske Baileys bezwen l san "+"
    phone = phone.replace(/[^0-9]/g, "");

    if (!phone || phone.length < 8) {
      message.textContent = "Antre yon nimewo telefòn valab (eg: 50944618286).";
      phoneInput.focus();
      return;
    }

    connectBtn.disabled = true;
    message.textContent = "Ap mande Pairing Code sou FLUXION...";
    waStatus.textContent = "MANDÈ...";

    try {
      // Chanje endpoint la pou l al sou route ki jere pairing code la nan backend ou an
      const response = await fetch(`${API_URL}/pair`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ phone: phone })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        waStatus.textContent = "ECHÈC";
        message.textContent = data.error || "Echèk nan mande kòd la. Eseye ankò.";
        return;
      }

      waStatus.textContent = "KÒD JENE";
      message.textContent = `Kòd ou a se: ${data.code}. Antre l sou WhatsApp vit!`;
      
      // Si w gen yon eleman pou afiche kòd la sou ekran an:
      // document.getElementById("pairingCodeDisplay").textContent = data.code;

    } catch (error) {
      console.error("FLUXION:", error);
      waStatus.textContent = "OFFLINE";
      message.textContent = "Echèk koneksyon ak sèvè a. Eseye ankò pita.";
    } finally {
      connectBtn.disabled = false;
    }
  });
}
