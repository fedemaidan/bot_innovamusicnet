const GuardarFlow = require('../services/FlowManagerBD/Funciones/GuardarFlow');
const ObtenerFlow = require('../services/FlowManagerBD/Funciones/ObtenerFlow');
const EliminarFlow = require('../services/FlowManagerBD/Funciones/EliminarFlow');

class FlowManager {
    constructor() {
        this.userFlows = {}; // Almacena los flujos de cada usuario
        this.persistEnabled = String(process.FLOWMANAGER_PERSIST).toLowerCase() === 'true';
    }

    // Establecer el flujo y paso inicial para un usuario
    async setFlow(userId, flowName, Step, flowData = {}) {
        console.log(Step);
        const actualFlowData = this.userFlows[userId]?.flowData || {};
        const _flowData = { ...actualFlowData, ...flowData };
        this.userFlows[userId] = { flowName, currentStep: Step, flowData: _flowData };

        if (this.persistEnabled) {
            await GuardarFlow(userId, _flowData, Step, flowName);
        }
    }

    // Obtener el flujo actual de un usuario
    async getFlow(userId) {
        if (!this.userFlows[userId]) {

            if (this.persistEnabled) {
                const estado = await ObtenerFlow(userId);
                if (estado.Success) {
                    const { flowData, currentStep, flowName } = estado.data;
                    this.userFlows[userId] = { flowData, currentStep, flowName };
                }
            }

        }
        return this.userFlows[userId] || null;
    }

    // Reiniciar el flujo de un usuario
    async resetFlow(userId) {
        if (this.persistEnabled) {
            await EliminarFlow(userId);
        }
        delete this.userFlows[userId];
    }
}

module.exports = new FlowManager();