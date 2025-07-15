const axios = require("axios");

async function getProductKeepa(asin) {
  const url = `https://api.keepa.com/product?key=${process.env.KEEPPA_KEY}&domain=1&asin=${asin}`;
  const { data } = await axios.get(url);
  return data;
}

module.exports = { getProductKeepa };
