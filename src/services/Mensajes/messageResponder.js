const transcribeAudio = require("../Firebase/transcribeAudio");
const downloadMedia = require("../Firebase/DownloadMedia");
const { obtenerPrecioKeepa } = require("../../routes/keepaRoutes");
const KeepaConfigService = require("../../Utiles/KeepaConfigService");
const {
  addCotizacionToSheet,
} = require("../../Utiles/Google/Sheets/contizaciones");

const getAsinFromMessage = (msg) => {
  try {
    const skuMatch = msg.match(/SKU:\s*([A-Z0-9]{10})/i);

    if (skuMatch && skuMatch[1]) {
      return skuMatch[1].toUpperCase();
    }

    const asinMatch = msg.match(/\b([A-Z0-9]{10})\b/);

    if (asinMatch && asinMatch[1]) {
      return asinMatch[1].toUpperCase();
    }

    return null;
  } catch (error) {
    console.error("Error extrayendo ASIN del mensaje:", error);
    return null;
  }
};

const getLinkFromMessage = (msg) => {
  try {
    // Buscar URLs que empiecen con http o https
    const urlMatch = msg.match(/(https?:\/\/[^\s]+)/i);

    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }

    // Buscar URLs que empiecen con www
    const wwwMatch = msg.match(/(www\.[^\s]+)/i);

    if (wwwMatch && wwwMatch[1]) {
      return `https://${wwwMatch[1]}`;
    }

    return null;
  } catch (error) {
    console.error("Error extrayendo link del mensaje:", error);
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
      const link = getLinkFromMessage(text);
      const mensajes = await KeepaConfigService.obtenerMensajesConfiguracion();
      console.log("mensajes", mensajes);
      console.log("link extraído:", link);

      if (!asin) {
        const mensaje = mensajes["NO_SKU"];
        await sock.sendMessage(sender, { text: mensaje });
        return;
      }
      const resultado = await obtenerPrecioKeepa(asin);
      console.log("resultado", resultado);

      if (resultado && resultado.success) {
        const mensajePrecios = await crearMensajePrecios(resultado);
        await addCotizacionToSheet({
          link,
          asin,
          precio: resultado.precios_calculados.efectivoUSD,
        });
        await sock.sendMessage(sender, { text: mensajePrecios });
      } else if (
        !resultado.success &&
        resultado.error === "Producto no disponible en Amazon"
      ) {
        await sock.sendMessage(sender, {
          text: mensajes.NO_DISPONIBILIDAD,
        });
      } else if (!resultado.success) {
        console.log("ERROR EN KEEPPA");
        console.log(resultado);
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

const crearMensajePrecios = async (resultado) => {
  const { titulo, precio_amazon, peso, precios_calculados, categoria } =
    resultado;

  console.log("resultadoKeepa", resultado);

  // Obtener el template de mensaje configurado
  const mensajes = await KeepaConfigService.obtenerMensajesConfiguracion();
  let mensaje = mensajes.MOSTRAR_PRECIO;

  const formatearPrecio = (precio) => {
    return precio.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  mensaje = mensaje.replace(
    /\[tarjeta\]/g,
    formatearPrecio(precios_calculados.tarjeta)
  );
  mensaje = mensaje.replace(
    /\[transferencia\]/g,
    formatearPrecio(precios_calculados.transferencia)
  );
  mensaje = mensaje.replace(
    /\[efectivoUSD\]/g,
    formatearPrecio(precios_calculados.efectivoUSD)
  );

  return mensaje;
};

module.exports = messageResponder;
