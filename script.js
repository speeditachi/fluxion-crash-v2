
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
    "Number accepted. Secure WhatsApp integration is not configured yet.";

  waStatus.textContent = "PENDING SETUP";
});
