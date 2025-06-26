const connectToWhatsApp = require("./src/services/Mensajes/whatsapp");
const getMessageType = require("./src/services/Mensajes/GetType");
const messageResponder = require("./src/services/Mensajes/messageResponder");
const socketSingleton = require("./src/services/SockSingleton/sockSingleton");

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
