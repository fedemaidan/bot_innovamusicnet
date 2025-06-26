'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Flow extends Model {
        static associate(models) {
            // Asociaciones (si las tenés)
        }
    }

    Flow.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        flowData: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        flow: {
            type: DataTypes.STRING,
            allowNull: false
        },
        step: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'Flow',
    });

    return Flow;
};
