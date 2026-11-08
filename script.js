
const connectBtn = document.getElementById("connectBtn");
const phoneInput = document.getElementById("phone");
const message = document.getElementById("message");
const waStatus = document.getElementById("waStatus");

connectBtn.addEventListener("click", () => {
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

  message.textContent =
    "DEMO MODE: Your number was validated. No WhatsApp pairing code was generated.";

  waStatus.textContent = "DEMO MODE";
});

