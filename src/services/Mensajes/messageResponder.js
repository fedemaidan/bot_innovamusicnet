const transcribeAudio = require("../Firebase/transcribeAudio");
const downloadMedia = require("../Firebase/DownloadMedia");

const messageResponder = async (messageType, msg, sock, sender) => {
  switch (messageType) {
    case "text":
    case "text_extended": {
      const text =
        msg.message.conversation || msg.message.extendedTextMessage?.text;
      console.log("EsperarRespuestaFlow");
      await EsperarRespuestaFlow.start(sender, text);
      break;
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
