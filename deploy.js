require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

// Load ABI and Bytecode from compiled contract
const compiledPath = path.resolve(__dirname, 'build', 'contracts', 'TicketSale.json');
const compiled = JSON.parse(fs.readFileSync(compiledPath, 'utf8'));

const { MNEMONIC, INFURA_SEPOLIA_URL } = process.env;

const provider = new HDWalletProvider(
  MNEMONIC,
  INFURA_SEPOLIA_URL
);

const web3 = new Web3(provider);

const NUM_TICKETS = 100;
const TICKET_PRICE = web3.utils.toWei('0.01', 'ether'); // example price

(async () => {
  try {
    const accounts = await web3.eth.getAccounts();
    console.log("Deploying from account:", accounts[0]);

    const result = await new web3.eth.Contract(compiled.abi)
      .deploy({ data: compiled.bytecode, arguments: [NUM_TICKETS, TICKET_PRICE] })
      .send({ from: accounts[0], gas: '3000000' });

    console.log("Contract deployed at:", result.options.address);

    provider.engine.stop();
  } catch (error) {
    console.error("Deployment error:", error);
    provider.engine.stop();
  }
})();
