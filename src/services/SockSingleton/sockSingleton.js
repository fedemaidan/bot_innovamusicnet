const getMessageType = require("../Mensajes/GetType");
const messageResponders = require("../Mensajes/messageResponder");

class SockSingleton {
  constructor() {
    if (!SockSingleton.instance) {
      this.sock = {}; // Se guardará la instancia única de sock
      SockSingleton.instance = this;
    }

    return SockSingleton.instance;
  }
  setSock(sockInstance) {
    this.sock = sockInstance;

    this.sock.ev.on("messages.upsert", async (message) => {
      const msg = message.messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const sender = msg.key.remoteJid;
      const messageType = getMessageType(msg.message);

      await messageResponders(messageType, msg, this.sock, sender);
    });

    setInterval(
      async () => await this.sock.sendPresenceUpdate("available"),
      10 * 60 * 1000
    );
  }

  // Obtiene la instancia del sock
  getSock() {
    return this.sock;
  }
}

module.exports = new SockSingleton();
