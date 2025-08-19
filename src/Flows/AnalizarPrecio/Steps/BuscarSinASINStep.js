const FlowManager = require("../../../FlowControl/FlowManager");
const { getProductByWebSearch } = require("../../../services/Chatgpt/Base");
const sockSingleton = require("../../../services/SockSingleton/sockSingleton");
const {
  extractASINFromAmazonLink,
  enviarMensajePrueba,
} = require("../../../Utiles/Mensajes/mensajesMariano");
const BuscarConASINStep = require("./BuscarConASINStep");

module.exports = async function BuscarSinASIN(userId, data) {
  console.log("BuscarSinASINStep", data);
  const sock = sockSingleton.getSock();

  await enviarMensajePrueba(userId, "Buscando producto sin ASIN ...");

  const linkAmazon = await getProductByWebSearch(data.producto);

  if (linkAmazon.includes("amazon")) {
    const asin = extractASINFromAmazonLink(linkAmazon);
    console.log("ASIN extraido:", asin);

    if (asin) {
      BuscarConASINStep(userId, {
        asin,
        producto: data.producto,
        linkWebSearch: linkAmazon,
        retry: data.retry - 1,
        inicio: data.inicio,
      });
    } else {
      await enviarMensajePrueba(
        userId,
        "No se pudo extraer el ASIN del link de Amazon"
      );
      FlowManager.resetFlow(userId);
    }
  }
};
