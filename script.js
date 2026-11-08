
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
        "Please enter a valid phone number with country code.";
      phoneInput.focus();
      return;
    }

    connectBtn.disabled = true;
    message.textContent = "CHECKING FLUXION BACKEND...";
    waStatus.textContent = "CHECKING...";

    try {
      const response = await fetch(`${API_URL}/api/status`, {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Backend unavailable");
      }

      const data = await response.json();

      if (data.whatsapp !== "CONFIGURED") {
        waStatus.textContent = "NOT CONFIGURED";
        message.textContent =
          "WhatsApp Business API configuration is incomplete.";
        return;
      }

      waStatus.textContent = "CONFIGURED";

      message.textContent =
        "Backend verified successfully. WhatsApp Business connection still needs to be authorized.";

    } catch (error) {
      console.error("FLUXION:", error);

      waStatus.textContent = "OFFLINE";
      message.textContent =
        "Could not connect to FLUXION backend. Please try again.";
    } finally {
      connectBtn.disabled = false;
    }
  });
}
