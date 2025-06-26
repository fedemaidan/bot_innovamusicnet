const express = require("express");
const { MercadoLibreAPI } = require("../Utiles/MercadoLibreAPI");

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
  const { gtin, condition, international_delivery_mode } = req.query;
  // international_delivery_mode: "me2" -> entrega internacional || "me2_plus" -> entrega internacional premium

  // condition: "new" -> nuevo || "used" -> usado || "not_specified" -> no especificado

  if (!gtin) {
    return res.status(400).json({ error: "gtin es requerido" });
  }

  try {
    const api = MercadoLibreAPI.getInstance();
    const resultado = await api.getProductPriceByGTIN(gtin);

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
      gtin,
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
    console.error("Error al obtener precio mínimo por GTIN:", error);
    res.status(500).json({ error: "Error al obtener precio mínimo por GTIN" });
  }
});

module.exports = router;
