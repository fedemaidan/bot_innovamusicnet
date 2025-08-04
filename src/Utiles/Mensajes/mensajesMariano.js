const KeepaConfigService = require("../KeepaConfigService");

const getAsinFromMessage = (msg) => {
  try {
    const skuMatch = msg.match(/SKU:\s*([A-Z0-9]{10})/i);

    if (skuMatch && skuMatch[1]) {
      return skuMatch[1].toUpperCase();
    }

    // Extraer ASIN de links de Amazon
    const amazonLinkMatch = msg.match(/amazon\.com\/dp\/([A-Z0-9]{10})/i);
    if (amazonLinkMatch && amazonLinkMatch[1]) {
      return amazonLinkMatch[1].toUpperCase();
    }

    // Extraer ASIN de links de Amazon con otros formatos
    const amazonProductMatch = msg.match(
      /amazon\.com\/[^\/]+\/dp\/([A-Z0-9]{10})/i
    );
    if (amazonProductMatch && amazonProductMatch[1]) {
      return amazonProductMatch[1].toUpperCase();
    }

    // Extraer ASIN de links de Amazon con parámetros adicionales
    const amazonWithParamsMatch = msg.match(
      /amazon\.com\/dp\/([A-Z0-9]{10})\?/i
    );
    if (amazonWithParamsMatch && amazonWithParamsMatch[1]) {
      return amazonWithParamsMatch[1].toUpperCase();
    }

    const asinMatch = msg.match(/\b([A-Z0-9]{10})\b/);

    if (asinMatch && asinMatch[1]) {
      return asinMatch[1].toUpperCase();
    }

    return null;
  } catch (error) {
    console.error("Error extrayendo ASIN del mensaje:", error);
    return null;
  }
};

const getLinkFromMessage = (msg) => {
  try {
    const links = [];

    // Buscar todas las URLs que empiecen con http o https
    const urlMatches = msg.match(/(https?:\/\/[^\s]+)/gi);

    if (urlMatches) {
      urlMatches.forEach((match) => {
        // Limpiar la URL removiendo caracteres extra al final
        const cleanUrl = match.replace(/[^\w\-._~:/?#[\]@!$&'()*+,;=%]/g, "");
        links.push(cleanUrl);
      });
    }

    // Buscar URLs que empiecen con www
    const wwwMatches = msg.match(/(www\.[^\s]+)/gi);

    if (wwwMatches) {
      wwwMatches.forEach((match) => {
        const cleanUrl = `https://${match.replace(
          /[^\w\-._~:/?#[\]@!$&'()*+,;=%]/g,
          ""
        )}`;
        links.push(cleanUrl);
      });
    }

    // Si no se encontraron links, devolver null
    if (links.length === 0) {
      return null;
    }

    // Clasificar los links encontrados
    const result = {
      linkInova: null,
      linkAmazon: null,
    };

    links.forEach((link) => {
      // Verificar si es un link de Amazon
      if (link.includes("amazon.com") || link.includes("amazon.")) {
        result.linkAmazon = link;
      }
      // Verificar si es un link de inovamusicnet
      else if (link.includes("inovamusicnet.com")) {
        result.linkInova = link;
      }
      // Si no es ninguno de los anteriores, asignarlo a linkInova como fallback
      else {
        result.linkInova = link;
      }
    });

    // Si solo hay un link y no es Amazon ni inovamusicnet, devolverlo como string para mantener compatibilidad
    if (links.length === 1 && !result.linkAmazon && !result.linkInova) {
      return links[0];
    }

    return result;
  } catch (error) {
    console.error("Error extrayendo links del mensaje:", error);
    return null;
  }
};

function extraerEmail(mensaje) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;

  const match = mensaje.match(emailRegex);

  return match ? match[0] : null;
}

const crearMensajePrecios = async (asins, resultadoKeepa) => {
  const { titulo, precio_amazon, peso, precios_calculados, categoria } =
    resultadoKeepa;

  // Obtener el template de mensaje configurado
  const mensajes = await KeepaConfigService.obtenerMensajesConfiguracion();
  const tarjeta = precios_calculados.tarjeta;
  const transferencia = precios_calculados.transferencia;
  const efectivoUSD = precios_calculados.efectivoUSD;
  const express = precios_calculados.express;
  const transferenciaUSD = precios_calculados.transferenciaUSD;

  const formatearPrecio = (precio) => {
    return precio.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  let mensaje1 = "";
  if (asins.length === 1) {
    mensaje1 = mensajes.MENSAJE_1_ORIGINAL;
  } else {
    mensaje1 = mensajes.MENSAJE_1_ALTERNATIVO;
  }

  // Generar fecha formatada
  const fechaHoy = new Date();
  const dia = fechaHoy.getDate();
  const mes = fechaHoy.getMonth() + 1;
  const año = fechaHoy.getFullYear();
  const fechaFormateada = `${dia}/${mes}/${año}`;

  let mensaje2 = mensajes.MENSAJE_2;
  mensaje2 = mensaje2.replace(/\[TITULO-PRODUCTO-SELECCIONADO\]/g, titulo);
  mensaje2 = mensaje2.replace(/\[FECHA-HOY\]/g, fechaFormateada);
  mensaje2 = mensaje2.replace(
    /\[transferencia\]/g,
    formatearPrecio(transferencia)
  );
  mensaje2 = mensaje2.replace(
    /\[transferenciaUSD\]/g,
    formatearPrecio(transferenciaUSD)
  );
  mensaje2 = mensaje2.replace(/\[efectivoUSD\]/g, formatearPrecio(efectivoUSD));
  mensaje2 = mensaje2.replace(/\[express\]/g, formatearPrecio(express));

  let mensaje3 = mensajes.MENSAJE_3;
  return [mensaje1, mensaje2, mensaje3];
};

// Función robusta para extraer ASIN de URLs de Amazon
function extractASINFromAmazonLink(url) {
  // Patrones comunes de URLs de Amazon
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/, // /dp/B0CXW2BH8C
    /\/gp\/product\/([A-Z0-9]{10})/, // /gp/product/B0CXW2BH8C
    /\/ASIN\/([A-Z0-9]{10})/, // /ASIN/B0CXW2BH8C
    /\/ref=[^\/]*\/([A-Z0-9]{10})/, // /ref=.../B0CXW2BH8C
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // Fallback al método original
  if (url.includes("/dp/")) {
    return url.split("/dp/")[1].split("/")[0].split("?")[0];
  }

  return null;
}

const getInputWebSearch = (titulos, linkAmazon) => {
  if (titulos?.length < 2 || linkAmazon?.length < 2) {
    return linkAmazon[0] + titulos[0];
  } else {
    let mensaje = "";

    mensaje += `[${titulos[0]}]\n`;
    mensaje += `[${linkAmazon[0]}] - El producto alternativo que me entregues No debe ser: `;

    for (let i = 1; i < titulos.length; i++) {
      mensaje += `[${titulos[i]}] `;
      mensaje += `[${linkAmazon[i]}] `;
    }

    mensaje += "porque No Está disponible en AMAZON USA";

    return mensaje;
  }
};

module.exports = {
  crearMensajePrecios,
  getAsinFromMessage,
  getLinkFromMessage,
  extraerEmail,
  extractASINFromAmazonLink,
  getInputWebSearch,
};
