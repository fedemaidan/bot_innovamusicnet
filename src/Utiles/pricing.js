const KeepaConfigService = require("./KeepaConfigService");
const DEBUG = process.env.PRICE_DEBUG === "1" || process.env.PRICE_DEBUG === "true";

async function calcularPrecio({ newPrice, packageWeight, categoryTree }) {
  const config = await KeepaConfigService.obtenerConfiguracion();
  if (DEBUG) {
    console.log("[pricing.calcularPrecio] inputs:", { newPrice, packageWeight, categoryTreeLen: Array.isArray(categoryTree) ? categoryTree.length : null });
    console.log("[pricing.calcularPrecio] config:", config);
  }

  const specialOld = [13896617011, 2642129011, 193870011];
  const specialNew = [172421, 4943760011, 11910405011];

  const isOld = categoryTree.some((c) => specialOld.includes(c.catId));
  const isNew = categoryTree.some((c) => specialNew.includes(c.catId));
  if (DEBUG) console.log("[pricing.calcularPrecio] isOld/isNew:", { isOld, isNew });

  const costoAdicional =
    newPrice / 100 > 1000
      ? (newPrice / 100 - 1000) * 1.01 + 1000
      : newPrice / 100;
  if (DEBUG) console.log("[pricing.calcularPrecio] costoAdicional:", costoAdicional);

  const ratio = isOld ? config.RATIOC : isNew ? config.RATIOP : config.RATION;

  let calculo =
    costoAdicional * ratio * config.DOLAROPERATIVO * config.RECARGOTARJETA +
    (packageWeight / 1000) *
      config.FLETEXKG *
      config.DOLAROFICIAL *
      config.RECARGOTARJETA +
    config.COSTOFIJO * config.DOLAROFICIAL * config.RECARGOTARJETA;
  if (DEBUG) console.log("[pricing.calcularPrecio] metodoActual unico ratio:", { ratio, calculo });

  const transferencia = Math.floor(calculo * config.DESCTRANSFERENCIA);

  calculo = Math.floor(calculo);
  if (DEBUG) console.log("[pricing.calcularPrecio] resultados:", {
    tarjeta: calculo,
    transferencia,
    transferenciaUSD: Math.floor(transferencia / config.DOLARINOVA),
    efectivoUSD: Math.floor((calculo * config.DESCEFECTIVO) / config.DOLARINOVA),
    express: Math.floor(calculo * 0.1),
  });
  return {
    tarjeta: calculo,
    transferencia,
    transferenciaUSD: Math.floor(transferencia / config.DOLARINOVA),
    efectivoUSD: Math.floor(
      (calculo * config.DESCEFECTIVO) / config.DOLARINOVA
    ),
    express: Math.floor(calculo * 0.1),
  };
}

