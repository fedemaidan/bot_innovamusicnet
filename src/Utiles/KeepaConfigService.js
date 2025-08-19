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
  cacheTestNumbers: null,
  lastFetchTime: null,
  lastFetchTimeTestNumbers: null,
  CACHE_DURATION_MS: 1000,
  SHEET_NAME: "KeepaConfig",
  SHEET_NAME_MESSAGES: "Mensajes",
  testNumbers: [],
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
          const rawValue = row[1];

          // Función para parsear valores numéricos de manera más robusta
          let value = rawValue;
          if (typeof rawValue === "string" && rawValue.trim() !== "") {
            const cleanValue = rawValue.replace(/,/g, ".").trim(); // Reemplazar comas por puntos
            const numValue = parseFloat(cleanValue);

            // Solo usar el valor numérico si la conversión fue exitosa y no es NaN
            if (!isNaN(numValue) && isFinite(numValue)) {
              value = numValue;
            }
          } else if (typeof rawValue === "number") {
            value = rawValue;
          }

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

  async obtenerValorNumerico(key) {
    const valor = await this.obtenerValor(key);

    if (typeof valor === "number") {
      return valor;
    }

    if (typeof valor === "string" && valor.trim() !== "") {
      const cleanValue = valor.replace(/,/g, ".").trim();
      const numValue = parseFloat(cleanValue);

      if (!isNaN(numValue) && isFinite(numValue)) {
        return numValue;
      }
    }

    return null;
  },

  limpiarCache() {
    this.cache = null;
    this.cacheMessages = null;
    this.cacheTestNumbers = null;
    this.lastFetchTime = null;
    this.lastFetchTimeTestNumbers = null;
    console.log("✅ Caché de configuración de Keepa limpiado");
  },

  async getTestNumbers() {
    const now = Date.now();

    if (
      this.cacheTestNumbers &&
      this.lastFetchTimeTestNumbers &&
      now - this.lastFetchTimeTestNumbers < this.CACHE_DURATION_MS
    ) {
      return this.cacheTestNumbers;
    }

    try {
      const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
      if (!GOOGLE_SHEET_ID) {
        throw new Error(
          "GOOGLE_SHEET_ID no está configurado en las variables de entorno"
        );
      }

      const rows = await getRowsValues(
        GOOGLE_SHEET_ID,
        this.SHEET_NAME,
        "D2:D8"
      );
      const testNumbers = rows
        .map((row) => row[0])
        .filter((number) => number && number.trim() !== "");

      // Actualizar cache
      this.cacheTestNumbers = testNumbers;
      this.testNumbers = testNumbers;
      this.lastFetchTimeTestNumbers = now;

      return testNumbers;
    } catch (error) {
      console.error("❌ Error al obtener números de prueba:", error);
    }
  },

  async isNumberBlocked(phoneNumber) {
    const HORAS_BLOQUEO = await this.obtenerValor("HORAS_BLOQUEO");
    const testNumbers = await this.getTestNumbers();

    if (testNumbers.includes(phoneNumber)) {
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
