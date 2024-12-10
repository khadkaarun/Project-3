const TicketSale = artifacts.require("TicketSale");

module.exports = function (deployer) {
  deployer.deploy(TicketSale, 100000, web3.utils.toWei('10', 'ether')); // Deploy with 100,000 tickets at 10 ether price each
};
