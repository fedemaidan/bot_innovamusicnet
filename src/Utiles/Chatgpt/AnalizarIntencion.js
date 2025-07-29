const { getByChatGpt4o } = require("../../services/Chatgpt/Base");

const opciones = [
  {
    //permiso: "accion1",  permisos necesarios para acceder a esta accion en particular. Se cargan en la BD tabla usuarios (permisos: json).
    accion: "Info Precio",
    descripcion: "Obtener el precio o informacion de un producto.",
    data: {
      asin: "ASIN del producto. (suele estas seguido de 'SKU:')",
      link: "Link del producto.",
      producto: "Nombre completo del producto.",
    },
  },
  {
    // Si no existe un atributo permiso la accion puede ser ejecutada por cualquiera.
    accion: "No comprendido",
    descripcion:
      "El usuario envió un mensaje donde no se puede obtener informacion de un producto, es un mensaje parte de una conversacion normal.",
    data: {
      Default: "El usuario envió un mensaje que no se puede procesar.",
    },
  },
];

const analizarIntencion = async (message, sender) => {
  try {
    //------------------------- LOGICA DE CHAT GPT-----------------------------//
    const opcionesTxt = JSON.stringify(opciones);

    //los promt comprenden el 90% de que la informacion se valide y busque de buena manera.
    //Recomendacion: llena el formulario pre cargado con lo necesario.
    const prompt = `
Descripcion: como un bot de un sistema de deteccion de precios productos, debes analizar la intencion del usuario y elegir la opcion mas apropiada.
Formato de respuesta: devuelve el json, de la opcion elegida tal cual esta sin mensajes extras.
Advertencia: corrige el texto del mensaje del usuario.
Resumen del contexto: es una prueba flujo
El usuario dice: "${message}"

Tienes estas acciones posibles. Debes analizar la palabra clave del usuario: ${opcionesTxt}.
`;

    const response = await getByChatGpt4o(prompt);
    const respuesta = JSON.parse(response);

    //Chat gpt toma el prompt y nos devuelve un json con la informacion que le requerimos
    //Acciones realizables por chatgpt:
    // coincidencia de articulos(busqueda de stock), Calculos avanzados(existencias y moviemientos), Analizar intencion(que necesita el usuario)
    return respuesta?.json_data || respuesta;
  } catch (error) {
    console.error("Error al analizar la intención:", error.message);
    return { accion: "No comprendido" };
  }
};

module.exports = { analizarIntencion };
