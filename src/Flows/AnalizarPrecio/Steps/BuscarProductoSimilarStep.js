const FlowManager = require("../../../FlowControl/FlowManager");
const { getProductByWebSearch } = require("../../../services/Chatgpt/Base");
const KeepaConfigService = require("../../../Utiles/KeepaConfigService");
const {
  extractASINFromAmazonLink,
  enviarMensajePrueba,
} = require("../../../Utiles/Mensajes/mensajesMariano");

module.exports = async function BuscarProductoSimilarStep(userId, data) {
  const BuscarConASINStep = require("./BuscarConASINStep");
  console.log("BuscarConASINStep type:", typeof BuscarConASINStep);
  console.log("BuscarConASINStep:", BuscarConASINStep);
  console.log("BuscarProductoSimilarStep", data);
  const sockSingleton = require("../../../services/SockSingleton/sockSingleton");
  const sock = sockSingleton.getSock();
  const asins = data.asins;
  const titulos = data.titulos;
  const features = data.features;
  const linksAmazon = data.linksAmazon;
  await enviarMensajePrueba(userId, "Buscando producto alternativo ...");

  const mensajes = await KeepaConfigService.obtenerMensajesConfiguracion();

  await enviarMensajePrueba(
    userId,
    "*links y codigos para el web search: * \n" +
      linksAmazon.join(" ||| \n") +
      "\n" +
      titulos.join(" ||| \n") +
      "\n" +
      features.join(" ||| \n")
  );
  const linkAmazon = await getProductByWebSearch(
    titulos,
    linksAmazon,
    features
  );

  console.log("linkAmazon", linkAmazon);
  if (!linkAmazon || (linkAmazon && !linkAmazon.startsWith("https"))) {
    await enviarMensajePrueba(
      userId,
      "No se pudo encontrar un producto alternativo"
    );

    FlowManager.resetFlow(userId);
    return;
  }

  if (linkAmazon.includes("amazon")) {
    const asin = extractASINFromAmazonLink(linkAmazon);
    console.log("ASIN extraido:", asin);

    if (asin) {
      BuscarConASINStep(userId, {
        asins: [...asins, asin],
        linksAmazon: [...linksAmazon, linkAmazon],
        features,
        titulos,
        retry: data.retry,
        inicio: data.inicio,
        didWebSearch: data.didWebSearch,
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
