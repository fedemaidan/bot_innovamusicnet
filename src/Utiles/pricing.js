const KeepaConfigService = require("./KeepaConfigService");

async function calcularPrecio({ newPrice, packageWeight, categoryTree }) {
  const config = await KeepaConfigService.obtenerConfiguracion();
  console.log("configKeepa", config);

  const specialOld = [13896617011, 2642129011, 193870011];
  const specialNew = [172421, 4943760011, 11910405011];

  const isOld = categoryTree.some((c) => specialOld.includes(c.catId));
  const isNew = categoryTree.some((c) => specialNew.includes(c.catId));

  const costoAdicional =
    newPrice / 100 > 1000
      ? (newPrice / 100 - 1000) * 1.01 + 1000
      : newPrice / 100;

  const ratio = isOld ? config.RATIOC : isNew ? config.RATIOP : config.RATION;

  let calculo =
    costoAdicional * ratio * config.DOLAROPERATIVO * config.RECARGOTARJETA +
    (packageWeight / 1000) *
      config.FLETEXKG *
      config.DOLAROFICIAL *
      config.RECARGOTARJETA +
    config.COSTOFIJO * config.DOLAROFICIAL * config.RECARGOTARJETA;

  calculo = Math.floor(calculo);
  return {
    tarjeta: calculo,
    transferencia: Math.floor(calculo * config.DESCTRANSFERENCIA),
    efectivoUSD: Math.floor(
      (calculo * config.DESCEFECTIVO) / config.DOLARINOVA
    ),
  };
}

module.exports = calcularPrecio;
