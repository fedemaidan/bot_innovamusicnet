const calcularEstadisticas = (results) => {
  if (!results || results.length === 0) {
    return null;
  }

  const precios = results.map((item) => item.price).sort((a, b) => a - b);

  const cantidad = precios.length;
  const precioMinimo = precios[0];
  const precioMaximo = precios[cantidad - 1];
  const rango = Math.round(precioMaximo - precioMinimo);

  // Media
  const suma = precios.reduce((acc, precio) => acc + precio, 0);
  const media = Math.round(suma / cantidad);

  // Mediana
  let mediana;
  if (cantidad % 2 === 0) {
    mediana = Math.round(
      (precios[cantidad / 2 - 1] + precios[cantidad / 2]) / 2
    );
  } else {
    mediana = precios[Math.floor(cantidad / 2)];
  }

  return {
    cantidad,
    precioMinimo,
    precioMaximo,
    rango,
    media,
    mediana,
  };
};

module.exports = {
  calcularEstadisticas,
};
