<?php
declare(strict_types=1);

/**
 * Calcula el precio final ("tarjeta") de un producto Amazon/Keepa para un ASIN dado.
 *
 * Entrada:
 * - newPrice: precio Keepa en centavos (csv), se divide por 100 dentro del cálculo original
 * - packageWeight: peso en gramos (Keepa)
 * - categoryTree: árbol de categorías (Keepa) para detectar specialOld/specialNew
 *
 * Salida:
 * - int precio final redondeado hacia abajo (AR$)
 */
function calcular_precio_php(float $newPrice, float $packageWeight, array $categoryTree): int {
    $DOLARINOVA = 1500.0;      // No se usa para el valor "tarjeta"; se deja por compatibilidad
    $DOLAROFICIAL = 1600.0;
    $DOLAROPERATIVO = 1650.0;
    $COSTOFIJO = 10.0;
    $DESCEFECTIVO = 0.85;      // No se usa para el valor "tarjeta"
    $DESCTRANSFERENCIA = 0.909090; // No se usa para el valor "tarjeta"
    $RECARGOTARJETA = 1.1;
    $RATIOKG = 1.5;
    $RATIOP = 1.71;
    $RATIOC = 1.55;
    $RATION = 1.7;
    $FLETEXKG = 25.0;

    $specialOld = [13896617011, 2642129011, 193870011, 1292110011, 281052, 3109924011, 3017941];
    $specialNew = [172421, 4943760011, 11910405011, 7161075011, 7161091011, 3350161, 11608080011, 172659, 6427814011, 294940, 6469269011, 16227128011, 3443921, 3347871, 1292115011];

    $isOld = false;
    $isNew = false;
    foreach ($categoryTree as $c) {
        if (isset($c['catId'])) {
            $catId = (int)$c['catId'];
            if (in_array($catId, $specialOld, true)) $isOld = true;
            if (in_array($catId, $specialNew, true)) $isNew = true;
        }
    }

    $costoAdicional = ($newPrice / 100 > 1000)
        ? (($newPrice / 100 - 1000) * 1.01 + 1000)
        : ($newPrice / 100);

    if ($isOld) {
        $metodoActual = (
            $costoAdicional * $RATIOC * $DOLAROPERATIVO * $RECARGOTARJETA +
            ($packageWeight / 1000) * $FLETEXKG * $DOLAROFICIAL * $RECARGOTARJETA +
            $COSTOFIJO * $DOLAROFICIAL * $RECARGOTARJETA
        );
    } elseif ($isNew) {
        $metodoActual = (
            $costoAdicional * $RATIOP * $DOLAROPERATIVO * $RECARGOTARJETA +
            ($packageWeight / 1000) * $FLETEXKG * $DOLAROFICIAL * $RECARGOTARJETA +
            $COSTOFIJO * $DOLAROFICIAL * $RECARGOTARJETA
        );
    } else {
        $metodoActual = (
            $costoAdicional * $RATION * $DOLAROPERATIVO * $RECARGOTARJETA +
            ($packageWeight / 1000) * $FLETEXKG * $DOLAROFICIAL * $RECARGOTARJETA +
            $COSTOFIJO * $DOLAROFICIAL * $RECARGOTARJETA
        );
    }

    $metodoKg = (
        $costoAdicional * $RATIOKG * $DOLAROFICIAL * $RECARGOTARJETA +
        ($packageWeight / 1000) * 50 * $DOLAROFICIAL * $RECARGOTARJETA +
        $COSTOFIJO * $DOLAROFICIAL * $RECARGOTARJETA
    );

    $calculo = (int)floor(min($metodoActual, $metodoKg));
    return $calculo;
}

/**
 * Calcula detalle de precios (tarjeta, transferencia, USD, express) replicando el original.
 */
