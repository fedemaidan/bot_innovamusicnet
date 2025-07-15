const express = require("express");
const {
  handleCSVCodigosToJSON,
  escribirResultadoExitoso,
  escribirResultadoError,
} = require("../Utiles/csv/csvHandler");
const { MercadoLibreAPI } = require("../Utiles/MercadoLibreAPI");
const { scrapeMeliPrices } = require("../Utiles/webScrapping");
const { router: keepaRoutes } = require("./keepaRoutes");
const { calcularEstadisticas } = require("../Utiles/calcularEstadisticas");
const { delay } = require("../Utiles/helpersScrapping");
const { router: whatsappRoutes } = require("../services/Mensajes/whatsapp");

const router = express.Router();

async function obtenerPrecioMinimo(gtin, nombre = "", precioMinimo = 0) {
  try {
    const precioMinimoNum = parseFloat(precioMinimo) || 0;
    const prices = await scrapeMeliPrices(gtin, 1, precioMinimoNum, nombre);

    if (!prices.success) {
      return {
        success: false,
        error: prices.error,
        gtin,
      };
    }

    if (prices.title && prices.price) {
      return {
        success: true,
        gtin,
        searchTerm: prices.searchTerm,
        title: prices.title,
        price: prices.price,
        link: prices.link,
        productId: prices.productId,
        seller_id: prices.seller_id,
        item_id: prices.item_id,
        seller_nickname: prices.seller_nickname,
        seller_data: prices.seller_data,
        shipping_options: prices.shipping_options,
      };
    }

    if (Array.isArray(prices) && prices[0] && prices[0].results) {
      const results = [];
      prices[0].results.forEach((price) => {
        results.push({
          title: price.title,
          price: price.price,
          link: price.link,
          productId: price.productId,
        });
      });
      return {
        success: true,
        gtin,
        results,
      };
    }

    return {
      success: false,
      message: prices.error || "No se encontraron resultados",
      gtin,
    };
  } catch (error) {
    console.error(`Error procesando GTIN ${gtin}:`, error);
    return {
      success: false,
      error: error.message,
      gtin,
    };
  }
}

