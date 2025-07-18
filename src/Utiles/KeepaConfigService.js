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
  lastFetchTime: null,
  CACHE_DURATION_MS: 30 * 60 * 1000, // 30 minutos
  SHEET_NAME: "KeepaConfig",
  RANGE: "A1:B100",

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
        "A2:B100"
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

      console.log("✅ Configuración de Keepa cargada desde Google Sheets");
      return configuracion;
    } catch (error) {
      console.error("❌ Error al obtener configuración de Keepa:", error);

      if (this.cache) {
        console.log("⚠️ Usando configuración en caché como fallback");
        return this.cache;
      }

      // Si no hay caché, devolver configuración por defecto
      console.log("⚠️ Usando configuración por defecto");
      return this.getConfiguracionPorDefecto();
    }
  },

  async crearHojaConfiguracionInicial(GOOGLE_SHEET_ID) {
    try {
      // Crear la hoja
      await createSheet(GOOGLE_SHEET_ID, this.SHEET_NAME);

      // Obtener configuración por defecto
      const configPorDefecto = this.getConfiguracionPorDefecto();

      // Crear filas con los valores por defecto
      const rows = [
        ["KEY", "VALOR"], // Header
        ...Object.entries(configPorDefecto).map(([key, value]) => [key, value]),
      ];

      // Agregar cada fila
      for (let i = 1; i < rows.length; i++) {
        await addRow(GOOGLE_SHEET_ID, rows[i], `${this.SHEET_NAME}!A1:B100`);
      }

      console.log(
        "✅ Hoja de configuración de Keepa creada con valores por defecto"
      );
    } catch (error) {
      console.error("❌ Error al crear hoja de configuración inicial:", error);
      throw error;
    }
  },

  getConfiguracionPorDefecto() {
    return {
      DOLARINOVA: 1100,
      DOLAROFICIAL: 1150,
      DOLAROPERATIVO: 1250,
      COSTOFIJO: 10,
      FLETEXKG: 25,
      RATIOP: 1.71,
      RATIOC: 1.6,
      RATION: 1.7,
      RECARGOTARJETA: 1.1,
      DESCEFECTIVO: 0.85,
      DESCTRANSFERENCIA: 0.90909,
    };
  },

  async actualizarConfiguracion(nuevasConfiguraciones) {
    try {
      const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
      if (!GOOGLE_SHEET_ID) {
        throw new Error(
          "GOOGLE_SHEET_ID no está configurado en las variables de entorno"
        );
      }

      // Obtener configuración actual
      const configActual = await this.obtenerConfiguracion();

      // Actualizar cada configuración
      for (const [key, value] of Object.entries(nuevasConfiguraciones)) {
        if (configActual.hasOwnProperty(key)) {
          // Buscar la fila por la key y actualizarla
          await updateRow(
            GOOGLE_SHEET_ID,
            [key, value],
            `${this.SHEET_NAME}!A1:B100`,
            0, // posIdColumn (columna A)
            key // idValue
          );
        }
      }

      // Invalidar caché para forzar recarga
      this.cache = null;
      this.lastFetchTime = null;

      console.log("✅ Configuración de Keepa actualizada en Google Sheets");
      return true;
    } catch (error) {
      console.error("❌ Error al actualizar configuración de Keepa:", error);
      throw error;
    }
  },

  async obtenerValor(key) {
    const configuracion = await this.obtenerConfiguracion();
    return configuracion[key];
  },

  async obtenerDolarInova() {
    return await this.obtenerValor("DOLARINOVA");
  },

  async obtenerDolarOficial() {
    return await this.obtenerValor("DOLAROFICIAL");
  },

  async obtenerDolarOperativo() {
    return await this.obtenerValor("DOLAROPERATIVO");
  },

  async obtenerCostoFijo() {
    return await this.obtenerValor("COSTOFIJO");
  },

  async obtenerFleteXKg() {
    return await this.obtenerValor("FLETEXKG");
  },

  async obtenerRatioP() {
    return await this.obtenerValor("RATIOP");
  },

  async obtenerRatioC() {
    return await this.obtenerValor("RATIOC");
  },

  async obtenerRatioN() {
    return await this.obtenerValor("RATION");
  },

  async obtenerRecargoTarjeta() {
    return await this.obtenerValor("RECARGOTARJETA");
  },

  async obtenerDescEfectivo() {
    return await this.obtenerValor("DESCEFECTIVO");
  },

  async obtenerDescTransferencia() {
    return await this.obtenerValor("DESCTRANSFERENCIA");
  },

  // Método para limpiar caché manualmente
  limpiarCache() {
    this.cache = null;
    this.lastFetchTime = null;
    console.log("✅ Caché de configuración de Keepa limpiado");
  },

  // Método para obtener información del caché
  obtenerInfoCache() {
    if (!this.cache) {
      return {
        tieneCache: false,
        tiempoRestante: 0,
      };
    }

    const tiempoTranscurrido = Date.now() - this.lastFetchTime;
    const tiempoRestante = Math.max(
      0,
      this.CACHE_DURATION_MS - tiempoTranscurrido
    );

    return {
      tieneCache: true,
      tiempoTranscurrido,
      tiempoRestante,
      expiraEn: new Date(this.lastFetchTime + this.CACHE_DURATION_MS),
    };
  },
};

module.exports = KeepaConfigService;
