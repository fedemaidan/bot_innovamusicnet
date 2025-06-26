const { getByChatGpt4o } = require("../../services/Chatgpt/Base");

module.exports = async function detectarEstado(message) {
  if (message.length === 0) {
    console.log("No hay mensajes para procesar.");
    return null;
  }

  try {
    const prompt = `
Analiza los siguientes mensajes de un cliente y determina su estado según estos criterios:
- "INTERESADO": El cliente muestra interés en el producto/servicio, hace preguntas específicas, solicita más información o demuestra intención de compra.
- "NO INTERESADO": El cliente rechaza explícitamente la oferta, muestra desinterés o pide no ser contactado nuevamente.
- "-": El cliente ha enviado un mensaje que no se puede clasificar como "INTERESADO" o "NO_INTERESADO". Por ejemplo: "Hola", "Buenos dias".

Mensajes del cliente:
${message}

Responde con un objeto JSON con una única propiedad llamada "estado" cuyo valor debe ser uno de estos estados: "INTERESADO", "NO_INTERESADO" o "-".
Ejemplo de respuesta JSON esperada: { "estado": "INTERESADO" }.
`;
    const response = await getByChatGpt4o(prompt);
    const respuesta = JSON.parse(response);
    console.log("RESPUESTA CHAT", respuesta);

    if (respuesta.hasOwnProperty("json_data")) {
      return respuesta.json_data;
    } else {
      return respuesta;
    }
  } catch (error) {
    console.error("Error al detectar estado:", error.message);
    return null;
  }
};
