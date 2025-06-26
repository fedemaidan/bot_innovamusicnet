const FlowManager = require('../../../FlowControl/FlowManager');
async function iniciarFlow(telefono, flow, step, datos)
{
    FlowManager.setFlow(telefono, flow, step, datos)
}

module.exports = iniciarFlow;