function calcular_precios_detalle(float $newPrice, float $packageWeight, array $categoryTree): array {
    $DOLARINOVA = 1500.0;
    $DOLAROFICIAL = 1600.0;
    $DOLAROPERATIVO = 1650.0;
    $COSTOFIJO = 10.0;
    $DESCEFECTIVO = 0.85;
    $DESCTRANSFERENCIA = 0.909090;
    $RECARGOTARJETA = 1.1;
    $RATIOKG = 1.5;
    $RATIOP = 1.71;
    $RATIOC = 1.55;
    $RATION = 1.7;
    $FLETEXKG = 25.0;

    $specialOld = [13896617011, 2642129011, 193870011, 1292110011, 281052, 3109924011, 3017941];
    $specialNew = [172421, 4943760011, 11910405011, 7161075011, 7161091011, 3350161, 11608080011, 172659, 6427814011, 294940, 6469269011, 16227128011, 3443921, 3347871, 1292115011];

    $isOld = false;
    $isNew = false;
    foreach ($categoryTree as $c) {
        if (isset($c['catId'])) {
            $catId = (int)$c['catId'];
            if (in_array($catId, $specialOld, true)) $isOld = true;
            if (in_array($catId, $specialNew, true)) $isNew = true;
        }
    }

    $costoAdicional = ($newPrice / 100 > 1000)
        ? (($newPrice / 100 - 1000) * 1.01 + 1000)
        : ($newPrice / 100);

    if ($isOld) {
        $metodoActual = (
            $costoAdicional * $RATIOC * $DOLAROPERATIVO * $RECARGOTARJETA +
            ($packageWeight / 1000) * $FLETEXKG * $DOLAROFICIAL * $RECARGOTARJETA +
            $COSTOFIJO * $DOLAROFICIAL * $RECARGOTARJETA
        );
    } elseif ($isNew) {
        $metodoActual = (
            $costoAdicional * $RATIOP * $DOLAROPERATIVO * $RECARGOTARJETA +
            ($packageWeight / 1000) * $FLETEXKG * $DOLAROFICIAL * $RECARGOTARJETA +
            $COSTOFIJO * $DOLAROFICIAL * $RECARGOTARJETA
        );
    } else {
        $metodoActual = (
            $costoAdicional * $RATION * $DOLAROPERATIVO * $RECARGOTARJETA +
            ($packageWeight / 1000) * $FLETEXKG * $DOLAROFICIAL * $RECARGOTARJETA +
            $COSTOFIJO * $DOLAROFICIAL * $RECARGOTARJETA
        );
    }

    $metodoKg = (
        $costoAdicional * $RATIOKG * $DOLAROFICIAL * $RECARGOTARJETA +
        ($packageWeight / 1000) * 50 * $DOLAROFICIAL * $RECARGOTARJETA +
        $COSTOFIJO * $DOLAROFICIAL * $RECARGOTARJETA
    );

    $calculo = (int)floor(min($metodoActual, $metodoKg));

    $transferencia = (int)floor($calculo * $DESCTRANSFERENCIA);
    $transferenciaUSD = (int)floor($transferencia / $DOLARINOVA);
    $efectivoUSD = (int)floor(($calculo * $DESCEFECTIVO) / $DOLARINOVA);
    $express = (int)round($calculo * 0.1);

    return [
        'tarjeta' => $calculo,
        'transferencia' => $transferencia,
        'transferenciaUSD' => $transferenciaUSD,
        'efectivoUSD' => $efectivoUSD,
        'express' => $express,
    ];
}

/**
 * Helper para traer y normalizar datos de Keepa.
 * @return array [newPrice, packageWeight, categoryTree]
 */
