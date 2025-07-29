const general_range = "Cotizaciones!A1:I1000";
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

const {
  addRow,
  updateRow,
  getRowsValues,
} = require("../../../services/google/General");

const getTitlesToSheetGeneral = () => {
  return [
    "Fecha",
    "Hora",
    "Telefono",
    "Link",
    "SKU",
    "Precio 1",
    "Precio Meli",
    "Link Meli",
    "Link WebSearch",
  ];
};

async function getArrayToSheetGeneral(cotizacion) {
  const fecha = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const hora = new Date().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const values = [
    fecha,
    hora,
    cotizacion.phoneNumber,
    cotizacion.link ?? "-",
    cotizacion.asin ?? "-",
    cotizacion.precioKeepa ?? "-",
    cotizacion.precioMeli ?? "-",
    cotizacion.linkMeli ?? "-",
    cotizacion.linkWebSearch ?? "-",
  ];
  return values;
}

async function addEmailToSheet(email, phoneNumber) {
  const values = await getRowsValues(GOOGLE_SHEET_ID, "Emails", "A1:B1000");
  const rowValues = values.find((row) => row[0] === phoneNumber);

  if (rowValues) {
    rowValues[1] = email;
    await updateRow(
      GOOGLE_SHEET_ID,
      rowValues,
      "Emails!A1:B1000",
      0,
      phoneNumber
    );
  } else {
    await addRow(GOOGLE_SHEET_ID, [phoneNumber, email], "Emails!A1:B1000");
  }
}

async function addCotizacionToSheet(cotizacion) {
  try {
    const values = await getArrayToSheetGeneral(cotizacion);
    await addRow(GOOGLE_SHEET_ID, values, general_range);
    return "";
  } catch (error) {
    console.error("Error al agregar cotización:", error);
    throw error;
  }
}

module.exports = {
  addCotizacionToSheet,
  addEmailToSheet,
};
