const BuscarConASINStep = require("./Steps/BuscarConASINStep");
const BuscarSinASINStep = require("./Steps/BuscarSinASINStep");

const AnalizarPrecioSteps = {
  BuscarConASINStep,
  BuscarSinASINStep,
};
module.exports = { AnalizarPrecioSteps };

//Repertorio de todos los steps de un flow o flujo, para que puedan ser encontrados por el flow deben encontrarse importados aqui..
//Resumen: un listado de funciones posibles del flow.
