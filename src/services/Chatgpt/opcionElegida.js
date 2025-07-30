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
- El mensaje incluye un link de Amazon
- Aca tenes 3 ejemplos de mensajes que son productos: ("Studebaker SB2140B Equipo de sonido portátil con Bluetooth, CD, radio AM/FM y grabadora de casete (Negro)", "https://www.amazon.com/-/es/Elikliv-EDM202-Microscopio-microscopio-profesional/dp/B09ZY12GPX", "LINK WEB: https://www.inovamusicnet.com/producto/dell-monitor-de-juegos-de-240-hz-de-24-5-pulgadas-full-hd-monitor-con-tecnologia-ips-pantalla-antirreflejante-gris-metalico-oscuro-s2522hg-%f0%9f%a5%87%e2%9c%94%ef%b8%8f-a-pedido/ Hola que tal? Quiero consultar por el Producto:  * Dell S2522HG Monitor Gaming 240Hz 24.5 Pulgadas Full HD con Tecnología IPS, Pantalla Antirreflejo, Gris Oscuro 🥇✔️ ®️ A Pedido 🏆™️ (SKU: b095tvwl6m)")

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
