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
  retry?: number 
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
  const retry = data.retry;

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
      text: `${mensajePrecios} \n\n ${
        data.linkWebSearch
          ? "*link del producto alternativo de web search:* \n" +
            data.linkWebSearch
          : ""
      }`,
    });
    FlowManager.resetFlow(userId);
  } else if (
    !resultadoKeepa.success &&
    resultadoKeepa.error === "No disponible en Amazon" &&
    retry > 0
  ) {
    sock.sendMessage(userId, {
      text: `Producto no encontrado en Amazon, buscando producto alternativo a ${
        resultadoKeepa.titulo
      }.. \n\n *${retry - 1} intentos restantes*`,
    });
    await BuscarProductoSimilarStep(userId, {
      producto: resultadoKeepa.titulo,
      link: data?.linkWebSearch || data?.link || "",
      retry: retry - 1,
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
