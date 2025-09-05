const express = require("express");
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
  const url = `https://api.keepa.com/product?key=${process.env.KEEPPA_KEY}&domain=1&asin=${asinClean}`;

  try {
    const { data } = await axios.get(url);
    const product = data.products[0];
    console.log("features", product.features);
    console.log("productKeepa", product);

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
    }

    if (!packageWeight || packageWeight === "N/A" || packageWeight === 0) {
      if (newPrice > 200) {
        packageWeight = 20000;
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
