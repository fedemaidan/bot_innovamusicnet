const FlowService = require('../../../services/FlowManagerBD/Base/flowService');

module.exports = async function EliminarFlow(userId) {
    try {
        const flowExistente = await FlowService.getFlowByUserId(userId);

        if (flowExistente) {
            await FlowService.deleteFlowByUserId(userId);
            console.log(`🗑️ Flow eliminado correctamente para el usuario ${userId}`);
            return { Success: true };
        } else {
            console.log(`ℹ️ No se encontró flow para eliminar del usuario ${userId}`);
            return { Success: false, msg: "No existe flow" };
        }
    } catch (error) {
        console.error(`❌ Error en EliminarFlow:`, error);
        return { Success: false, msg: error.message };
    }
};
