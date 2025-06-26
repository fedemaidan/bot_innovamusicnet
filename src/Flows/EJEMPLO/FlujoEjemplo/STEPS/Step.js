const FlowManager = require('../../../../FlowControl/FlowManager')

module.exports = async function CrearRuta(userId, data, sock) {

    //si por alguna razon data no tiene la informacion que tenemos y la guardamos anteriormente simpelemete llamamos al flow para obtenerla.

    //contruccion de un mensaje
    let output = `📋 *Mensaje corregido para el usuario:*\n\n`;
    output += `\n📞 *Mensaje:* ${data.data.mensaje}\n`;

    // Enviar el mensaje con los detalles
    await sock.sendMessage(userId, { text: output });

    // Y necesitamos luego de realizar toda la logica y funciones, Guardamos estado en el FlowManager (Memoria y BD)
    // FlowManager.setFlow(userId, "INICIARRUTA", "ConfirmarOModificarRuta", hojaRuta);

    //el flow termina aca por lo tanto lo reseteamos (Elimina memoria y BD)
    FlowManager.resetFlow(userId)


    // RESET Y  SETFLOW son opuestos, uno es guardar el otro eliminar. discrecion y aplicar logica a la hora de usarlos.

};