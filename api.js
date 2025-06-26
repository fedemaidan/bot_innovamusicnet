const QRCode = require("qrcode");
const express = require("express");
const apiRoutes = require("./src/routes/routes");
const cors = require("cors");
const { MercadoLibreAPI } = require("./src/Utiles/MercadoLibreAPI");

const initMercadoLibreAPI = async () => {
  try {
    MercadoLibreAPI.init();
    console.log("API de MercadoLibre inicializada correctamente");
    return true;
  } catch (error) {
    console.error("Error al inicializar API de MercadoLibre:", error);
    return false;
  }
};

module.exports = async function startApi() {
  const app = express();
  const port = process.env.PORT || 3000;

  // Inicializar MercadoLibre API
  await initMercadoLibreAPI();

  app.use(cors());
  app.use(express.json());
  app.use("/api", apiRoutes);

  app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}/qr`);
    console.log(`- API disponible en http://localhost:${port}/api/`);
    console.log(`- QR disponible en http://localhost:${port}/qr`);
  });
};
