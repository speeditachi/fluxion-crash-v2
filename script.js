
const connectBtn = document.getElementById("connectBtn");
const phoneInput = document.getElementById("phone");
const message = document.getElementById("message");
const waStatus = document.getElementById("waStatus");

const API_URL = "https://fluxion-crash-v2.onrender.com";

connectBtn.addEventListener("click", async () => {
  const phone = phoneInput.value.trim();

  if (!phone) {
    message.textContent = "Please enter your WhatsApp number.";
    return;
  }

  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    message.textContent =
      "Enter a valid number with country code, e.g. +509XXXXXXXX.";
    return;
  }

  connectBtn.disabled = true;
  message.textContent = "Checking FLUXION backend...";

  try {
    const response = await fetch(`${API_URL}/api/status`);
    if (!response.ok) throw new Error("Backend unavailable");

    const data = await response.json();

    waStatus.textContent = data.whatsapp || "NOT CONNECTED";
    message.textContent =
      "Backend connected successfully. WhatsApp pairing is not configured.";
  } catch (error) {
    waStatus.textContent = "OFFLINE";
    message.textContent = "Could not connect to FLUXION backend.";
  } finally {
    connectBtn.disabled = false;
  }
});

