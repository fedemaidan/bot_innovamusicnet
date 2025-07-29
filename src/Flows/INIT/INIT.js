const { analizarIntencion } = require("../../Utiles/Chatgpt/AnalizarIntencion");
const {
  getAsinFromMessage,
  getLinkFromMessage,
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

      //Aqui van todas las ACCIONES que se encuentran en analizar intencion. El json y este switch deben hacer MATCH
      //Se encarga de Enrutar  los datos al flujo que el usuario se esta dirijiendo.
      switch (result.accion) {
        case "Info Precio":
          const asinRegular = getAsinFromMessage(message);
          const linkRegular = getLinkFromMessage(message);
          AnalizarPrecioFlow.start(userId, {
            ...result.data,
            asinRegular: asinRegular,
            linkRegular: linkRegular,
          });
          break;

        case "No comprendido":
          console.log("NO COMPRENDIDO");
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
