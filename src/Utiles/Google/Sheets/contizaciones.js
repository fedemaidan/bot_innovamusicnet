const general_range = "Cotizaciones!A1:F100000";

const { addRow } = require("../../../services/google/General");

const getTitlesToSheetGeneral = () => {
  return ["Fecha", "Hora", "Link", "SKU", "Precio 1", "Precio 2", "Precio 3"];
};

async function getArrayToSheetGeneral(cotizacion) {
  const fecha = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hora = new Date().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const values = [
    fecha,
    hora,
    cotizacion.link,
    cotizacion.asin,
    cotizacion.precio,
  ];
  return values;
}

async function addCotizacionToSheet(cotizacion) {
  try {
    const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const headers = getTitlesToSheetGeneral();
    const values = await getArrayToSheetGeneral(cotizacion);
    await addRow(GOOGLE_SHEET_ID, values, general_range, headers);
    return "";
  } catch (error) {
    console.error("Error al agregar cotización:", error);
    throw error;
  }
}

module.exports = {
  addCotizacionToSheet,
};
