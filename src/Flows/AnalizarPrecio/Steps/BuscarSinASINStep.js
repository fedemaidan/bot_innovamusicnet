const FlowManager = require("../../../FlowControl/FlowManager");
const { getProductByWebSearch } = require("../../../services/Chatgpt/Base");
const sockSingleton = require("../../../services/SockSingleton/sockSingleton");
const {
  extractASINFromAmazonLink,
} = require("../../../Utiles/Mensajes/mensajesMariano");
const BuscarConASINStep = require("./BuscarConASINStep");

module.exports = async function BuscarSinASIN(userId, data) {
  console.log("BuscarSinASINStep", data);
  const sock = sockSingleton.getSock();

  sock.sendMessage(userId, {
    text: "Buscando producto sin ASIN ...",
  });

  const linkAmazon = await getProductByWebSearch(data.producto);

  if (linkAmazon.includes("amazon")) {
    const asin = extractASINFromAmazonLink(linkAmazon);
    console.log("ASIN extraido:", asin);

    if (asin) {
      await BuscarConASINStep(userId, {
        asin,
        producto: data.producto,
        linkWebSearch: linkAmazon,
        retry: false,
      });
    } else {
      sock.sendMessage(userId, {
        text: "No se pudo extraer el ASIN del link de Amazon",
      });
      FlowManager.resetFlow(userId);
    }
  }
};
