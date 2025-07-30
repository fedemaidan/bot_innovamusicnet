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
  const BuscarProductoSimilarStep = require("./BuscarProductoSimilarStep");
  console.log("BuscarConASINStep", data);
  const sockSingleton = require("../../../services/SockSingleton/sockSingleton");
  const sock = sockSingleton.getSock();
  const phoneNumber = userId.split("@")[0];
  const asin = data.asinRegular || data.asin;
  const link = data.linkRegular || data.link;
  const retry = data?.retry || true;

  sock.sendMessage(userId, {
    text: `Buscando producto con el codigo ASIN ${asin} ...`,
  });

  const resultadoKeepa = await obtenerPrecioKeepa(asin);
  const resultadoMeli = await scrapeMeliPrices(asin);

  console.log("resultadoKeepa", resultadoKeepa);
  console.log("resultadoMeli", resultadoMeli);

  if (resultadoKeepa && resultadoKeepa.success) {
    sock.sendMessage(userId, {
      text: `Producto encontrado en Amazon: ${resultadoKeepa.titulo}`,
    });
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
    FlowManager.resetFlow(userId);
  } else if (
    !resultadoKeepa.success &&
    resultadoKeepa.error === "No disponible en Amazon" &&
    retry
  ) {
    sock.sendMessage(userId, {
      text: `Producto no encontrado en Amazon, buscando producto alternativo a ${resultadoKeepa.titulo}...`,
    });
    await BuscarProductoSimilarStep(userId, {
      producto: resultadoKeepa.titulo,
      link: data.link,
    });
  } else {
    sock.sendMessage(userId, {
      text: "Error al obtener el precio de Amazon" + resultadoKeepa,
    });
    console.log("ERROR EN KEEPPA");
    console.log(resultadoKeepa);
    FlowManager.resetFlow(userId);
  }
};
