const FlowManager = require("../FlowControl/FlowManager");
const AnalizarPrecioFlow = require("../Flows/AnalizarPrecio/AnalizarPrecioFlow");
const defaultFlow = require("../Flows/INIT/INIT");

class FlowMapper {
  async handleMessage(userId, message, messageType) {
    //obtenemos el flow desde la memoria O BD, esto nos brindara, (Informacion de flow y step acutal, y los datos que hayamos persistido)
    let flow = await FlowManager.getFlow(userId);

    if (flow && flow.flowName) {
      switch (flow.flowName) {
        case "ANALIZAR_PRECIO":
          await AnalizarPrecioFlow.Handle(userId, message, flow.currentStep);
          break;
        default:
          await defaultFlow.handle(userId, message);
          break;
      }
    } else {
      // Si no hay flow, arrancamos el INITFLOW
      //FlowManager.setFlow(userId, 'INITFLOW');
      await defaultFlow.Init(userId, message, messageType);
    }
  }
}
module.exports = new FlowMapper();
