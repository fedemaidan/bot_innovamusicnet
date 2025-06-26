const {
  checkIfSheetExists,
  updateRow,
  getRowsValues,
} = require("../../../services/google/General");

require("dotenv").config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = "Contactos";
const RANGE = `${SHEET_NAME}!A1:Z10000`;

const parseContactos = (arr) =>
  arr.map((row) => ({
    estado: row[0],
    fecha: row[1],
    hora: row[2],
    nombre: row[3],
    mail: row[4],
    numero: row[5],
    web: row[6],
    dataExtra: row[7],
    codigoPrompt: row[8],
    mensaje: row[9],
  }));

const getArrayToSheetGeneral = (contacto) => {
  const values = [
    contacto.estado,
    contacto.fecha,
    contacto.hora,
    contacto.nombre,
    contacto.mail,
    contacto.numero,
    contacto.web,
    contacto.dataExtra,
    contacto.codigoPrompt,
    contacto.mensaje,
  ];
  return values;
};

async function getContactosFromSheet() {
  try {
    const exists = await checkIfSheetExists(GOOGLE_SHEET_ID, SHEET_NAME);

    if (!exists) {
      throw new Error(`La hoja "${SHEET_NAME}" no existe.`);
    }

    const dataContactosRaw = await getRowsValues(
      GOOGLE_SHEET_ID,
      SHEET_NAME,
      "A2:M10000"
    );

    const dataContactos = parseContactos(dataContactosRaw);
    return dataContactos;
  } catch (error) {
    console.error("Error al obtener contactos de la hoja:", error);
  }
}

async function updateContactoRow(contacto) {
  try {
    const values = getArrayToSheetGeneral(contacto);

    await updateRow(GOOGLE_SHEET_ID, values, RANGE, 5, contacto.numero);
  } catch (error) {
    console.error("Error al actualizar la fila del contacto:", error);
  }
}

async function getContactoFromSheet(phoneNumber) {
  const contactos = await getRowsValues(
    GOOGLE_SHEET_ID,
    SHEET_NAME,
    "A2:M10000"
  );
  console.log("CONTACTOS", contactos);
  const contacto = contactos.find((contacto) => contacto[5] === phoneNumber);

  return contacto;
}

async function actualizarEstado(estado, phoneNumber) {
  try {
    const values = await getContactoFromSheet(phoneNumber);
    console.log("VALORES", values);
    if (!values) return;

    values[0] = estado;

    await updateRow(GOOGLE_SHEET_ID, values, RANGE, 5, phoneNumber);
  } catch (error) {
    console.error("Error al actualizar el estado del contacto:", error);
  }
}

module.exports = {
  getContactosFromSheet,
  updateContactoRow,
  actualizarEstado,
};
