const FlowManager = require("../../../FlowControl/FlowManager");
const { getProductByWebSearch } = require("../../../services/Chatgpt/Base");
const KeepaConfigService = require("../../../Utiles/KeepaConfigService");
const {
  extractASINFromAmazonLink,
} = require("../../../Utiles/Mensajes/mensajesMariano");

module.exports = async function BuscarProductoSimilarStep(userId, data) {
  const BuscarConASINStep = require("./BuscarConASINStep");
  console.log("BuscarConASINStep type:", typeof BuscarConASINStep);
  console.log("BuscarConASINStep:", BuscarConASINStep);
  console.log("BuscarProductoSimilarStep", data);
  const sockSingleton = require("../../../services/SockSingleton/sockSingleton");
  const sock = sockSingleton.getSock();

  sock.sendMessage(userId, {
    text: "Buscando producto alternativo ...",
  });

  const mensajes = await KeepaConfigService.obtenerMensajesConfiguracion();

  const linkAmazonNoDisponible = data?.link?.includes("amazon")
    ? data.link
    : "";

  sock.sendMessage(userId, {
    text:
      "*input del web search: * \n" +
      data.producto +
      (linkAmazonNoDisponible ? " " + linkAmazonNoDisponible : ""),
  });
  const linkAmazon = await getProductByWebSearch(
    data.producto + " " + linkAmazonNoDisponible
  );

  console.log("linkAmazon", linkAmazon);
  if (!linkAmazon || (linkAmazon && !linkAmazon.startsWith("https"))) {
    await sock.sendMessage(userId, {
      text: "No se pudo encontrar un producto alternativo",
    });

    FlowManager.resetFlow(userId);
    return;
  }

  if (linkAmazon.includes("amazon")) {
    const asin = extractASINFromAmazonLink(linkAmazon);
    console.log("ASIN extraido:", asin);

    if (asin) {
      BuscarConASINStep(userId, {
        asin,
        producto: data.producto,
        retry: data.retry,
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
