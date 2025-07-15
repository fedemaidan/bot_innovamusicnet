const cheerio = require("cheerio");
const {
  getRandomUserAgent,
  delay,
  humanDelay,
  getRealisticHeaders,
  extractItemIdFromUrl,
} = require("./helpersScrapping");
const { getProductKeepa } = require("./keepa.js");

async function getSellerIdFromPublication(link) {
  try {
    const item_id = extractItemIdFromUrl(link);
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
      } catch (_) {}
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

async function scrapeMeliBySearchTerm(
  searchTerm,
  maxPages = 1,
  precioMinimo = 0
) {
  const results = { searchTerm, results: [] };

  for (let page = 1; page <= maxPages; page++) {
    // Delay más largo y aleatorio entre requests
    if (page > 1) {
      const randomDelay = Math.random() * 5000 + 3000; // 3-8 segundos
      await delay(randomDelay);
    }

    let searchUrl = "";
    if (precioMinimo > 0) {
      searchUrl = `https://listado.mercadolibre.com.ar/${encodeURIComponent(
        searchTerm
      )}_OrderId_PRICE_PriceRange_${precioMinimo}-0_NoIndex_True`;
    } else {
      searchUrl = `https://listado.mercadolibre.com.ar/${encodeURIComponent(
        searchTerm
      )}_OrderId_PRICE_NoIndex_True`;
    }

    console.log("🔍 Buscando en URL:", searchUrl);

    try {
      // Headers más realistas para evadir detección
      const headers = getRealisticHeaders("https://www.mercadolibre.com.ar/");

      const res = await fetch(searchUrl, {
        headers,
        signal: AbortSignal.timeout(45000), // Timeout más largo
      });

      if (!res.ok) {
        console.log(
          `❌ Error HTTP ${res.status} para búsqueda ${searchTerm}, página ${page}`
        );
        results.error = `HTTP ${res.status}`;
        break;
      }

      const html = await res.text();

      // Verificar si MercadoLibre está bloqueando el acceso
      if (
        html.includes("account-verification") ||
        html.includes("¡Hola! Para continuar")
      ) {
        console.log(
          "🚫 MercadoLibre está bloqueando el acceso - página de verificación detectada"
        );
        results.error =
          "MercadoLibre está bloqueando el acceso. Se requiere verificación de cuenta.";
        break;
      }

      if (
        html.includes("suspicious-traffic") ||
        html.includes("traffico-sospechoso")
      ) {
        console.log("🚫 MercadoLibre detectó tráfico sospechoso");
        results.error =
          "MercadoLibre detectó tráfico sospechoso y bloqueó el acceso.";
        break;
      }

      // Verificar si hay resultados
      if (!html.includes("ui-search-layout__item")) {
        console.log(
          `❌ No se encontraron resultados para búsqueda ${searchTerm}, página ${page}`
        );

        // Verificar si es una página de error o sin resultados
        if (
          html.includes("No se encontraron resultados") ||
          html.includes("no-results")
        ) {
          console.log("📝 Página de 'sin resultados' detectada");
          results.error =
            "No se encontraron productos con este término de búsqueda";
        } else {
          console.log(
            "⚠️ HTML recibido no contiene elementos de resultados esperados"
          );
          console.log(
            "📄 Primeros 500 caracteres del HTML:",
            html.substring(0, 500)
          );
        }
        break;
      }

      console.log("✅ HTML válido recibido, procesando resultados...");

      const $ = cheerio.load(html);

      // Usar un bucle for...of en lugar de each() para manejar correctamente las promesas
      const items = $("li.ui-search-layout__item").toArray();
      console.log(
        `📦 Encontrados ${items.length} elementos en la página ${page}`
      );

      for (const el of items) {
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

        // Si el link es ficha de producto, hacer fetch adicional con delay
        if (link && /\/p\/MLA\d+/.test(link)) {
          try {
            // Delay aleatorio antes de hacer el fetch del producto
            await delay(Math.random() * 2000 + 1000);

            const resProd = await fetch(link, {
              headers: getRealisticHeaders(searchUrl),
              signal: AbortSignal.timeout(25000),
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
        } else {
          console.log(`⚠️ Producto sin precio: ${title}`);
        }
      }

      if (
        !$('a.andes-pagination__link.ui-search-link[title="Siguiente"]').length
      )
        break;
    } catch (error) {
      console.error(
        `❌ Error al procesar búsqueda ${searchTerm}, página ${page}:`,
        error.message
      );
      results.error = error.message;
      break;
    }
  }

  console.log(`📊 Total de resultados encontrados: ${results.results.length}`);
  return results;
}

async function scrapeMeliPrices(
  asin,
  maxPages = 1,
  precioMinimo = 0,
  nombre = ""
) {
  const { MercadoLibreAPI } = require("../Utiles/MercadoLibreAPI.js");
  const api = MercadoLibreAPI.getInstance
    ? MercadoLibreAPI.getInstance()
    : new MercadoLibreAPI();

  console.log("asin", asin);

  const keepa = await getProductKeepa(asin);
  console.log("keepaResponse", keepa);

  // Validar que keepa tenga datos válidos
  if (!keepa || !keepa.products || !keepa.products[0]) {
    return {
      success: false,
      error: "No se pudo obtener información del producto desde Keepa",
      asin: asin,
    };
  }

  const brand = keepa.products[0].brand.split(" ");
  const keyWords = keepa.products[0].title.split(" ").slice(0, 5);
  const upcList = keepa.products[0].upcList;
  console.log("upcList", upcList);
  console.log("keyWords", keyWords);
  console.log("brand", brand);

  // Validar que upcList tenga elementos
  if (!upcList || upcList.length === 0) {
    return {
      success: false,
      error: "No se encontraron códigos UPC para el producto",
      asin: asin,
    };
  }

  let meliResults;
  try {
    meliResults = await scrapeMeliBySearchTerm(
      upcList[0],
      maxPages,
      precioMinimo
    );
    meliResults.asin = asin;
  } catch (error) {
    return {
      success: false,
      error: `Error al buscar productos en MercadoLibre: ${error.message}`,
      asin: asin,
    };
  }

  console.log("meliResults antes de todos los filtros:", meliResults.results);

  meliResults.results = meliResults.results.filter((item) => {
    return (
      keyWords.some((keyword) =>
        item.title.toLowerCase().includes(keyword.toLowerCase())
      ) ||
      brand.some((word) =>
        item.title.toLowerCase().includes(word.toLowerCase())
      )
    );
  });

  console.log(
    "meliResults después del filtro de las palabras clave de keepa:",
    meliResults.results
  );

  if (meliResults.results.length === 0) {
    return {
      success: false,
      error:
        "No se encontraron resultado despues del filtro por el nombre de la marca y palabras clave de keepa",
      asin: asin,
    };
  }

  // Si no hay resultados después del filtro por UPC, intentar con el nombre
  // if (!meliResults.results.length && nombre) {
  //   console.log(
  //     "No se encontraron resultados por UPC filtrados, intentando con nombre:",
  //     nombre
  //   );
  //   meliResults = await scrapeMeliBySearchTerm(
  //     upcList[0],
  //     maxPages,
  //     precioMinimo
  //   );
  //   meliResults.asin = asin;
  //   meliResults.searchTerm = nombre;
  //   meliResults.results = meliResults.results.filter((item) => {
  //     return item.title.toLowerCase().includes(brand.toLowerCase());
  //   });
  //   console.log(
  //     "meliResults después del filtro por nombre de marca:",
  //     meliResults.results
  //   );
  // } else {
  //   meliResults.searchTerm = asin;
  // }

  const sorted = [...meliResults.results].sort((a, b) => a.price - b.price);
  let salesAmount = 0;

  for (const pub of sorted) {
    if (!pub.link) {
      continue;
    }
    const sellerData = await getSellerIdFromPublication(pub.link);
    if (!sellerData || !sellerData.seller_id) {
      console.log("no se encontro el seller_id de la publicacion mas barata");
      continue;
    }

    try {
      const reputation = await api.getSellerReputation(sellerData.seller_id);
      // if (
      //   reputation.seller_reputation &&
      //   reputation.seller_reputation.transactions.total > 10
      // ) {
      salesAmount = reputation.seller_reputation.transactions.total;
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
        success: true,
        ...pub,
        searchTerm: meliResults.searchTerm,
        seller_id: sellerData.seller_id,
        item_id: sellerData.item_id,
        seller_nickname: reputation.nickname,
        seller_data: reputation,
        shipping_options: shippingOptions,
        salesAmount: salesAmount,
      };
      //}
    } catch (e) {
      continue;
    }
  }
  return {
    success: false,
    error: `No se encontraron resultados con vendedores con mas de 10 ventas, se encontro un vendedor con ${salesAmount} ventas`,
    asin: asin,
  };
}

module.exports = { scrapeMeliPrices };
