const axios = require("axios");
const { getValues, setItems } = require("./handleJson");

//agregar un lock simple para evitar múltiples refrescos concurrentes
class MercadoLibreAPI {
  static instance = null;

  static init() {
    if (!MercadoLibreAPI.instance) {
      MercadoLibreAPI.instance = new MercadoLibreAPI();
    }
    return MercadoLibreAPI.instance;
  }

  static getInstance() {
    return MercadoLibreAPI.instance || MercadoLibreAPI.init();
  }

  constructor() {
    const { CLIENT_ID, CLIENT_SECRET, TOKEN, REFRESH_TOKEN } = getValues([
      "CLIENT_ID",
      "CLIENT_SECRET",
      "TOKEN",
      "REFRESH_TOKEN",
    ]);

    this.accessToken = TOKEN;
    this.refreshToken = REFRESH_TOKEN;
    this.clientId = CLIENT_ID;
    this.clientSecret = CLIENT_SECRET;
    this.baseURL = "https://api.mercadolibre.com";

    this.tokenExpiration = null;
    this.thresholdPercentage = 0.2; // 20% del tiempo original
    this.tokenExpiresIn = 0;

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        if (this.shouldRefreshToken()) {
          await this.refreshAccessToken();
        }
        config.headers.Authorization = `Bearer ${this.accessToken}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // respaldo -> manejar renovación de tokens que ya estan expirados
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (
          error.response &&
          (error.response.status === 400 || error.response.status === 401) &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;

          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            originalRequest.headers[
              "Authorization"
            ] = `Bearer ${this.accessToken}`;
            return this.axiosInstance(originalRequest);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  shouldRefreshToken() {
    if (!this.tokenExpiration) return true;

    const now = Date.now();
    const timeLeft = this.tokenExpiration - now;
    const originalValidity = this.tokenExpiresIn * 1000; // s a ms

    return timeLeft < originalValidity * this.thresholdPercentage;
  }

  async refreshAccessToken() {
    try {
      console.log("Actualizando token...");

      const response = await axios.post(
        "https://api.mercadolibre.com/oauth/token",
        new URLSearchParams({
          grant_type: "refresh_token",
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;
      console.log("new-token", response.data);
      this.accessToken = access_token;
      this.refreshToken = refresh_token;
      setItems({ TOKEN: access_token, REFRESH_TOKEN: refresh_token });
      this.tokenExpiresIn = expires_in;
      this.tokenExpiration = Date.now() + expires_in * 1000;

      this.axiosInstance.defaults.headers[
        "Authorization"
      ] = `Bearer ${this.accessToken}`;
      console.log("Token actualizado:", this.accessToken);
      console.log("Nuevo refresh token:", this.refreshToken);
      console.log("Token expira en:", expires_in, "segundos");
      return true;
    } catch (error) {
      console.error("Error al refrescar el token de acceso:", error);
      return false;
    }
  }

  async searchProducts(
    query,
    { limit = 3, sort = null, include_global = false } = {}
  ) {
    try {
      const params = {
        status: "active",
        site_id: include_global ? "CBT" : "MLA",
        q: query,
        official_store_id: null,
        seller_type: "all",
      };

      if (sort) params.sort = sort;

      const response = await this.axiosInstance.get(`/products/search`, {
        params,
      });
      console.log("productsResponse", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Error searching products:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  //GTIN engloba los diferentes PIs (EAN, UPC, ISBN, etc).
  async searchProductsByGTIN(
    product_identifier,
    { limit = 10, sort = null, include_global = false } = {}
  ) {
    try {
      const params = {
        status: "active",
        site_id: include_global ? "CBT" : "MLA",
        product_identifier,
        // Excluir filtros de tiendas oficiales para obtener todos los vendedores
        official_store_id: null,
        seller_type: "all",
      };

      if (sort) params.sort = sort;

      const response = await this.axiosInstance.get("/products/search", {
        params,
      });
      console.log("productsResponse", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Error searching products by GTIN:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async getItem(productId, { getAll = true, limit = 50 } = {}) {
    try {
      if (!getAll) {
        const response = await this.axiosInstance.get(
          `/products/${productId}/items`,
          {
            params: { international_delivery_mode: "buy" },
          }
        );
        console.log("itemResponse", response.data);
        return response.data;
      }

      let allResults = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await this.axiosInstance.get(
          `/products/${productId}/items`,
          {
            params: { limit, offset },
          }
        );

        const data = response.data;
        allResults = allResults.concat(data.results || []);

        // Verificar si hay más páginas
        if (data.paging && data.paging.total > offset + data.results.length) {
          offset += limit;
          await new Promise((resolve) => setTimeout(resolve, 100));
        } else {
          hasMore = false;
        }
      }

      return {
        paging: {
          total: allResults.length,
          offset: 0,
          limit: allResults.length,
        },
        results: allResults,
      };
    } catch (error) {
      console.error("Error getting item:", error);
      throw error;
    }
  }

  async getSuggestedPrice(itemId) {
    try {
      const response = await this.axiosInstance.get(
        `/suggestions/items/${itemId}/details`
      );
      return response.data;
    } catch (error) {
      console.error(`Error getting suggested price for item ${itemId}:`, error);
      throw error;
    }
  }

  async checkPermissions() {
    try {
      const response = await this.axiosInstance.get("/users/me");
      return response.data;
    } catch (error) {
      console.error("Error checking permissions:", error);
      throw error;
    }
  }

  async getItems(productsIds, { getAll = true } = {}) {
    console.log("productsIds", productsIds);
    let results = [];
    try {
      const promises = productsIds.map(async (productId, index) => {
        try {
          await new Promise((resolve) => setTimeout(resolve, index * 50));
          const response = await this.getItem(productId, { getAll });
          return response.results || response;
        } catch (error) {
          console.log(`Error getting item ${productId}:`, {
            message: error.response?.data?.message || error.message,
            status: error.response?.status,
            error: error.response?.data?.error,
          });
          return [];
        }
      });

      const allResults = await Promise.all(promises);

      results = allResults.flat();

      return results;
    } catch (error) {
      console.log("Error general en getItems:", {
        message: error.response?.data?.message || error.message,
        status: error.response?.status,
        error: error.response?.data?.error,
      });
      throw error;
    }
  }

  async getProductPriceByQuery(
    query,
    { limit = 5, sort = "price_asc", include_global = false } = {}
  ) {
    try {
      // 1. Buscar productos por query
      const productsResponse = await this.searchProducts(query, {
        limit,
        sort,
        include_global,
      });

      if (!productsResponse.results || productsResponse.results.length === 0) {
        return { query, results: [], message: "No se encontraron productos" };
      }

      const productIds = productsResponse.results.map((product) => product.id);
      console.log("productIds", productIds);

      const itemsResponse = await this.getItems(productIds);
      console.log("itemsResponse", itemsResponse);

      return {
        query,
        productsFound: productsResponse.results.length,
        itemsFound: itemsResponse.length,
        results: itemsResponse,
        include_global,
      };
    } catch (error) {
      console.error(
        "Error getting product price:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async getProductPriceByGTIN(
    product_identifier,
    { limit = 10, sort = "price_asc", include_global = false } = {}
  ) {
    try {
      // 1. Buscar productos por GTIN
      const productsResponse = await this.searchProductsByGTIN(
        product_identifier,
        {
          limit,
          sort,
          include_global,
        }
      );

      if (!productsResponse.results || productsResponse.results.length === 0) {
        return {
          product_identifier,
          results: [],
          message: "No se encontraron productos",
        };
      }

      const productIds = productsResponse.results.map((product) => product.id);

      const itemsResponse = await this.getItems(productIds);

      return {
        product_identifier,
        productsFound: productsResponse.results.length,
        itemsFound: itemsResponse.length,
        results: itemsResponse,
        productDetails: productsResponse.results,
        include_global,
      };
    } catch (error) {
      console.error(
        "Error getting product price by GTIN:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async getProductDetail(productId) {
    try {
      const response = await this.axiosInstance.get(`/products/${productId}`);
      return response.data;
    } catch (error) {
      console.error("Error getting product detail:", error);
      throw error;
    }
  }
  async getSellerReputation(sellerId) {
    try {
      const response = await this.axiosInstance.get(`users/${sellerId}`);
      return response.data;
    } catch (error) {
      console.error("Error testing API:", error);
      throw error;
    }
  }

  async getShippingOptions(itemId, zipCode = "1100") {
    // destination: {
    //   zip_code: '1100',
    //   city: { id: null, name: null },
    //   state: { id: 'AR-C', name: 'Capital Federal' },
    //   country: { id: 'AR', name: 'Argentina' }
    // },
    // options: [
    //   {
    //     id: 3164054109,
    //     option_hash: '66837f7db16f28a7fb68dcb7d1e1ade6',
    //     name: 'Prioritario a domicilio',
    //     currency_id: 'ARS',
    //     base_cost: 6103.99,
    //     cost: 0,
    //     list_cost: 5238.49,
    //     display: 'recommended',
    //     shipping_method_id: 510445,
    //     shipping_method_type: 'next_day', 'express', 'three_days', 'standard'
    //     shipping_option_type: 'address',
    //     estimated_delivery_time: [Object],
    //     discount: [Object]
    //   },
    try {
      const response = await this.axiosInstance.get(
        `/items/${itemId}/shipping_options?zip_code=${zipCode}`
      );
      return response.data;
    } catch (error) {
      console.error("Error getting shipping options:", error);
      throw error;
    }
  }

  async getSellerItems(sellerId) {
    try {
      const response = await this.axiosInstance.get(
        `/users/${sellerId}/items/search`
      );
      return response.data;
    } catch (error) {
      console.error("Error getting seller items:", error);
      throw error;
    }
  }

  async searchProductsBySite(
    query,
    { limit = 50, sort = null, include_global = false } = {}
  ) {
    try {
      const siteId = include_global ? "CBT" : "MLA";
      const params = {
        q: query,
        limit,
        // Excluir filtros de tiendas oficiales
        official_store_id: null,
        seller_type: "all",
      };

      if (sort) params.sort = sort;

      const response = await this.axiosInstance.get(`/sites/${siteId}/search`, {
        params,
      });
      console.log("siteSearchResponse", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "Error searching products by site:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
}

module.exports = { MercadoLibreAPI };
