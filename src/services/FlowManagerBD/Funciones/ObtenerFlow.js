const FlowService = require('../../../services/FlowManagerBD/Base/flowService');

module.exports = async function ObtenerFlow(userId) {
    try {
        if (!userId) {
            console.error("❌ Error: userId no proporcionado.");
            return { Success: false, msg: "userId no proporcionado." };
        }

        const backup = await FlowService.getFlowByUserId(userId);

        if (!backup) {
            console.log("🚫 No se encontró flow para el userId:", userId);
            return { Success: false, msg: "No se encontró flow para este usuario." };
        }

        const { flow, step } = backup;

        console.log("✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅");

        console.log(backup.flowData)

        console.log("✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅");
        return {
            Success: true,
            data: {
                flowData:backup.flowData,
                currentStep: step,
                flowName: flow  // 👈 ahora sí mapea bien
            }
        };
    } catch (error) {
        console.error("❌ Error en ObtenerFlow:", error);
        return { Success: false, msg: error.message };
    }
};