router.get("/precios-gtin", async (req, res) => {
  const { gtin } = req.query;

  if (!gtin) {
    return res.status(400).json({ error: "gtin es requerido" });
  }

  try {
    const api = MercadoLibreAPI.getInstance();
    const resultado = await api.getProductPriceByGTIN(gtin);

    const estadisticas = calcularEstadisticas(resultado.results);

    res.json({
      gtin,
      estadisticas,
      productsFound: resultado.productsFound,
      itemsFound: resultado.itemsFound,
      results: resultado.results,
    });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

//194252705391 iphone 13 128gb midnight
router.get("/precio-minimo-gtin", async (req, res) => {
  const { gtin, zip_code = "1100", include_global = false } = req.query;
  // include_global: true -> busca en CBT (Global Selling) | false -> busca en MLA (Argentina local)

  if (!gtin) {
    return res.status(400).json({ error: "gtin es requerido" });
  }

  try {
    const api = MercadoLibreAPI.getInstance();
    const resultado = await api.getProductPriceByGTIN(gtin, { include_global });

    if (!resultado.results || resultado.results.length === 0) {
      return res.json({
        precioMinimo: null,
        mensaje: "No se encontraron productos",
      });
    }

    resultado.results.sort((a, b) => a.price - b.price);

    let itemConPrecioMinimo = null;
    let sellerReputation = null;

    // Buscar el primer item con precio mínimo que cumpla con la reputación 5_green
    for (const item of resultado.results) {
      try {
        console.log("itemResult", item);
        const reputation = await api.getSellerReputation(item.seller_id);
        console.log("sellerReputation", reputation);
        if (
          reputation.seller_reputation &&
          reputation.seller_reputation.level_id === "5_green"
        ) {
          itemConPrecioMinimo = item;
          sellerReputation = reputation;
          break;
        }
      } catch (error) {
        console.log(
          `Error obteniendo reputación del vendedor ${item.seller_id}:`,
          error.message
        );
        continue;
      }
    }

    if (!itemConPrecioMinimo) {
      return res.json({
        mensaje:
          "No se encontraron productos con vendedores de reputación 5_green",
      });
    }

    const precioMinimo = itemConPrecioMinimo.price;
    const itemId = itemConPrecioMinimo.item_id;

    let shippingOptions = null;
    try {
      const shippingResponse = await api.getShippingOptions(itemId, zip_code);
      shippingOptions = shippingResponse;
    } catch (error) {
      console.log(
        `Error obteniendo opciones de envío para item ${itemId}:`,
        error.message
      );
      shippingOptions = {
        error: "No se pudieron obtener las opciones de envío",
      };
    }

    res.json({
      precioMinimo,
      gtin,
      itemId,
      itemDetail: itemConPrecioMinimo,
      sellerReputation,
      shippingOptions,
      productDetails: resultado.productDetails,
      totalResultados: resultado.results.length,
      resultadosFiltrados: resultado.results.length,
      include_global,
      site_id: include_global ? "CBT" : "MLA",
    });
  } catch (error) {
    console.error("Error al obtener precio mínimo por GTIN:", error);
    res.status(500).json({ error: "Error al obtener precio mínimo por GTIN" });
  }
});

//upc, texto, minPrice
router.get("/precioMinimo", async (req, res) => {
  const { asin, nombre, precioMinimo } = req.query;

  if (!asin) {
    return res.status(400).json({ error: "asin es requerido" });
  }

  try {
    const resultado = await obtenerPrecioMinimo(asin, nombre, precioMinimo);

    if (resultado.success) {
      if (resultado.title && resultado.price) {
        return res.json({
          mensaje: "Producto encontrado con un vendedor con mas de 10 ventas",
          result: {
            searchTerm: resultado.searchTerm,
            title: resultado.title,
            price: resultado.price,
            link: resultado.link,
            productId: resultado.productId,
            seller_id: resultado.seller_id,
            item_id: resultado.item_id,
            seller_nickname: resultado.seller_nickname,
            seller_data: resultado.seller_data,
            shipping_options: resultado.shipping_options,
          },
        });
      }

      // Si es un array de resultados
      if (resultado.results) {
        return res.json(resultado.results);
      }
    } else {
      return res.json({
        mensaje: resultado.error,
        results: [],
      });
    }

    return res.json({
      mensaje: "No se encontraron resultados para el GTIN proporcionado",
      results: [],
    });
  } catch (error) {
    console.error(`Error en endpoint precioMinimo para ASIN ${asin}:`, error);
    return res.status(500).json({
      error: "Error interno del servidor",
      mensaje: error.message,
    });
  }
});

// Endpoint para procesar múltiples GTINs
router.get("/precioMinimos", async (req, res) => {
  const tiempoInicio = Date.now();
  const { gtins = [], nombre = "", precioMinimo = 0 } = req.body;

  if (!gtins.length) {
    return res.status(400).json({
      error: "Se requiere un array de GTINs",
    });
  }

  console.log("Procesando GTINs:", gtins);

  const resultados = {};
  let procesados = 0;
  let exitosos = 0;

  for (const gtin of gtins) {
    try {
      console.log(`Procesando GTIN ${procesados + 1}/${gtins.length}: ${gtin}`);
      const resultado = await obtenerPrecioMinimo(gtin, nombre, precioMinimo);

      resultados[gtin] = resultado;

      if (resultado.success) {
        exitosos++;
      }

      procesados++;

      // Pequeña pausa entre requests para evitar sobrecarga
      if (procesados < gtins.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error procesando GTIN ${gtin}:`, error);
      resultados[gtin] = {
        success: false,
        error: error.message,
        gtin,
      };
      procesados++;
    }
  }

  const tiempoTotal = Date.now() - tiempoInicio;

  // Calcular estadísticas
  const estadisticas = {
    total: gtins.length,
    procesados,
    exitosos,
    fallidos: procesados - exitosos,
    tasa_exito:
      procesados > 0 ? `${Math.round((exitosos / procesados) * 100)}%` : "0%",
    tiempo: `${Math.round((tiempoTotal / 1000) * 100) / 100} segundos`,
  };

  res.json({
    estadisticas,
    resultados,
  });
});

router.get("/comparar-precios", async (req, res) => {
  const tiempoInicio = Date.now();

  const asins = handleCSVCodigosToJSON();

  if (!asins.length) {
    return res.status(400).json({
      error: "No se pudieron leer códigos del CSV",
    });
  }

  const resultados = {
    mercadolibre: [],
    timestamp: new Date().toISOString(),
  };

  if (asins.length > 0) {
    for (const asin of asins) {
      try {
        const randomDelay = Math.random() * 5000 + 4000; // 3-8 segundos
        await delay(randomDelay);
        const resultado = await obtenerPrecioMinimo(asin, "", 0);

        if (resultado.success) {
          escribirResultadoExitoso(
            asin,
            resultado.price,
            resultado.title,
            resultado.link || ""
          );

          resultados.mercadolibre.push({
            asin,
            ...resultado,
          });
        } else {
          escribirResultadoError(
            asin,
            resultado.error || resultado.message || "Error desconocido"
          );

          resultados.mercadolibre.push({
            asin,
            error: resultado.error,
          });
        }
      } catch (error) {
        console.error(`Error procesando ASIN ${asin}:`, error);

        escribirResultadoError(asin, error.message);

        resultados.mercadolibre.push({
          asin,
          success: false,
          error: error.message,
        });
      }
    }
  }

  // Calcular estadísticas
  const mlExitosos = resultados.mercadolibre.filter((r) => r.success);

  const tiempoTotal = Date.now() - tiempoInicio;

  const estadisticas = {
    mercadolibre: {
      total: resultados.mercadolibre.length,
      exitosos: mlExitosos.length,
      precio_promedio:
        mlExitosos.length > 0
          ? Math.round(
              mlExitosos.reduce((sum, r) => sum + r.precio, 0) /
                mlExitosos.length
            )
          : 0,
      precio_minimo:
        mlExitosos.length > 0
          ? Math.min(...mlExitosos.map((r) => r.precio))
          : 0,
      precio_maximo:
        mlExitosos.length > 0
          ? Math.max(...mlExitosos.map((r) => r.precio))
          : 0,
    },
    tiempo: `${Math.round((tiempoTotal / 1000) * 100) / 100} segundos`,
    tiempo_promedio_por_item_ms:
      asins.length > 0 ? Math.round(tiempoTotal / asins.length) : 0,
    tiempo_respuesta_ms: tiempoTotal,
  };

  res.json({
    ...resultados,
    estadisticas,
  });
});

router.use("/keepa", keepaRoutes);

router.use("/whatsapp", whatsappRoutes);

module.exports = router;
