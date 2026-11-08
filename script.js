const connectBtn = document.getElementById("connectBtn");
const message = document.getElementById("message");
const waStatus = document.getElementById("waStatus");

const API_URL = "https://fluxion-crash-v2.onrender.com";

if (connectBtn && message && waStatus) {
  connectBtn.addEventListener("click", async () => {
    connectBtn.disabled = true;
    message.textContent = "Checking FLUXION backend...";

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
          "WhatsApp Cloud API is not configured.";
        return;
      }

      waStatus.textContent = "ONLINE";

      message.textContent =
        "FLUXION is online! Open WhatsApp and send .menu to your FLUXION Business number.";

    } catch (error) {
      console.error(error);

      waStatus.textContent = "OFFLINE";
      message.textContent =
        "Could not connect to FLUXION backend. Try again later.";
    } finally {
      connectBtn.disabled = false;
    }
  });
}
