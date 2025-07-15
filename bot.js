const getMessageType = require("./src/services/Mensajes/GetType");
const messageResponder = require("./src/services/Mensajes/messageResponder");
const socketSingleton = require("./src/services/SockSingleton/sockSingleton");
const { connectToWhatsApp } = require("./src/services/Mensajes/whatsapp");
const QRCode = require("qrcode");
const express = require("express");
const router = express.Router();

router.get("/qr", (req, res) => {
  if (!latestQR) {
    return res.send("QR no generado aún. Espera...");
  }
  // Genera una imagen en base64 del QR y la envía al navegador
  QRCode.toDataURL(latestQR, (err, url) => {
    if (err) return res.status(500).send("Error generando QR");
    res.send(`<img src="${url}" style="width:300px;">`);
  });
});

module.exports = async function startBot() {
  const sock = await connectToWhatsApp();
  await socketSingleton.setSock(sock);

  sock.ev.on("messages.upsert", async (message) => {
    const msg = message.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const messageType = getMessageType(msg.message);

    await messageResponder(messageType, msg, sock, sender);
  });

  setInterval(() => console.log("Keep-alive"), 5 * 60 * 1000);
  setInterval(
    async () => await sock.sendPresenceUpdate("available"),
    10 * 60 * 1000
  );
};
