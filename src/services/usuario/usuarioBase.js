const { Usuario } = require('../../../models');

const crearUsuario = async (data) => {
    return await Usuario.create(data);
};

const obtenerUsuarioPorId = async (id) => {
    return await Usuario.findByPk(id);
};

const obtenerUsuarioPorNombre = async (nombre) => {
    return await Usuario.findOne({ where: { usuario: nombre } });
};

const obtenerUsuarioPorUserId = async (userId) => {
    return await Usuario.findOne({ where: { userId } });
};

const obtenerTodosLosUsuarios = async () => {
    return await Usuario.findAll();
};

const actualizarUsuario = async (id, nuevosDatos) => {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return null;
    await usuario.update(nuevosDatos);
    return usuario;
};

const eliminarUsuario = async (id) => {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return null;
    await usuario.destroy();
    return true;
};

module.exports = {
    crearUsuario,
    obtenerUsuarioPorId,
    obtenerUsuarioPorNombre,
    obtenerUsuarioPorUserId,
    obtenerTodosLosUsuarios,
    actualizarUsuario,
    eliminarUsuario
};
