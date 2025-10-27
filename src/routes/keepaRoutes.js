const express = require("express");
const DEBUG = process.env.PRICE_DEBUG === "1" || process.env.PRICE_DEBUG === "true";
const {
  calcularPrecio,
  calcularPrecioNuevoMetodo,
} = require("../Utiles/pricing");
const axios = require("axios");
const { asin_list } = require("../Utiles/helpersScrapping");
const { getProductKeepa } = require("../Utiles/keepa");
const router = express.Router();

async function obtenerPrecioKeepa(asin) {
  const asinClean = asin.substring(0, 10);
  const keepaKey = process.env.KEEPPA_KEY || process.env.KEEPA_KEY || "";
  const url = `https://api.keepa.com/product?key=${keepaKey}&domain=1&asin=${asinClean}`;

  try {
    const { data } = await axios.get(url);
    const product = data.products[0];
    if (DEBUG) {
      console.log("[keepaRoutes.obtenerPrecioKeepa] url:", url);
      console.log("[keepaRoutes.obtenerPrecioKeepa] asin/title:", product?.asin, product?.title);
      console.log("[keepaRoutes.obtenerPrecioKeepa] weights:", { packageWeight: product?.packageWeight, itemWeight: product?.itemWeight });
      console.log("[keepaRoutes.obtenerPrecioKeepa] last csv points:", {
        csv1_last: Array.isArray(product?.csv?.[1]) ? product.csv[1][product.csv[1].length - 1] : null,
        csv0_last: Array.isArray(product?.csv?.[0]) ? product.csv[0][product.csv[0].length - 1] : null,
      });
    }

    if (!product) {
      return {
        success: false,
        error: "Producto no encontrado",
        asin: asinClean,
      };
    }

    let newPrice =
      (product.csv?.[1]?.slice(-1)[0] ?? product.csv?.[0]?.slice(-1)[0]) || 0;
    let packageWeight = product.packageWeight || product.itemWeight || 0;

    if (asin_list.includes(asinClean)) {
      newPrice = newPrice * 0.92;
      if (DEBUG) console.log("[keepaRoutes.obtenerPrecioKeepa] asin in discount list -> newPrice *= 0.92:", newPrice);
    }

    if (!packageWeight || packageWeight === "N/A" || packageWeight === 0) {
      if (newPrice > 200) {
        packageWeight = 20000;
        if (DEBUG) console.log("[keepaRoutes.obtenerPrecioKeepa] defaulted packageWeight=20000 due to newPrice>200");
      }
    }

    if (
      newPrice == "N/A" ||
      newPrice < 10 ||
      packageWeight == "N/A" ||
      packageWeight == 0 ||
      !newPrice ||
      !packageWeight
    ) {
      return {
        success: false,
        error: "No disponible en Amazon",
        titulo: product.title,
        asin: asinClean,
        features: product.features ? product.features.slice(0, 10) : [],
      };
    }

    const precios = await calcularPrecioNuevoMetodo({
      newPrice,
      packageWeight,
      categoryTree: product.categoryTree || [],
    });
    if (DEBUG) console.log("[keepaRoutes.obtenerPrecioKeepa] resultados:", precios);

    return {
      success: true,
      asin: asinClean,
      precio_amazon: newPrice,
      peso: packageWeight,
      precios_calculados: precios,
      titulo: product.title,
      categoria: product.categoryTree,
      features: product.features ? product.features.slice(0, 10) : [],
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      asin: asinClean,
    };
  }
}

router.get("/consultar-precio/:asin", async (req, res) => {
  const { asin } = req.params;

  if (!asin) {
    return res.status(400).json({
      success: false,
      error: "ASIN es requerido",
    });
  }

  const resultado = await obtenerPrecioKeepa(asin);

  if (resultado.success) {
    res.json({
      success: true,
      precios: resultado.precios_calculados,
      title: resultado.titulo,
    });
  } else {
    res.json({
      success: false,
      error: resultado.error,
    });
  }
});

router.get("/producto/:asin", async (req, res) => {
  const { asin } = req.params;

  try {
    const data = await getProductKeepa(asin);
    console.log("dataKeepa", data);
    const product = data.products[0];

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Producto no encontrado",
      });
    }

    res.json({
      success: true,
      product: {
        title: product.title,
        asin: product.asin,
        categoryTree: product.categoryTree,
        packageWeight: product.packageWeight,
        itemWeight: product.itemWeight,
        csv: product.csv,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

router.get("/config", async (req, res) => {
  const KeepaConfigService = require("../Utiles/KeepaConfigService");
  const config = await KeepaConfigService.obtenerConfiguracion();
  res.json({
    success: true,
    config,
  });
});

module.exports = { router, obtenerPrecioKeepa };
