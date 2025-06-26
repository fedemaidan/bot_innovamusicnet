const { Flow } = require('../../../../models');

const FlowService = {
    async createFlow(data) {
        try {
            return await Flow.create(data);
        } catch (error) {
            console.error('🛑 Error al crear flow:', error);
            throw error;
        }
    },

    async getFlowById(id) {
        try {
            // SOLO usar si el campo "id" es UUID
            return await Flow.findByPk(id);
        } catch (error) {
            console.error('🛑 Error al obtener flow por ID (findByPk):', error);
            throw error;
        }
    },

    async getFlowByUserId(userId) {
        try {
            return await Flow.findOne({ where: { userId } }); // ✅ correcta para WhatsApp ID
        } catch (error) {
            console.error(`🛑 Error al obtener flow por userId (${userId}):`, error);
            throw error;
        }
    },

    async updateFlowByUserId(userId, newData) {
        try {
            const flowInstance = await Flow.findOne({ where: { userId } });
            if (!flowInstance) throw new Error('Flow no encontrado para userId');

            await flowInstance.update(newData);
            return flowInstance;
        } catch (error) {
            console.error(`🛑 Error al actualizar flow para userId (${userId}):`, error);
            throw error;
        }
    },

    async deleteFlowByUserId(userId) {
        try {
            const flowInstance = await Flow.findOne({ where: { userId } });
            if (!flowInstance) throw new Error('Flow no encontrado para userId');

            await flowInstance.destroy();
            return { message: 'Flow eliminado correctamente' };
        } catch (error) {
            console.error(`🛑 Error al eliminar flow para userId (${userId}):`, error);
            throw error;
        }
    }
};

module.exports = FlowService;
