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
    // Buscar URLs que empiecen con http o https
    const urlMatch = msg.match(/(https?:\/\/[^\s]+)/i);

    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }

    // Buscar URLs que empiecen con www
    const wwwMatch = msg.match(/(www\.[^\s]+)/i);

    if (wwwMatch && wwwMatch[1]) {
      return `https://${wwwMatch[1]}`;
    }

    return null;
  } catch (error) {
    console.error("Error extrayendo link del mensaje:", error);
    return null;
  }
};

function extraerEmail(mensaje) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;

  const match = mensaje.match(emailRegex);

  return match ? match[0] : null;
}

const crearMensajePrecios = async (resultado) => {
  const { titulo, precio_amazon, peso, precios_calculados, categoria } =
    resultado;

  // Obtener el template de mensaje configurado
  const mensajes = await KeepaConfigService.obtenerMensajesConfiguracion();
  let mensaje = mensajes.MOSTRAR_PRECIO;

  const formatearPrecio = (precio) => {
    return precio.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  mensaje = mensaje.replace(
    /\[tarjeta\]/g,
    formatearPrecio(precios_calculados.tarjeta)
  );
  mensaje = mensaje.replace(
    /\[transferencia\]/g,
    formatearPrecio(precios_calculados.transferencia)
  );
  mensaje = mensaje.replace(
    /\[efectivoUSD\]/g,
    formatearPrecio(precios_calculados.efectivoUSD)
  );

  return mensaje;
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

module.exports = {
  crearMensajePrecios,
  getAsinFromMessage,
  getLinkFromMessage,
  extraerEmail,
  extractASINFromAmazonLink,
};
