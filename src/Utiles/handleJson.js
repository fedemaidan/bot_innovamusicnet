const fs = require("fs");
const path = require("path");

// Ruta al archivo db.json
const DB_PATH = path.join(__dirname, "../../db.json");

/**
 * Lee todos los datos del archivo db.json (función interna)
 * @returns {Object} Los datos del archivo JSON
 */
function readDatabase() {
  try {
    const data = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error al leer la base de datos:", error.message);
    return {};
  }
}

/**
 * Escribe datos en el archivo db.json (función interna)
 * @param {Object} data - Los datos a escribir
 * @returns {boolean} true si se escribió correctamente, false en caso contrario
 */
function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Error al escribir en la base de datos:", error.message);
    return false;
  }
}

/**
 * Obtiene un valor específico por clave
 * @param {string} key - La clave a buscar
 * @returns {*} El valor encontrado o null si no existe
 */
function getValue(key) {
  try {
    const data = readDatabase();
    return data[key] || null;
  } catch (error) {
    console.error("Error al obtener valor:", error.message);
    return null;
  }
}

/**
 * Obtiene múltiples valores por claves
 * @param {Array} keys - Array de claves a buscar
 * @returns {Object} Objeto con los valores encontrados
 */
function getValues(keys) {
  try {
    const data = readDatabase();
    const result = {};
    keys.forEach((key) => {
      result[key] = data[key] || null;
    });
    return result;
  } catch (error) {
    console.error("Error al obtener valores:", error.message);
    return {};
  }
}

/**
 * Establece un valor para una clave específica
 * @param {string} key - La clave
 * @param {*} value - El valor a establecer
 * @returns {boolean} true si se estableció correctamente
 */
function setItem(key, value) {
  try {
    const data = readDatabase();
    data[key] = value;
    return writeDatabase(data);
  } catch (error) {
    console.error("Error al establecer valor:", error.message);
    return false;
  }
}

/**
 * Establece múltiples valores a la vez
 * @param {Object} items - Objeto con las claves y valores a establecer
 * @returns {boolean} true si se establecieron correctamente
 */
function setItems(items) {
  try {
    const data = readDatabase();
    Object.assign(data, items);
    return writeDatabase(data);
  } catch (error) {
    console.error("Error al establecer valores:", error.message);
    return false;
  }
}

/**
 * Elimina una clave específica
 * @param {string} key - La clave a eliminar
 * @returns {boolean} true si se eliminó correctamente
 */
function deleteItem(key) {
  try {
    const data = readDatabase();
    if (data.hasOwnProperty(key)) {
      delete data[key];
      return writeDatabase(data);
    }
    return false;
  } catch (error) {
    console.error("Error al eliminar clave:", error.message);
    return false;
  }
}

/**
 * Elimina múltiples claves a la vez
 * @param {Array} keys - Array de claves a eliminar
 * @returns {boolean} true si se eliminaron correctamente
 */
function deleteItems(keys) {
  try {
    const data = readDatabase();
    let deleted = false;
    keys.forEach((key) => {
      if (data.hasOwnProperty(key)) {
        delete data[key];
        deleted = true;
      }
    });
    if (deleted) {
      return writeDatabase(data);
    }
    return false;
  } catch (error) {
    console.error("Error al eliminar claves:", error.message);
    return false;
  }
}

module.exports = {
  getValue,
  getValues,
  setItem,
  setItems,
  deleteItem,
  deleteItems,
};
