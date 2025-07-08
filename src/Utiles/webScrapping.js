const cheerio = require("cheerio");
const { getBrandFromGoUPC } = require("./upcScrapper.js");

// Función para generar un delay aleatorio
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

function extractItemId(url) {
  const m1 = url.match(/MLA-(\d+)/); // https://…/MLA-123456…
  if (m1) return `MLA${m1[1]}`;

  const m2 = url.match(/\/p\/(MLA\d+)/); // https://…/p/MLA123456
  if (m2) return m2[1];

  const m3 = url.match(/[?&]item_id=(MLA\d+)/);
  if (m3) return m3[1];

  return null;
}

async function getSellerIdFromPublication(link) {
  try {
    /* ---------- 1. intentar vía API oficial ---------- */
    const item_id = extractItemId(link);
    if (item_id) {
      try {
        const apiResp = await fetch(
          `https://api.mercadolibre.com/items/${item_id}`,
          {
            headers: { "User-Agent": getRandomUserAgent() },
            signal: AbortSignal.timeout(10000),
          }
        );

        if (apiResp.ok) {
          const data = await apiResp.json();
          if (data.seller_id) {
            return { seller_id: String(data.seller_id), item_id };
          }
        }
      } catch (_) {
        /* si la API falla, continuamos al scraping */
      }
    }

    /* ---------- 2. fallback: scraping del HTML ---------- */
    const pageResp = await fetch(link, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.8",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!pageResp.ok) return { seller_id: null, item_id };

    const html = await pageResp.text();

    // a) buscar seller_id en pdp_filters (ej: pdp_filters=seller_id%3A2153421531)
    const pdpFiltersMatch = html.match(/pdp_filters=seller_id%3A(\d+)/);
    if (pdpFiltersMatch) {
      console.log("seller_id encontrado en pdp_filters:", pdpFiltersMatch[1]);
      return { seller_id: pdpFiltersMatch[1], item_id };
    }

    // b) buscar seller_id directo en la URL
    const sellerMatch = html.match(/seller_id=(\d+)/);
    if (sellerMatch) {
      return { seller_id: sellerMatch[1], item_id };
    }

    // b) buscar en todos los enlaces de la página
    const $ = cheerio.load(html);

    // Buscar en todos los enlaces que contengan seller_id
    let foundSellerId = null;
    $("a[href*='seller_id']").each((_, el) => {
      const href = $(el).attr("href");
      console.log("Enlace con seller_id encontrado:", href);
      const hrefMatch = href.match(/seller_id=(\d+)/);
      if (hrefMatch && !foundSellerId) {
        foundSellerId = hrefMatch[1];
        console.log("seller_id extraído del enlace:", foundSellerId);
      }
    });

    if (foundSellerId) {
      return { seller_id: foundSellerId, item_id };
    }

    // Buscar en enlaces con pdp_filters
    $("a[href*='pdp_filters']").each((_, el) => {
      const href = $(el).attr("href");
      console.log("Enlace con pdp_filters encontrado:", href);
      const pdpMatch = href.match(/pdp_filters=seller_id%3A(\d+)/);
      if (pdpMatch && !foundSellerId) {
        foundSellerId = pdpMatch[1];
        console.log("seller_id extraído de pdp_filters:", foundSellerId);
      }
    });

    if (foundSellerId) {
      return { seller_id: foundSellerId, item_id };
    }

    // Buscar en todos los enlaces de recomendaciones de footer
    const footerLinks = $("a.ui-recommendations-footer__link");
    let sellerIdFooter = null;
    footerLinks.each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const match = href.match(/seller_id=(\d+)/);
        if (match && !sellerIdFooter) {
          sellerIdFooter = match[1];
        }
      }
    });
    if (sellerIdFooter) {
      return { seller_id: sellerIdFooter, item_id };
    }

    // c) último intento: buscar en window.__INITIAL_STATE__
    const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/s);
    if (stateMatch) {
      try {
        const stateObj = JSON.parse(stateMatch[1]);
        const deep = (o) =>
          Object(o) === o
            ? Object.values(o).reduce(
                (r, v) => r || deep(v),
                o.seller_id ? String(o.seller_id) : null
              )
            : null;
        const found = deep(stateObj);
        if (found) return { seller_id: found, item_id };
      } catch (_) {
        /* ignore JSON errors */
      }
    }

    // Si llegamos aquí, no lo encontramos
    return { seller_id: null, item_id };
  } catch (err) {
    console.error("Error en getSellerIdFromPublication:", err.message);
    return { seller_id: null, item_id: null };
  }
}

