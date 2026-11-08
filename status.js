
export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  return res.status(200).json({
    success: true,
    bot: "FLUXION CRASH V2",
    status: "ONLINE",
    whatsapp: "NOT CONNECTED",
    version: "2.0.0"
  });
}
