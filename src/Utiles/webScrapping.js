import * as cheerio from "cheerio";

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

export async function scrapeMeliPrices(upcCodes, maxPages = 1) {
  console.log("upcCodes", upcCodes);
  if (!Array.isArray(upcCodes)) upcCodes = [upcCodes];

  const all = [];

  for (const upc of upcCodes) {
    const upcResults = { upc, results: [] };

    for (let page = 1; page <= maxPages; page++) {
      if (page > 1) {
        const randomDelay = Math.random() * 2000 + 1000; // 1-3 segundos
        await delay(randomDelay);
      }

      const searchUrl = `https://listado.mercadolibre.com.ar/${encodeURIComponent(
        upc
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
            `Error HTTP ${res.status} para UPC ${upc}, página ${page}`
          );
          upcResults.error = `HTTP ${res.status}`;
          break;
        }

        const html = await res.text();

        if (!html.includes("ui-search-layout__item")) {
          console.log(
            `No se encontraron resultados para UPC ${upc}, página ${page}`
          );
          break;
        }

        const $ = cheerio.load(html);

        $("li.ui-search-layout__item").each((_, el) => {
          const $el = $(el);

          let title = $el.find("h2.ui-search-item__title").text().trim();
          if (!title) {
            title = $el.find("a.poly-component__title").text().trim();
          }

          // Buscar el precio final (con descuento aplicado)
          let fraction = "";
          let cents = "";

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

          const link = $el.find("a.poly-component__title").attr("href");

          if (fraction) {
            const priceStr = `${fraction.replace(/\./g, "")}.${cents || "00"}`;

            // Extraer el código del producto del link
            let productId = null;
            if (link) {
              // Primero intentar extraer del parámetro searchVariation
              const searchVariationMatch = link.match(
                /searchVariation=([^&]+)/
              );
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

            upcResults.results.push({
              title,
              price: parseFloat(priceStr),
              link,
              productId,
            });
          }
        });

        if (
          !$('a.andes-pagination__link.ui-search-link[title="Siguiente"]')
            .length
        )
          break;
      } catch (error) {
        console.error(
          `Error al procesar UPC ${upc}, página ${page}:`,
          error.message
        );
        upcResults.error = error.message;
        break;
      }
    }

    all.push(upcResults);
  }

  return all;
}
