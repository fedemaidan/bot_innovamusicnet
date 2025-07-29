const { getByChatGpt4o } = require("../Chatgpt/Base");

const opcion = {
  accion: "ConsultarProducto",
  data: {
    respuesta:
      "SI o NO dependiendo si el usuario está consultando por un producto específico",
  },
};
async function opcionElegida(mensajeCliente) {
  //Opcion elegida es como analizar intencion pero solo analiza SI, NO, SALIR, CANCELAR.
  //esta hecho para un la eleccion de un menu simple.

  prompt = `
Como bot de un sistema de ventas, necesito determinar si el usuario está consultando por un producto específico.

Formato de respuesta: Devuelve exclusivamente un JSON con "SI" o "NO" en el campo "respuesta", sin incluir texto adicional.

Criterios para responder "SI":
- El mensaje contiene el nombre completo de un producto específico
- El mensaje incluye características detalladas del producto (marca, modelo, especificaciones)
- El mensaje menciona productos con descripciones completas como: "Studebaker SB2140B Equipo de sonido portátil con Bluetooth, CD, radio AM/FM y grabadora de casete (Negro)"

Criterios para responder "NO":
- El mensaje es una pregunta general sobre productos
- El mensaje no menciona productos específicos
- El mensaje es un saludo o conversación general
- El mensaje solo menciona categorías generales sin productos específicos

Resumen del contexto: Soy un bot encargado de vender productos y necesito identificar cuando un usuario está consultando por un producto específico.

El usuario dice: "${mensajeCliente}"

Formato de respuesta esperado (EXCLUSIVAMENTE JSON, sin texto adicional):
${JSON.stringify(opcion, null, 2)}
`;

  const response = await getByChatGpt4o(prompt);
  const respuesta = JSON.parse(response);
  console.log("respuesta", respuesta);

  if (respuesta.hasOwnProperty("json_data")) {
    return respuesta.json_data;
  } else {
    return respuesta;
  }
}
module.exports = opcionElegida;
