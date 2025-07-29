const FlowManager = require("../../../FlowControl/FlowManager");
const { obtenerPrecioKeepa } = require("../../../routes/keepaRoutes");
const {
  addCotizacionToSheet,
} = require("../../../Utiles/Google/Sheets/contizaciones");
const {
  crearMensajePrecios,
} = require("../../../Utiles/Mensajes/mensajesMariano");
const { scrapeMeliPrices } = require("../../../Utiles/webScrapping");

/**
 {
  asin,
  asinRegular,
  producto,
  link,
  linkRegular,
  retry?: boolean 
  linkWebSearch?: string
 }
 */

module.exports = async function BuscarConASINStep(userId, data) {
  console.log("BuscarConASINStep", data);
  const sockSingleton = require("../../../services/SockSingleton/sockSingleton");
  const sock = sockSingleton.getSock();
  const phoneNumber = userId.split("@")[0];
  const asin = data.asinRegular || data.asin;
  const link = data.linkRegular || data.link;

  const resultadoKeepa = await obtenerPrecioKeepa(asin);
  const resultadoMeli = await scrapeMeliPrices(asin);

  console.log("resultadoKeepa", resultadoKeepa);
  console.log("resultadoMeli", resultadoMeli);

  if (resultadoKeepa && resultadoKeepa.success) {
    const mensajePrecios = await crearMensajePrecios(resultadoKeepa);
    await addCotizacionToSheet({
      link: link || "",
      asin,
      precioKeepa: resultadoKeepa.precios_calculados.efectivoUSD,
      precioMeli: resultadoMeli.price,
      linkMeli: resultadoMeli.link,
      linkWebSearch: data.linkWebSearch || "",
      phoneNumber,
    });
    await sock.sendMessage(userId, {
      text: mensajePrecios,
    });
  } else if (
    !resultadoKeepa.success &&
    resultadoKeepa.error === "No disponible en Amazon" &&
    !data.retry
  ) {
    FlowManager.setFlow(
      userId,
      "ANALIZAR_PRECIO",
      "BuscarProductoSimilarStep",
      {
        producto: data.producto,
      }
    );
  } else {
    console.log("ERROR EN KEEPPA");
    console.log(resultadoKeepa);
  }
};
