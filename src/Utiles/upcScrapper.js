const cheerio = require("cheerio");

// Función para generar un wtorio
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomUserAgent() {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Scrapea la marca desde https://go-upc.com/search?q=...
 * @param {string} upc
 * @returns {Promise<string|null>}
 */
async function getBrandFromGoUPC(upc) {
  const url = `https://go-upc.com/search?q=${encodeURIComponent(upc)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3",
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      console.error(`Error HTTP ${res.status} al acceder a ${url}`);
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    let brand = null;

    $("body *").each((_, el) => {
      const txt = $(el).text().trim();
      const match = txt.match(/^Brand\s+(.+)/i);
      if (match) {
        brand = match[1].trim();
        return false; // cortar loop
      }
    });

    return brand;
  } catch (error) {
    console.error(`Error obteniendo marca de ${url}:`, error.message);
    return null;
  }
}

module.exports = { getBrandFromGoUPC };
