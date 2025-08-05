const transcribeAudio = require("../Firebase/transcribeAudio");
const downloadMedia = require("../Firebase/DownloadMedia");
const KeepaConfigService = require("../../Utiles/KeepaConfigService");
const {
  addCotizacionToSheet,
  addEmailToSheet,
} = require("../../Utiles/Google/Sheets/contizaciones");
const { extraerEmail } = require("../../Utiles/Mensajes/mensajesMariano");
const FlowMapper = require("../../FlowControl/FlowMapper");

const messageResponder = async (messageType, msg, sock, sender) => {
  const phoneNumber = sender.split("@")[0];

  switch (messageType) {
    case "text":
    case "text_extended": {
      const text =
        msg.message.conversation || msg.message.extendedTextMessage?.text;
      const email = extraerEmail(text);
      if (email) {
        await addEmailToSheet(email, phoneNumber);
      }

      const isBlocked = await KeepaConfigService.isNumberBlocked(phoneNumber);
      if (isBlocked) {
        return;
      }

      await FlowMapper.handleMessage(sender, text, messageType);
    }
    case "image": {
      break;
    }
    case "video": {
      break;
    }
    case "audio": {
      try {
        const filePath = await downloadMedia(msg, "audio");

        const transcripcion = await transcribeAudio(filePath);

        console.log("Esta es la transcripcion");
        console.log(transcripcion);
      } catch (error) {
        console.error("Error al procesar el audio:", error);
      }
      break;
    }
    case "document":
    case "document-caption": {
      break;
    }
    default: {
      break;
    }
  }
};

module.exports = messageResponder;
