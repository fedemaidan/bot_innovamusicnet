const FlowManager = require("../../../FlowControl/FlowManager");
const { obtenerPrecioKeepa } = require("../../../routes/keepaRoutes");
const {
  addCotizacionToSheet,
} = require("../../../Utiles/Google/Sheets/contizaciones");
const KeepaConfigService = require("../../../Utiles/KeepaConfigService");
const {
  crearMensajePrecios,
  enviarMensajePrueba,
  manejarDelayInteligente,
} = require("../../../Utiles/Mensajes/mensajesMariano");
const { scrapeMeliPrices } = require("../../../Utiles/webScrapping");

module.exports = async function BuscarConASINStep(userId, data) {
  const BuscarProductoSimilarStep = require("./BuscarProductoSimilarStep");
  const sockSingleton = require("../../../services/SockSingleton/sockSingleton");
  console.log("BuscarConASINStep", data);
  const sock = sockSingleton.getSock();
  const phoneNumber = userId.split("@")[0];
  const asins = data.asins;
  const lastAsin = asins?.at(-1);
  const linksAmazon = data.linksAmazon;
  const lastLinkAmazon = linksAmazon?.at(-1);
  const linkInova = data?.linkInova || "";
  const titulos = data?.titulos || [];
  const features = data?.features || [];
  const lastTitulo = titulos?.at(-1) || "";
  const retry = data.retry;

  await enviarMensajePrueba(
    userId,
    `Buscando producto con el codigo ASIN ${lastAsin} ...`
  );

  const resultadoKeepa = await obtenerPrecioKeepa(lastAsin);
  console.log("resultadoKeepa", resultadoKeepa);

  if (resultadoKeepa && resultadoKeepa.success) {
    await enviarMensajePrueba(
      userId,
      `Producto encontrado en Amazon: ${resultadoKeepa.titulo}`
    );

    const mensajePrecios = await crearMensajePrecios(asins, resultadoKeepa);
    const resultadoMeli = await scrapeMeliPrices(lastAsin);
    console.log("resultadoMeli", resultadoMeli);
    await addCotizacionToSheet({
      link: linkInova || "",
      asin: lastAsin,
      precioKeepa: resultadoKeepa.precios_calculados.efectivoUSD,
      precioMeli: resultadoMeli.price,
      linkMeli: resultadoMeli.link,
      linkWebSearch: lastLinkAmazon || "",
      phoneNumber,
    });
    await enviarMensajePrueba(
      userId,
      `${
        lastTitulo ? lastTitulo + "\n" : ""
      } ${lastLinkAmazon} \n DISPONIBILIDAD: SI`
    );

    await manejarDelayInteligente(userId, data.inicio);

    for (const mensaje of mensajePrecios) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        await sock.sendMessage(userId, {
          text: mensaje,
          linkPreview: false,
        });
      } catch (error) {
        console.error("Error al enviar mensaje:", error);
      }
    }
    FlowManager.resetFlow(userId);
  } else if (
    !resultadoKeepa.success &&
    resultadoKeepa.error === "No disponible en Amazon" &&
    retry > 0
  ) {
    await enviarMensajePrueba(
      userId,
      `${
        lastTitulo ? lastTitulo + "\n" : ""
      } ${lastLinkAmazon} \n DISPONIBILIDAD: NO`
    );
    await BuscarProductoSimilarStep(userId, {
      titulos: [...titulos, resultadoKeepa.titulo],
      features: [...features, resultadoKeepa.features],
      asins,
      linksAmazon,
      retry: retry - 1,
      inicio: data.inicio,
    });
  } else if (
    retry <= 0 &&
    !resultadoKeepa.success &&
    resultadoKeepa.error === "No disponible en Amazon"
  ) {
    sock.sendMessage(userId, {
      text: "No se pudo encontrar el producto en Amazon. Maximo de intentos alcanzados",
    });
    FlowManager.resetFlow(userId);
  } else {
    sock.sendMessage(userId, {
      text: "Error al obtener el precio de Amazon" + resultadoKeepa,
    });
    console.log("ERROR EN KEEPPA");
    console.log(resultadoKeepa);
    FlowManager.resetFlow(userId);
  }
};
