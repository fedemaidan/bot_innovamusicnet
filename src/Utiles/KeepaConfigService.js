require("dotenv").config();
const {
  getRowsValues,
  addRow,
  updateRow,
  checkIfSheetExists,
  createSheet,
} = require("../services/google/General");

const KeepaConfigService = {
  cache: null,
  cacheMessages: null,
  lastFetchTime: null,
  CACHE_DURATION_MS: 1000,
  SHEET_NAME: "KeepaConfig",
  SHEET_NAME_MESSAGES: "Mensajes",
  blockedNumbers: {
    // 'number': 'timestamp'
  },

  async obtenerMensajesConfiguracion() {
    const now = Date.now();

    if (
      this.cacheMessages &&
      now - this.lastFetchTime < this.CACHE_DURATION_MS
    ) {
      return this.cacheMessages;
    }

    const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const sheetExists = await checkIfSheetExists(
      GOOGLE_SHEET_ID,
      this.SHEET_NAME_MESSAGES
    );
    if (!sheetExists) {
      return;
    }

    const rows = await getRowsValues(
      GOOGLE_SHEET_ID,
      this.SHEET_NAME_MESSAGES,
      "A2:B100"
    );

    const mensajes = {};

    for (const row of rows) {
      if (row.length >= 2 && row[0] && row[1]) {
        const key = row[0].trim();
        const value = row[1];
        mensajes[key] = value;
      }
    }

    this.cacheMessages = mensajes;
    this.lastFetchTime = now;

    return mensajes;
  },
  async obtenerConfiguracion() {
    const now = Date.now();

    if (this.cache && now - this.lastFetchTime < this.CACHE_DURATION_MS) {
      return this.cache;
    }

    try {
      const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
      if (!GOOGLE_SHEET_ID) {
        throw new Error(
          "GOOGLE_SHEET_ID no está configurado en las variables de entorno"
        );
      }

      const sheetExists = await checkIfSheetExists(
        GOOGLE_SHEET_ID,
        this.SHEET_NAME
      );
      if (!sheetExists) {
        throw new Error("Hoja de configuración de Keepa no encontrada");
      }

      const rows = await getRowsValues(
        GOOGLE_SHEET_ID,
        this.SHEET_NAME,
        "A2:B20"
      );

      const configuracion = {};

      // Procesar las filas y convertir a objeto
      for (const row of rows) {
        if (row.length >= 2 && row[0] && row[1]) {
          const key = row[0].trim();
          const value = parseFloat(row[1]) || row[1]; // Intentar convertir a número
          configuracion[key] = value;
        }
      }

      this.cache = configuracion;
      this.lastFetchTime = now;

      return configuracion;
    } catch (error) {
      console.error("❌ Error al obtener configuración de Keepa:", error);

      if (this.cache) {
        console.log("⚠️ Usando configuración en caché como fallback");
        return this.cache;
      }
    }
  },

  async obtenerValor(key) {
    const configuracion = await this.obtenerConfiguracion();
    return configuracion[key];
  },

  limpiarCache() {
    this.cache = null;
    this.lastFetchTime = null;
    console.log("✅ Caché de configuración de Keepa limpiado");
  },

  async isNumberBlocked(phoneNumber) {
    const HORAS_BLOQUEO = await this.obtenerValor("HORAS_BLOQUEO");

    const phoneNumbersTest = [
      "5493876147003", // Martin
      "5491150221848", // Mariano
      "5491162948359", // Fede
      "5491136744614", //Micky
    ];

    if (phoneNumbersTest.includes(phoneNumber)) {
      return false;
    }

    if (phoneNumber) {
      const lastBlocked = this.blockedNumbers[phoneNumber];
      if (lastBlocked) {
        const now = Date.now();
        const timeDiff = now - lastBlocked;
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        if (hoursDiff < HORAS_BLOQUEO) {
          return true;
        }
      } else {
        this.blockNumber(phoneNumber);
        return false;
      }
    }
  },

  blockNumber(phoneNumber) {
    this.blockedNumbers[phoneNumber] = Date.now();
  },
};

module.exports = KeepaConfigService;
