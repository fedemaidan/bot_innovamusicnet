const enviarError = require('../../services/exepction/enviarError');
const socketSingleton = require('../../services/SockSingleton/sockSingleton');

async function enviarErrorPorWhatsapp(err, sistema = 'Sistema desconocido') {

    const sock = await socketSingleton.getSock()

    const mensaje = `
❗ *Error capturado en:* ${sistema}
🧾 *Mensaje:* ${err.message}
🧩 *Tipo:* ${err.name}
🗺️ *Stack:* 
\`\`\`
${err.stack}
\`\`\`
🕒 ${new Date().toLocaleString()}
`;
    await enviarError(mensaje, sock);
}

module.exports = {
    enviarErrorPorWhatsapp,
};