function keepa_fetch_inputs(string $asin, ?string $keepaKey = null): array {
    if ($keepaKey === null || $keepaKey === '') {
        $keepaKey = getenv('KEEPA_KEY') ?: 'frgspbs92qg4fiqjgp5hil10o1hhqcmrh05ga6vfb953iun257q1or5tht125o3d';
    }
    if ($keepaKey === '' || $keepaKey === false) {
        throw new RuntimeException('Falta configurar KEEPA_KEY (o KEEPPA_KEY).');
    }

    $asinClean = substr($asin, 0, 10);
    $url = 'https://api.keepa.com/product?key=' . urlencode((string)$keepaKey) . '&domain=1&asin=' . urlencode($asinClean);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_ENCODING, '');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $response = curl_exec($ch);
    if ($response === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException($err !== '' ? $err : 'Error de red');
    }
    curl_close($ch);

    $data = json_decode($response, true);
    if (!is_array($data)) {
        throw new RuntimeException('Respuesta inválida de Keepa API');
    }
    
    // Check for API errors
    if (isset($data['error'])) {
        $errorMsg = is_array($data['error']) ? json_encode($data['error']) : (string)$data['error'];
        throw new RuntimeException('Error de Keepa API: ' . $errorMsg);
    }
    
    if (!isset($data['products']) || !is_array($data['products']) || count($data['products']) === 0) {
        throw new RuntimeException('Producto no encontrado (ASIN no existe o no disponible)');
    }
    
    if (!isset($data['products'][0])) {
        throw new RuntimeException('Producto no encontrado');
    }

    $product = $data['products'][0];

    $newPrice = 0.0;
    if (isset($product['csv'][1]) && is_array($product['csv'][1])) {
        $last = end($product['csv'][1]);
        if ($last !== 0 && $last !== null) {
            $newPrice = (float)$last;
        }
    }
    if ($newPrice === 0.0 && isset($product['csv'][0]) && is_array($product['csv'][0])) {
        $last = end($product['csv'][0]);
        if ($last !== 0 && $last !== null) {
            $newPrice = (float)$last;
        }
    }

    $packageWeight = 0.0;
    if (isset($product['packageWeight']) && (float)$product['packageWeight'] != 0.0) {
        $packageWeight = (float)$product['packageWeight'];
    } elseif (isset($product['itemWeight'])) {
        $packageWeight = (float)$product['itemWeight'];
    }

    if (($packageWeight == 0.0) && ($newPrice > 200)) {
        $packageWeight = 20000.0;
    }

    if ($newPrice === 0.0 || $newPrice < 10.0 || $packageWeight == 0.0) {
        throw new RuntimeException('No disponible en Amazon');
    }

    $categoryTree = isset($product['categoryTree']) && is_array($product['categoryTree'])
        ? $product['categoryTree']
        : [];

    return [$newPrice, $packageWeight, $categoryTree];
}

/**
 * Obtiene datos desde Keepa y devuelve SOLO el precio final (int).
 */
function keepa_get_price(string $asin, ?string $keepaKey = null): int {
    [$newPrice, $packageWeight, $categoryTree] = keepa_fetch_inputs($asin, $keepaKey);
    return calcular_precio_php($newPrice, $packageWeight, $categoryTree);
}

/**
 * Devuelve un mensaje HTML con precios: Tarjeta, Transferencia (ARS y USD), Efectivo (USD) y Envío Express.
 */
function keepa_get_price_message(string $asin, ?string $keepaKey = null): string {
    [$newPrice, $packageWeight, $categoryTree] = keepa_fetch_inputs($asin, $keepaKey);
    $det = calcular_precios_detalle($newPrice, $packageWeight, $categoryTree);

    $fmt = function (int $v): string {
        return number_format($v, 0, '', '.');
    };

    $fecha = date('d-m-Y');
    $tarjeta = $fmt($det['tarjeta']);
    $transf = $fmt($det['transferencia']);
    $transfUsd = $fmt($det['transferenciaUSD']);
    $cashUsd = $fmt($det['efectivoUSD']);
    $express = $fmt($det['express']);

    // Mensaje compacto, sin estilos, inspirado en tu código original
    $html = '';
    $html .= '🏷️ 💲 PRECIO con 💳 Tarjeta (hasta 3 cuotas sin interés) — 📅 Hoy ' . $fecha . "\n";
    $html .= 'Tarjeta: $' . $tarjeta . "\n";
    $html .= '🏦 Transferencia: $' . $transf . ' (o USD ' . $transfUsd . ')' . "\n";
    $html .= '💵 Efectivo: USD ' . $cashUsd . "\n";
    $html .= '🚀 Envío Express: $' . $express . "\n";
    $html .= '(Incluye impuestos y costos de importación a Argentina)';

    return $html;
}

/**
 * Modo debug: devuelve JSON con entradas y todos los intermedios/constantes.
 */
