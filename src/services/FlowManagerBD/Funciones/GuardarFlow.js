const FlowService = require('../../../services/FlowManagerBD/Base/flowService');

module.exports = async function GuardarFlow(userId, hojaDeRuta, step, flowname) {
    try {
        // Intentamos obtener el flow actual
        const flowExistente = await FlowService.getFlowByUserId(userId);

        if (flowExistente) {
            // Actualizar si ya existe
            await FlowService.updateFlowByUserId(userId, {
                flowData:hojaDeRuta,
                step,
                flow: flowname
            });
        } else {
            // Crear nuevo flow
            await FlowService.createFlow({
                userId,
                flowData:hojaDeRuta,
                step,
                flow: flowname
            });

        }
        console.log("✅ Flow guardado correctamente.");
        return { Success: true };
    } catch (error) {
        console.error("❌ Error en GuardarFlow:", error);
        return { Success: false, msg: error.message };
    }
};
