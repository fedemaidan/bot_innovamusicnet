class SockSingleton {
  constructor() {
    if (!SockSingleton.instance) {
      this.sock = {}; // Se guardará la instancia única de sock
      SockSingleton.instance = this;
    }

    return SockSingleton.instance;
  }
  setSock(sockInstance) {
    this.sock = sockInstance;
  }

  // Obtiene la instancia del sock
  getSock() {
    return this.sock;
  }
}

module.exports = new SockSingleton();
