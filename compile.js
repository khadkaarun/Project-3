const path = require('path');
const fs = require('fs');
const solc = require('solc');

// Path to the contract
const contractPath = path.resolve(__dirname, 'contracts', 'TicketSale.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Compile input configuration
const input = {
    language: 'Solidity',
    sources: {
        'TicketSale.sol': {
            content: source
        }
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['abi', 'evm.bytecode']
            }
        }
    }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
    console.error(output.errors);
}

const abi = output.contracts['TicketSale.sol']['TicketSale'].abi;
const bytecode = output.contracts['TicketSale.sol']['TicketSale'].evm.bytecode.object;

console.log("ABI:\n", JSON.stringify(abi, null, 2));
console.log("\nBytecode:\n", bytecode);

// Optionally write them to files if needed
fs.writeFileSync('TicketSaleABI.txt', JSON.stringify(abi, null, 2));
fs.writeFileSync('TicketSaleBytecode.txt', bytecode);
