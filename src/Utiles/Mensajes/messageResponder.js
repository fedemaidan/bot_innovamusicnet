// Importaciones comentadas hasta que se implementen los módulos
// const FlowMapper = require("../../FlowControl/FlowMapper");
// const FlowManager = require("../../FlowControl/FlowManager");
// const EsperarRespuestaFlow = require("../../Flows/ESPERAR_RESPUESTA/EsperarRespuestaFlow");

const { obtenerPrecioKeepa } = require("../../routes/keepaRoutes");

// Función para extraer el código ASIN del mensaje
const getAsinFromMessage = (msg) => {
  try {
    // Buscar el patrón SKU: seguido del código ASIN
    const skuMatch = msg.match(/SKU:\s*([A-Z0-9]{10})/i);

    if (skuMatch && skuMatch[1]) {
      return skuMatch[1].toUpperCase();
    }

    // Buscar códigos ASIN en el formato B0XXXXXXXXX (10 caracteres alfanuméricos)
    const asinMatch = msg.match(/\b([A-Z0-9]{10})\b/);

    if (asinMatch && asinMatch[1]) {
      return asinMatch[1].toUpperCase();
    }

    // Si no encuentra ningún patrón, devolver null
    return null;
  } catch (error) {
    console.error("Error extrayendo ASIN del mensaje:", error);
    return null;
  }
};

const messageResponder = async (messageType, msg, sock, sender) => {
  switch (messageType) {
    case "text":
    case "text_extended": {
      const text =
        msg.message.conversation || msg.message.extendedTextMessage?.text;
      const asin = getAsinFromMessage(text);
      const resultado = await obtenerPrecioKeepa(asin);
      console.log("resultado", resultado);
      break;
    }
    case "image":
    case "video":
    case "document":
    case "document-caption": {
      break;
    }
  }
};

module.exports = {
  messageResponder,
  getAsinFromMessage,
};
