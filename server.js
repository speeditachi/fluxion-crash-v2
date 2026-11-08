const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    bot: "FLUXION CRASH V2",
    status: "ONLINE",
    version: "2.0.0"
  });
});

app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    whatsapp: "NOT CONNECTED",
    message: "Backend is running"
  });
});

app.get("/api/commands", (req, res) => {
  res.json({
    commands: [
      ".menu",
      ".help",
      ".owner",
      ".ping",
      ".profile",
      ".uptime"
    ]
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FLUXION CRASH V2 running on port ${PORT}`);
});
