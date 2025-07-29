const FlowManager = require("../../../FlowControl/FlowManager");
const { getProductByWebSearch } = require("../../../services/Chatgpt/Base");
const sockSingleton = require("../../../services/SockSingleton/sockSingleton");
const KeepaConfigService = require("../../../Utiles/KeepaConfigService");
const {
  extractASINFromAmazonLink,
} = require("../../../Utiles/Mensajes/mensajesMariano");

module.exports = async function BuscarProductoSimilarStep(userId, data) {
  console.log("BuscarProductoSimilarStep", data);
  const sock = sockSingleton.getSock();
  const mensajes = await KeepaConfigService.obtenerMensajesConfiguracion();

  const linkAmazon = await getProductByWebSearch(data.producto);
  console.log("linkAmazon", linkAmazon);

  if (linkAmazon.includes("amazon")) {
    const asin = extractASINFromAmazonLink(linkAmazon);
    console.log("ASIN extraido:", asin);

    if (asin) {
      BuscarConASINStep(userId, {
        asin,
        producto: data.producto,
        retry: false,
        linkWebSearch: linkAmazon,
      });
    } else {
      console.log("No se pudo extraer el ASIN de la URL");
      await sock.sendMessage(userId, {
        text: mensajes.NO_DISPONIBILIDAD,
      });
      FlowManager.resetFlow(userId);
    }
  }
};
