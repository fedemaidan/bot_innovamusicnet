const FlowManager = require("../../../FlowControl/FlowManager");
const { getProductByWebSearch } = require("../../../services/Chatgpt/Base");
const {
  extractASINFromAmazonLink,
} = require("../../../Utiles/Mensajes/mensajesMariano");
const BuscarConASINStep = require("./BuscarConASINStep");

module.exports = async function BuscarSinASIN(userId, data) {
  console.log("BuscarSinASINStep", data);

  const linkAmazon = await getProductByWebSearch(data.producto);

  if (linkAmazon.includes("amazon")) {
    const asin = extractASINFromAmazonLink(linkAmazon);
    console.log("ASIN extraido:", asin);

    if (asin) {
      BuscarConASINStep(userId, {
        asin,
        producto: data.producto,
        linkWebSearch: linkAmazon,
        retry: false,
      });
    } else {
      FlowManager.resetFlow(userId);
    }
  }
};
