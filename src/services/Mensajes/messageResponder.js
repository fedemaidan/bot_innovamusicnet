const transcribeAudio = require("../Firebase/transcribeAudio");
const downloadMedia = require("../Firebase/DownloadMedia");
const { obtenerPrecioKeepa } = require("../../routes/keepaRoutes");
const {
  getAsinFromMessage,
} = require("../../Utiles/Mensajes/messageResponder");

const messageResponder = async (messageType, msg, sock, sender) => {
  switch (messageType) {
    case "text":
    case "text_extended": {
      const text =
        msg.message.conversation || msg.message.extendedTextMessage?.text;
      const asin = getAsinFromMessage(text);

      if (!asin) {
        console.log("No se encontró ASIN en el mensaje");
        return;
      }
      const resultado = await obtenerPrecioKeepa(asin);
      console.log("resultado", resultado);

      if (resultado && resultado.success) {
        const mensajePrecios = crearMensajePrecios(resultado);
        await sock.sendMessage(sender, { text: mensajePrecios });
      } else {
        await sock.sendMessage(sender, {
          text: "❌ No se pudo obtener información del producto. Verifica que el código ASIN sea correcto.",
        });
      }
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

const crearMensajePrecios = (resultado) => {
  const { titulo, precio_amazon, peso, precios_calculados, categoria } =
    resultado;

  // Formatear el peso en kg
  const pesoKg = (peso / 1000).toFixed(2);

  // Formatear precios con separadores de miles
  const formatearPrecio = (precio) => {
    return precio.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  let mensaje = `💳 *NUESTROS PRECIOS:*\n`;
  mensaje += `• *Tarjeta:* $${formatearPrecio(precios_calculados.tarjeta)}\n`;
  mensaje += `• *Transferencia:* $${formatearPrecio(
    precios_calculados.transferencia
  )}\n`;
  mensaje += `• *Efectivo USD:* $${formatearPrecio(
    precios_calculados.efectivoUSD
  )}\n\n`;

  mensaje += `📞 *¿Te interesa? Contáctanos para más información.*`;

  return mensaje;
};

module.exports = messageResponder;
