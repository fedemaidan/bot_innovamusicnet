const { analizarIntencion } = require("../../Utiles/Chatgpt/AnalizarIntencion");
const KeepaConfigService = require("../../Utiles/KeepaConfigService");
const {
  getAsinFromMessage,
  getLinkFromMessage,
  getTituloFromMessage,
  enviarMensajePrueba,
} = require("../../Utiles/Mensajes/mensajesMariano");
const AnalizarPrecioFlow = require("../AnalizarPrecio/AnalizarPrecioFlow");

const defaultFlow = {
  async Init(userId, message, messageType) {
    try {
      //si es texto se analiza en cambio si es una imagen o documento o document-caption este ya se encuentra analizado y salta el "Analizar intencion"
      let result;

      //Esta logica viene de que si el mensaje es una imagen o un pdf, ya se proceso anteriormente, no hace falta volver a hacerlo.
      if (
        messageType == "text" ||
        messageType == "text_extended" ||
        messageType == "audio"
      ) {
        result = await analizarIntencion(message, userId);
      } else {
        result = message;
      }

      console.log("result", result);
      //Aqui van todas las ACCIONES que se encuentran en analizar intencion. El json y este switch deben hacer MATCH
      //Se encarga de Enrutar  los datos al flujo que el usuario se esta dirijiendo.
      switch (result.accion) {
        case "Info Precio":
          const asinRegular = getAsinFromMessage(message);
          const linksRegular = getLinkFromMessage(message);
          const titulo = getTituloFromMessage(message);
          const linkAmazon =
            linksRegular?.linkAmazon ||
            `https://www.amazon.com/dp/${asinRegular}`;

          AnalizarPrecioFlow.start(userId, {
            ...result.data,
            asins: [asinRegular],
            linksAmazon: [linkAmazon],
            linkInova: linksRegular?.linkInova,
            titulos: [titulo],
            retry: 3,
            features: [],
            inicio: Date.now(),
          });
          break;

        case "No comprendido":
          const sockSingleton = require("../../services/SockSingleton/sockSingleton");
          const sock = sockSingleton.getSock();
          const mensajes =
            await KeepaConfigService.obtenerMensajesConfiguracion();
          const mensaje = mensajes.MENSAJE_SIN_COTIZAR;
          // Obtener el delay como número con fallback a 5 segundos
          const delay = await KeepaConfigService.obtenerValorNumerico(
            "SEGUNDOS_DELAY_RESPUESTA_INICIAL"
          );

          await enviarMensajePrueba(
            userId,
            `Esperando ${delay} segundos para responder ...`
          );

          setTimeout(async () => {
            await sock.sendMessage(userId, {
              text: mensaje,
              linkPreview: false,
            });
          }, delay * 1000);
          break;

        case "NoRegistrado":
          console.log("NO REGISTRADO");
          break;
      }
      return;
    } catch (err) {
      console.error("Error analizando la intención:", err.message);
      return { accion: "DESCONOCIDO" };
    }
  },

  async handle(userId, message) {
    console.log("Handle INIT FLOW");
  },
};

module.exports = defaultFlow;
