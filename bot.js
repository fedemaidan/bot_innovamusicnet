const { connectToWhatsApp } = require("./src/services/Mensajes/whatsapp");

module.exports = async function startBot() {
  const sock = await connectToWhatsApp();

  setInterval(() => console.log("Keep-alive"), 5 * 60 * 1000);
};
