
const connectBtn = document.getElementById("connectBtn");
const phoneInput = document.getElementById("phone");
const message = document.getElementById("message");
const waStatus = document.getElementById("waStatus");

const API_URL = "https://fluxion-crash-v2.onrender.com";

if (connectBtn && phoneInput && message && waStatus) {
  connectBtn.addEventListener("click", async () => {
    const phone = phoneInput.value.trim();

    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      message.textContent =
        "Enter a valid phone number with country code.";
      phoneInput.focus();
      return;
    }

    connectBtn.disabled = true;
    message.textContent = "CHECKING FLUXION SYSTEM...";
    waStatus.textContent = "CHECKING...";

    try {
      const response = await fetch(
        `${API_URL}/api/whatsapp/check`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        waStatus.textContent = "NOT VERIFIED";
        message.textContent =
          "FLUXION backend is online, but WhatsApp API access is not verified yet.";
        return;
      }

      waStatus.textContent = "API VERIFIED";
      message.textContent =
        "WhatsApp Business API access verified. This does not connect a personal WhatsApp account.";

    } catch (error) {
      console.error("FLUXION:", error);
      waStatus.textContent = "OFFLINE";
      message.textContent =
        "Unable to check WhatsApp API. Please try again later.";
    } finally {
      connectBtn.disabled = false;
    }
  });
}

