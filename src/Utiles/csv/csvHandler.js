const fs = require("fs");
const path = require("path");

const handleCSVCodigosToJSON = () => {
  try {
    const csvContent = fs.readFileSync(
      path.join(__dirname, "../../../csv/codigos.csv"),
      "utf8"
    );
    const lines = csvContent.split("\n").filter((line) => line.trim());

    const codigos = [];
    for (let i = 0; i < lines.length; i++) {
      const columns = lines[i].split(",");
      if (columns.length >= 2 && columns[1].trim()) {
        codigos.push(columns[1].trim());
      }
    }

    return codigos;
  } catch (error) {
    console.error("Error leyendo el archivo CSV:", error);
    return [];
  }
};

const escribirResultadoExitoso = (asin, precio, titulo, link) => {
  try {
    const csvPath = path.join(
      __dirname,
      "../../../csv/resultados_exitosos.csv"
    );
    const timestamp = new Date().toISOString();
    const linea = `${asin},${precio},${titulo.replace(
      /,/g,
      ";"
    )},${link},${timestamp}\n`;

    // Si el archivo no existe, crear el header
    if (!fs.existsSync(csvPath)) {
      const header = "asin,precio,titulo,link,timestamp\n";
      fs.writeFileSync(csvPath, header);
    }

    fs.appendFileSync(csvPath, linea);
    console.log(`Resultado exitoso guardado para ASIN: ${asin}`);
  } catch (error) {
    console.error("Error escribiendo resultado exitoso:", error);
  }
};

const escribirResultadoError = (asin, error) => {
  try {
    const csvPath = path.join(__dirname, "../../../csv/resultados_errores.csv");
    const timestamp = new Date().toISOString();
    const linea = `${asin},${error.replace(/,/g, ";")},${timestamp}\n`;

    // Si el archivo no existe, crear el header
    if (!fs.existsSync(csvPath)) {
      const header = "asin,error,timestamp\n";
      fs.writeFileSync(csvPath, header);
    }

    fs.appendFileSync(csvPath, linea);
    console.log(`Error guardado para ASIN: ${asin}`);
  } catch (error) {
    console.error("Error escribiendo resultado de error:", error);
  }
};

module.exports = {
  handleCSVCodigosToJSON,
  escribirResultadoExitoso,
  escribirResultadoError,
};
