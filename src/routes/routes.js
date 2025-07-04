const express = require("express");
const { MercadoLibreAPI } = require("../Utiles/MercadoLibreAPI");
const { scrapeMeliPrices } = require("../Utiles/webScrapping");

const router = express.Router();

const calcularEstadisticas = (results) => {
  if (!results || results.length === 0) {
    return null;
  }

  const precios = results.map((item) => item.price).sort((a, b) => a - b);

  const cantidad = precios.length;
  const precioMinimo = precios[0];
  const precioMaximo = precios[cantidad - 1];
  const rango = Math.round(precioMaximo - precioMinimo);

  // Media
  const suma = precios.reduce((acc, precio) => acc + precio, 0);
  const media = Math.round(suma / cantidad);

  // Mediana
  let mediana;
  if (cantidad % 2 === 0) {
    mediana = Math.round(
      (precios[cantidad / 2 - 1] + precios[cantidad / 2]) / 2
    );
  } else {
    mediana = precios[Math.floor(cantidad / 2)];
  }

  return {
    cantidad,
    precioMinimo,
    precioMaximo,
    rango,
    media,
    mediana,
  };
};

router.get("/precios-query", async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "q es requerido" });
  }

  try {
    const api = MercadoLibreAPI.getInstance();
    const resultado = await api.getProductPriceByQuery(q);

    const estadisticas = calcularEstadisticas(resultado.results);

    res.json({
      query: q,
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

router.get("/precio-minimo-query", async (req, res) => {
  const { q, condition, international_delivery_mode } = req.query;

  if (!q) {
    return res.status(400).json({ error: "q es requerido" });
  }

  try {
    const api = MercadoLibreAPI.getInstance();
    const resultado = await api.getProductPriceByQuery(q);

    if (!resultado.results || resultado.results.length === 0) {
      return res.json({
        precioMinimo: null,
        mensaje: "No se encontraron productos",
      });
    }

    let resultadosFiltrados = resultado.results;

    if (condition) {
      resultadosFiltrados = resultadosFiltrados.filter(
        (item) => item.condition === condition
      );
    }

    if (international_delivery_mode) {
      resultadosFiltrados = resultadosFiltrados.filter(
        (item) =>
          item.international_delivery_mode === international_delivery_mode
      );
    }

    if (resultadosFiltrados.length === 0) {
      return res.json({
        precioMinimo: null,
        mensaje: "No se encontraron productos con los filtros especificados",
        filtrosAplicados: {
          condition,
          international_delivery_mode,
        },
      });
    }

    const itemConPrecioMinimo = resultadosFiltrados.reduce((min, item) =>
      item.price < min.price ? item : min
    );

    const precioMinimo = itemConPrecioMinimo.price;
    const itemId = itemConPrecioMinimo.id;

    res.json({
      precioMinimo,
      query: q,
      itemId,
      itemDetail: itemConPrecioMinimo,
      filtrosAplicados: {
        condition,
        international_delivery_mode,
      },
      totalResultados: resultado.results.length,
      resultadosFiltrados: resultadosFiltrados.length,
    });
  } catch (error) {
    console.error("Error al obtener precio mínimo:", error);
    res.status(500).json({ error: "Error al obtener precio mínimo" });
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

router.get("/test1", async (req, res) => {
  const api = MercadoLibreAPI.getInstance();
  const response = await api.getSellerReputation("2153421531");

  const sellerItems = await api.getSellerItems("2153421531");

  res.json({ sellerItems, sellerReputation: response });
});

router.get("/buscar-todos-vendedores", async (req, res) => {
  const { q, include_global = false } = req.query;

  if (!q) {
    return res.status(400).json({ error: "q es requerido" });
  }

  try {
    const api = MercadoLibreAPI.getInstance();

    // Usar el endpoint de búsqueda del sitio que debería traer todos los vendedores
    const resultado = await api.searchProductsBySite(q, { include_global });

    res.json({
      query: q,
      include_global,
      site_id: include_global ? "CBT" : "MLA",
      totalResults: resultado.paging?.total || 0,
      results: resultado.results || [],
    });
  } catch (error) {
    console.error("Error al buscar productos:", error);
    res.status(500).json({ error: "Error al buscar productos" });
  }
});

router.get("/test", async (req, res) => {
  const api = MercadoLibreAPI.getInstance();
  const response = await api.getProductDetail("MLA24142523");

  res.json(response);
});

router.get("/test-scraping", async (req, res) => {
  const { gtin } = req.query;

  if (!gtin) {
    return res.status(400).json({ error: "gtin es requerido" });
  }

  const prices = await scrapeMeliPrices([gtin]);
  console.log("prices", prices);
  const results = [];
  prices[0].results.forEach((price) => {
    results.push({
      title: price.title,
      price: price.price,
      link: price.link,
      productId: price.productId,
    });
  });
  res.json(results);
});

module.exports = router;
