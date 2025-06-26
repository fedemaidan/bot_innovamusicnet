const {
  getContactosFromSheet,
  updateContactoRow,
} = require("../Google/Sheets/contactos");
const sendMessageToContact = require("./sendMessageToContact");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const enviarContactosEnFrio = async () => {
  try {
    const contactos = await getContactosFromSheet();

    const fechaActual = new Date();
    const horaActual = fechaActual.getHours();

    const diaActual = fechaActual.getDate().toString().padStart(2, "0");
    const mesActual = (fechaActual.getMonth() + 1).toString().padStart(2, "0");
    const anioActual = fechaActual.getFullYear();
    const fechaFormateada = `${diaActual}/${mesActual}/${anioActual}`;

    const contactosPendientes = contactos.filter((contacto) => {
      const esPendiente =
        contacto.estado === "Pendiente" || contacto.estado === "";

      let coincideHora = true;
      if (contacto.hora) {
        const horaContacto = parseInt(contacto.hora);
        if (!isNaN(horaContacto)) {
          coincideHora = horaContacto === horaActual;
        }
      }

      let coincideFecha = true;
      if (contacto.fecha) {
        coincideFecha = contacto.fecha === fechaFormateada;
      }

      return esPendiente && coincideHora && coincideFecha;
    });

    if (contactosPendientes.length === 0) {
      console.log("No hay contactos pendientes para enviar en esta hora.");
      return;
    }

    for (const contacto of contactosPendientes) {
      console.log("CONTACTO PENDIENTE", contacto.numero, contacto.mensaje);
      await sendMessageToContact(contacto.numero, contacto.mensaje);
      contacto.estado = "Contactado";
      await updateContactoRow(contacto);

      const waitTime = Math.floor(Math.random() * (180000 - 60000) + 60000);
      console.log(
        `Esperando ${Math.round(
          waitTime / 1000
        )} segundos antes del siguiente mensaje...`
      );

      await sleep(waitTime);
    }
  } catch (error) {
    console.error("Error al obtener contactos de la hoja de cálculo:", error);
    return;
  }
};

module.exports = enviarContactosEnFrio;
