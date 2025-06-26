const { analizarIntencion } = require("../../Utiles/Chatgpt/AnalizarIntencion");
const FlujoEjemploFlow = require("../EJEMPLO/FlujoEjemploFlow");

const defaultFlow = {
  async Init(userId, message, sock, messageType) {
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
        case "Accion_ejemplo":
          FlujoEjemploFlow.start(userId, { data: result.data }, sock);
          break;

        case "No comprendido":
          await sock.sendMessage(userId, {
            text: "😕 No comprendi tu mensaje,❌ o no poseés los permisos necesarios  para esta acción. Por favor, repetilo.",
          });
          FlowManager.resetFlow(userId);
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

  async handle(userId, message, sock) {
    await sock.sendMessage(userId, {
      text: "No entendi tu mensaje, porfavor repitelo",
    });
  },
};

module.exports = defaultFlow;