async function scrapeMeliBySearchTerm(searchTerm, maxPages = 1) {
  const results = { searchTerm, results: [] };

  for (let page = 1; page <= maxPages; page++) {
    if (page > 1) {
      const randomDelay = Math.random() * 2000 + 1000; // 1-3 segundos
      await delay(randomDelay);
    }

    const searchUrl = `https://listado.mercadolibre.com.ar/${encodeURIComponent(
      searchTerm
    )}_OrderId_PRICE_NoIndex_True`;

    console.log("searchUrl", searchUrl);

    try {
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent": getRandomUserAgent(),
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3",
          "Accept-Encoding": "gzip, deflate, br",
          DNT: "1",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Cache-Control": "max-age=0",
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        console.log(
          `Error HTTP ${res.status} para búsqueda ${searchTerm}, página ${page}`
        );
        results.error = `HTTP ${res.status}`;
        break;
      }

      const html = await res.text();

      if (!html.includes("ui-search-layout__item")) {
        console.log(
          `No se encontraron resultados para búsqueda ${searchTerm}, página ${page}`
        );
        break;
      }

      const $ = cheerio.load(html);

      $("li.ui-search-layout__item").each(async (_, el) => {
        const $el = $(el);

        let title = $el.find("h2.ui-search-item__title").text().trim();
        if (!title) {
          title = $el.find("a.poly-component__title").text().trim();
        }

        // Buscar el link
        const link = $el.find("a.poly-component__title").attr("href");

        let fraction = "";
        let cents = "";
        let priceStr = null;

        // Si el link es ficha de producto, hacer fetch adicional
        if (link && /\/p\/MLA\d+/.test(link)) {
          try {
            const resProd = await fetch(link, {
              headers: {
                "User-Agent": getRandomUserAgent(),
                Accept:
                  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3",
              },
              signal: AbortSignal.timeout(20000),
            });
            if (resProd.ok) {
              const htmlProd = await resProd.text();
              const $prod = cheerio.load(htmlProd);
              // El precio suele estar en .andes-money-amount__fraction y .andes-money-amount__cents dentro de .ui-pdp-price__second-line
              const priceBlock = $prod(
                ".ui-pdp-price__second-line, .ui-pdp-price__main-container"
              );
              fraction = priceBlock
                .find(".andes-money-amount__fraction")
                .first()
                .text();
              cents = priceBlock
                .find(".andes-money-amount__cents")
                .first()
                .text();
              if (fraction) {
                priceStr = `${fraction.replace(/\./g, "")}.${cents || "00"}`;
              }
            }
          } catch (e) {
            // Si falla, fallback a scraping normal
            priceStr = null;
          }
        }

        // Si no es ficha de producto o falló el fetch, usar scraping normal
        if (!priceStr) {
          // Estrategia 1: Buscar el precio en elementos de descuento (precio final)
          fraction = $el
            .find(
              ".andes-money-amount--cents-superscript .andes-money-amount__fraction"
            )
            .text();
          cents = $el
            .find(
              ".andes-money-amount--cents-superscript .andes-money-amount__cents"
            )
            .text();

          // Estrategia 2: Si no hay descuento, buscar el precio principal
          if (!fraction) {
            fraction = $el
              .find("span.andes-money-amount__fraction")
              .first()
              .text();
            cents = $el.find("span.andes-money-amount__cents").first().text();
          }

          // Estrategia 3: Buscar en elementos específicos de precio actual
          if (!fraction) {
            fraction = $el
              .find(".ui-search-price__part .andes-money-amount__fraction")
              .text();
            cents = $el
              .find(".ui-search-price__part .andes-money-amount__cents")
              .text();
          }

          // Estrategia 4: Buscar el último precio encontrado (generalmente el final)
          if (!fraction) {
            fraction = $el
              .find("span.andes-money-amount__fraction")
              .last()
              .text();
            cents = $el.find("span.andes-money-amount__cents").last().text();
          }

          // Estrategia 5: Buscar en elementos que contengan "final" o "actual"
          if (!fraction) {
            fraction = $el
              .find(
                ".ui-search-price__part--final .andes-money-amount__fraction"
              )
              .text();
            cents = $el
              .find(".ui-search-price__part--final .andes-money-amount__cents")
              .text();
          }

          if (fraction) {
            priceStr = `${fraction.replace(/\./g, "")}.${cents || "00"}`;
          }
        }

        // Extraer el código del producto del link
        let productId = null;
        if (link) {
          // Primero intentar extraer del parámetro searchVariation
          const searchVariationMatch = link.match(/searchVariation=([^&]+)/);
          if (searchVariationMatch) {
            productId = searchVariationMatch[1];
          } else {
            // Si no hay searchVariation, extraer el código después de /p/
            const pathMatch = link.match(/\/p\/([^#?]+)/);
            if (pathMatch) {
              productId = pathMatch[1];
            }
          }
        }

        if (priceStr) {
          results.results.push({
            title,
            price: parseFloat(priceStr),
            link,
            productId,
          });
        }
      });

      if (
        !$('a.andes-pagination__link.ui-search-link[title="Siguiente"]').length
      )
        break;
    } catch (error) {
      console.error(
        `Error al procesar búsqueda ${searchTerm}, página ${page}:`,
        error.message
      );
      results.error = error.message;
      break;
    }
  }

  return results;
}

async function scrapeMeliPrices(
  upcCode,
  maxPages = 1,
  precioMinimo = 0,
  nombre = ""
) {
  const { MercadoLibreAPI } = require("../Utiles/MercadoLibreAPI.js");
  const api = MercadoLibreAPI.getInstance
    ? MercadoLibreAPI.getInstance()
    : new MercadoLibreAPI();

  console.log("upcCode", upcCode);

  let upcResults = await scrapeMeliBySearchTerm(upcCode, maxPages);
  upcResults.upc = upcCode;

  const brand = await getBrandFromGoUPC(upcCode);

  upcResults.results = upcResults.results.filter((item) => {
    const priceOk = item.price >= precioMinimo;
    const brandOk = item.title.toLowerCase().includes(brand.toLowerCase());
    return priceOk && brandOk;
  });

  // Si no hay resultados después del filtro por UPC, intentar con el nombre
  if (!upcResults.results.length && nombre) {
    console.log(
      "No se encontraron resultados por UPC filtrados, intentando con nombre:",
      nombre
    );
    upcResults = await scrapeMeliBySearchTerm(nombre, maxPages);
    upcResults.upc = upcCode;
    upcResults.searchTerm = nombre;
    upcResults.results = upcResults.results.filter((item) => {
      const priceOk = item.price >= precioMinimo;
      const brandOk = item.title.toLowerCase().includes(brand.toLowerCase());
      return priceOk && brandOk;
    });
  } else {
    upcResults.searchTerm = upcCode;
  }

  console.log("upcResults después del filtro:", upcResults.results);

  const sorted = [...upcResults.results].sort((a, b) => a.price - b.price);

  for (const pub of sorted) {
    if (!pub.link) {
      continue;
    }
    const sellerData = await getSellerIdFromPublication(pub.link);
    if (!sellerData || !sellerData.seller_id) {
      continue;
    }

    try {
      const reputation = await api.getSellerReputation(sellerData.seller_id);
      if (
        reputation.seller_reputation &&
        reputation.seller_reputation.level_id === "5_green"
      ) {
        // Obtener opciones de envío si tenemos item_id
        let shippingOptions = null;
        if (sellerData.item_id) {
          try {
            shippingOptions = await api.getShippingOptions(sellerData.item_id);
          } catch (shippingError) {
            shippingOptions = {
              error: "No se pudieron obtener las opciones de envío",
            };
          }
        }

        return {
          ...pub,
          searchTerm: upcResults.searchTerm,
          seller_id: sellerData.seller_id,
          item_id: sellerData.item_id,
          seller_nickname: reputation.nickname,
          seller_data: reputation,
          shipping_options: shippingOptions,
        };
      }
    } catch (e) {
      continue;
    }
  }
  // Si no se encontró ninguna con reputación 5_green
  return null;
}

module.exports = { scrapeMeliPrices };