async function calcularPrecioNuevoMetodo({
  newPrice,
  packageWeight,
  categoryTree,
}) {
  const config = await KeepaConfigService.obtenerConfiguracion();
  if (DEBUG) {
    console.log("[pricing.calcularPrecioNuevoMetodo] inputs:", { newPrice, packageWeight, categoryTreeLen: Array.isArray(categoryTree) ? categoryTree.length : null });
    console.log("[pricing.calcularPrecioNuevoMetodo] config:", config);
  }

  // Validar que las variables de configuración existan
  if (!config.RATIOKG) {
    console.error("RATIOKG no está configurado en la base de datos");
    // Fallback a la función original si RATIOKG no existe
    const calcularPrecio = require("./pricing").calcularPrecio;
    return await calcularPrecio({ newPrice, packageWeight, categoryTree });
  }

  // Arrays actualizados con más categorías
  const specialOld = [
    13896617011, 2642129011, 193870011, 1292110011, 281052, 3109924011, 3017941,
  ];
  const specialNew = [
    172421, 4943760011, 11910405011, 7161075011, 7161091011, 3350161,
    11608080011, 172659, 6427814011, 294940, 6469269011, 16227128011, 3443921,
    3347871, 1292115011,
  ];

  const isOld = categoryTree.some((c) => specialOld.includes(c.catId));
  const isNew = categoryTree.some((c) => specialNew.includes(c.catId));
  if (DEBUG) console.log("[pricing.calcularPrecioNuevoMetodo] isOld/isNew:", { isOld, isNew, specialOldLen: specialOld.length, specialNewLen: specialNew.length });

  const costoAdicional =
    newPrice / 100 > 1000
      ? (newPrice / 100 - 1000) * 1.01 + 1000
      : newPrice / 100;
  if (DEBUG) console.log("[pricing.calcularPrecioNuevoMetodo] costoAdicional:", costoAdicional);

  // Validar que los valores no sean NaN
  if (isNaN(costoAdicional) || isNaN(packageWeight)) {
    console.error("Valores inválidos:", {
      newPrice,
      packageWeight,
      costoAdicional,
    });
    throw new Error("Valores de entrada inválidos para el cálculo de precios");
  }

  // Validar que las variables de configuración existan y no sean NaN
  const configVars = [
    "RATIOC",
    "RATIOP",
    "RATION",
    "RATIOKG",
    "DOLAROPERATIVO",
    "DOLAROFICIAL",
    "RECARGOTARJETA",
    "FLETEXKG",
    "COSTOFIJO",
    "DESCTRANSFERENCIA",
    "DOLARINOVA",
    "DESCEFECTIVO",
  ];
  for (const varName of configVars) {
    if (!config[varName] || isNaN(config[varName])) {
      console.error(
        `Variable de configuración inválida: ${varName} = ${config[varName]}`
      );
      throw new Error(`Variable de configuración inválida: ${varName}`);
    }
  }

  // Método ACTUAL (por categorías)
  let metodoActual;
  if (isOld) {
    metodoActual =
      costoAdicional *
        config.RATIOC *
        config.DOLAROPERATIVO *
        config.RECARGOTARJETA +
      (packageWeight / 1000) *
        config.FLETEXKG *
        config.DOLAROFICIAL *
        config.RECARGOTARJETA +
      config.COSTOFIJO * config.DOLAROFICIAL * config.RECARGOTARJETA;
  } else if (isNew) {
    metodoActual =
      costoAdicional *
        config.RATIOP *
        config.DOLAROPERATIVO *
        config.RECARGOTARJETA +
      (packageWeight / 1000) *
        config.FLETEXKG *
        config.DOLAROFICIAL *
        config.RECARGOTARJETA +
      config.COSTOFIJO * config.DOLAROFICIAL * config.RECARGOTARJETA;
  } else {
    metodoActual =
      costoAdicional *
        config.RATION *
        config.DOLAROPERATIVO *
        config.RECARGOTARJETA +
      (packageWeight / 1000) *
        config.FLETEXKG *
        config.DOLAROFICIAL *
        config.RECARGOTARJETA +
      config.COSTOFIJO * config.DOLAROFICIAL * config.RECARGOTARJETA;
  }
  if (DEBUG) console.log("[pricing.calcularPrecioNuevoMetodo] metodoActual:", metodoActual);

  // Método ALTERNATIVO (RATIOKG + DOLARINOVA)
  const metodoKg =
    costoAdicional *
      config.RATIOKG *
      config.DOLAROFICIAL *
      config.RECARGOTARJETA +
    (packageWeight / 1000) * 50 * config.DOLAROFICIAL * config.RECARGOTARJETA +
    config.COSTOFIJO * config.DOLAROFICIAL * config.RECARGOTARJETA;
  if (DEBUG) console.log("[pricing.calcularPrecioNuevoMetodo] metodoKg:", metodoKg);

  // Elegimos el menor
  let calculo = Math.min(metodoActual, metodoKg);
  const usoMetodoKg = calculo === metodoKg;
  if (DEBUG) console.log("[pricing.calcularPrecioNuevoMetodo] min/metodo usado:", { calculo, usoMetodoKg });

  const transferencia = Math.floor(calculo * config.DESCTRANSFERENCIA);

  calculo = Math.floor(calculo);
  if (DEBUG) console.log("[pricing.calcularPrecioNuevoMetodo] resultados:", {
    tarjeta: calculo,
    transferencia,
    transferenciaUSD: Math.floor(transferencia / config.DOLARINOVA),
    efectivoUSD: Math.floor((calculo * config.DESCEFECTIVO) / config.DOLARINOVA),
    express: Math.floor(calculo * 0.1)
  });

  return {
    tarjeta: calculo,
    transferencia,
    transferenciaUSD: Math.floor(transferencia / config.DOLARINOVA),
    efectivoUSD: Math.floor(
      (calculo * config.DESCEFECTIVO) / config.DOLARINOVA
    ),
    express: Math.floor(calculo * 0.1),
    // Información adicional para debugging
    metodoActual: Math.floor(metodoActual),
    metodoKg: Math.floor(metodoKg),
    usoMetodoKg: usoMetodoKg,
    costoAdicional: costoAdicional,
    isOld: isOld,
    isNew: isNew,
  };
}

module.exports = { calcularPrecio, calcularPrecioNuevoMetodo };
