const { getProductByWebSearch } = require("../../../services/Chatgpt/Base");

module.exports = async function BuscarSinASIN(userId, data) {
  console.log("BuscarSinASINStep", data);

  const linkAmazon = await getProductByWebSearch(data.producto);

  if (linkAmazon.includes("amazon")) {
    const asin = extractASINFromAmazonLink(linkAmazon);
    console.log("ASIN extraido:", asin);

    if (asin) {
      FlowManager.setFlow(userId, "ANALIZAR_PRECIO", "BuscarConASINStep", {
        asin,
        producto: data.producto,
        retry: false,
      });
    }
  }
};
