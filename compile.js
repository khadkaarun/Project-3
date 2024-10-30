// compile.js

const path = require('path');
const fs = require('fs');
const solc = require('solc');

// Path to the Solidity file
const contractPath = path.resolve(__dirname, 'contracts', 'TicketSale.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Prepare input for the Solidity compiler
const input = {
  language: 'Solidity',
  sources: {
    'TicketSale.sol': {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object'],
      },
    },
  },
};

// Compile the contract
const compiled = JSON.parse(solc.compile(JSON.stringify(input)));

// Check for compilation errors
if (compiled.errors) {
  for (const error of compiled.errors) {
    console.error(error.formattedMessage);
  }
}

// Extract ABI and bytecode
const contractName = 'TicketSale';
const abi = compiled.contracts['TicketSale.sol'][contractName].abi;
const bytecode = compiled.contracts['TicketSale.sol'][contractName].evm.bytecode.object;

// Output ABI and bytecode to the console
console.log('ABI:', JSON.stringify(abi, null, 2));
console.log('Bytecode:', bytecode);
