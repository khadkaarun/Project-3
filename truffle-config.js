module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,            // or 8545 depending on Ganache setup
      network_id: "*",
    }
  },
  compilers: {
    solc: {
      version: "0.8.17"
    }
  }
};
