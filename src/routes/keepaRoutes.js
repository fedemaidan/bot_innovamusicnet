const express = require("express");
const router = express.Router();
const keepaService = require("../Utiles/keepaService");

router.post("/consultar-precio", keepaService);

router.get("/producto/:asin", async (req, res) => {
  const { asin } = req.params;
  const url = `https://api.keepa.com/product?key=${process.env.KEEPPA_KEY}&domain=1&asin=${asin}`;

  try {
    const axios = require("axios");
    const { data } = await axios.get(url);
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

router.get("/config", (req, res) => {
  const config = require("../../config/keepaConfig");
  res.json({
    success: true,
    config,
  });
});

module.exports = router;
