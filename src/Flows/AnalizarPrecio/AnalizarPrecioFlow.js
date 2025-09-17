// const sockSingleton = require("../../services/SockSingleton/sockSingleton");
const { AnalizarPrecioSteps } = require("./AnalizarPrecioSteps");

const AnalizarPrecioFlow = {
  //Flujo de inicio, viene desde el INIT mediante una llamada directa, da inicio al flujo entrando al primer step por su nombre directo.
  async start(userId, data) {
    if (userId != null) {
      console.log("AnalizarPrecioFlowStartData", data);
      if (data.asinRegular != null || (data.asin != null && data.asin != "-")) {
        await AnalizarPrecioSteps.BuscarConASINStep(userId, data);
      } else {
        await AnalizarPrecioSteps.BuscarSinASINStep(userId, {
          ...data,
          didWebSearch: true,
        });
      }
    } else {
    }
  },

  //Cuando ya nos encontremos dentro del flujo navegandolo, siempre que mandemos un mensaje y llegue aqui verificara el nombre del step actual.
  async Handle(userId, message, currentStep) {
    if (userId != null) {
      // Y que EgresoMaterialSteps es un objeto que contiene tus funciones
      if (typeof AnalizarPrecioSteps[currentStep] === "function") {
        await AnalizarPrecioSteps[currentStep](userId, message);
      } else {
        console.log("STEP NO ENCONTRADO");
      }
    } else {
    }
  },
};
module.exports = AnalizarPrecioFlow;