function keepa_get_debug(string $asin, ?string $keepaKey = null): string {
    [$newPrice, $packageWeight, $categoryTree] = keepa_fetch_inputs($asin, $keepaKey);

    // Recalcular con detalle para exponer intermedios
    $DOLARINOVA = 1500.0;
    $DOLAROFICIAL = 1600.0;
    $DOLAROPERATIVO = 1650.0;
    $COSTOFIJO = 10.0;
    $DESCEFECTIVO = 0.85;
    $DESCTRANSFERENCIA = 0.909090;
    $RECARGOTARJETA = 1.1;
    $RATIOKG = 1.5;
    $RATIOP = 1.71;
    $RATIOC = 1.55;
    $RATION = 1.7;
    $FLETEXKG = 25.0;

    $specialOld = [13896617011, 2642129011, 193870011, 1292110011, 281052, 3109924011, 3017941];
    $specialNew = [172421, 4943760011, 11910405011, 7161075011, 7161091011, 3350161, 11608080011, 172659, 6427814011, 294940, 6469269011, 16227128011, 3443921, 3347871, 1292115011];

    $isOld = false; $isNew = false;
    foreach ($categoryTree as $c) {
        if (isset($c['catId'])) {
            $catId = (int)$c['catId'];
            if (in_array($catId, $specialOld, true)) $isOld = true;
            if (in_array($catId, $specialNew, true)) $isNew = true;
        }
    }

    $costoAdicional = ($newPrice / 100 > 1000)
        ? (($newPrice / 100 - 1000) * 1.01 + 1000)
        : ($newPrice / 100);

    if ($isOld) {
        $metodoActual = (
            $costoAdicional * $RATIOC * $DOLAROPERATIVO * $RECARGOTARJETA +
            ($packageWeight / 1000) * $FLETEXKG * $DOLAROFICIAL * $RECARGOTARJETA +
            $COSTOFIJO * $DOLAROFICIAL * $RECARGOTARJETA
        );
    } elseif ($isNew) {
        $metodoActual = (
            $costoAdicional * $RATIOP * $DOLAROPERATIVO * $RECARGOTARJETA +
            ($packageWeight / 1000) * $FLETEXKG * $DOLAROFICIAL * $RECARGOTARJETA +
            $COSTOFIJO * $DOLAROFICIAL * $RECARGOTARJETA
        );
    } else {
        $metodoActual = (
            $costoAdicional * $RATION * $DOLAROPERATIVO * $RECARGOTARJETA +
            ($packageWeight / 1000) * $FLETEXKG * $DOLAROFICIAL * $RECARGOTARJETA +
            $COSTOFIJO * $DOLAROFICIAL * $RECARGOTARJETA
        );
    }

    $metodoKg = (
        $costoAdicional * $RATIOKG * $DOLAROFICIAL * $RECARGOTARJETA +
        ($packageWeight / 1000) * 50 * $DOLAROFICIAL * $RECARGOTARJETA +
        $COSTOFIJO * $DOLAROFICIAL * $RECARGOTARJETA
    );

    $calculo = (int)floor(min($metodoActual, $metodoKg));
    $transferencia = (int)floor($calculo * $DESCTRANSFERENCIA);
    $transferenciaUSD = (int)floor($transferencia / $DOLARINOVA);
    $efectivoUSD = (int)floor(($calculo * $DESCEFECTIVO) / $DOLARINOVA);
    $express = (int)round($calculo * 0.1);

    $out = [
        'inputs' => [
            'newPrice' => $newPrice,
            'packageWeight' => $packageWeight,
            'categoryTreeLen' => count($categoryTree),
        ],
        'flags' => [ 'isOld' => $isOld, 'isNew' => $isNew ],
        'consts' => compact(
            'DOLARINOVA','DOLAROFICIAL','DOLAROPERATIVO','COSTOFIJO','DESCEFECTIVO','DESCTRANSFERENCIA','RECARGOTARJETA','RATIOKG','RATIOP','RATIOC','RATION','FLETEXKG'
        ),
        'intermedios' => [
            'costoAdicional' => $costoAdicional,
            'metodoActual' => $metodoActual,
            'metodoKg' => $metodoKg,
            'min' => min($metodoActual, $metodoKg)
        ],
        'resultados' => [
            'tarjeta' => $calculo,
            'transferencia' => $transferencia,
            'transferenciaUSD' => $transferenciaUSD,
            'efectivoUSD' => $efectivoUSD,
            'express' => $express,
        ],
    ];
    return json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

// Uso CLI: php keepa_price.php <ASIN>
if (PHP_SAPI === 'cli' && basename(__FILE__) === basename($_SERVER['argv'][0] ?? '')) {
    $asin = $argv[1] ?? '';
    $mode = $argv[2] ?? '';
    if ($asin === '') {
        fwrite(STDERR, "Uso: php keepa_price.php <ASIN> [raw|debug]\n");
        exit(1);
    }
    try {
        if ($mode === 'raw') {
            $price = keepa_get_price($asin);
            echo $price . PHP_EOL;
        } elseif ($mode === 'debug') {
            echo keepa_get_debug($asin) . PHP_EOL;
        } else {
            $msg = keepa_get_price_message($asin);
            echo $msg . PHP_EOL;
        }
    } catch (Throwable $e) {
        fwrite(STDERR, $e->getMessage() . PHP_EOL);
        exit(1);
    }
}


