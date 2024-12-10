// test/ticketSaleTest.js
const TicketSale = artifacts.require("TicketSale");
const { assert } = require('chai');

contract("TicketSale", (accounts) => {
  const owner = accounts[0];
  const alice = accounts[1];
  const bob = accounts[2];
  const claire = accounts[3];

  let instance;
  const NUM_TICKETS = 5;
  const PRICE = web3.utils.toWei('0.01', 'ether'); // 0.01 ETH

  before(async () => {
    // Deploy the contract before running tests
    instance = await TicketSale.new(NUM_TICKETS, PRICE, { from: owner });
  });

  it("should allow a user to buy a ticket", async () => {
    const tx = await instance.buyTicket(1, { from: alice, value: PRICE });
    const aliceTicket = await instance.getTicketOf(alice);
    assert.equal(aliceTicket.toNumber(), 1, "Alice should own ticket #1");

    // Verify event emission
    const event = tx.logs.find(log => log.event === 'TicketPurchased');
    assert.exists(event, "TicketPurchased event should be emitted");
    assert.equal(event.args.buyer, alice, "Event buyer should be Alice");
    assert.equal(event.args.ticketId.toNumber(), 1, "Event ticketId should be 1");
  });

  it("should not allow a user to buy a second ticket", async () => {
    try {
      await instance.buyTicket(2, { from: alice, value: PRICE });
      assert.fail("Alice should not be able to buy a second ticket");
    } catch (error) {
      assert.include(error.message, "You already own a ticket");
    }
  });

  it("should allow another user to buy a different ticket", async () => {
    const tx = await instance.buyTicket(2, { from: bob, value: PRICE });
    const bobTicket = await instance.getTicketOf(bob);
    assert.equal(bobTicket.toNumber(), 2, "Bob should own ticket #2");

    // Verify event emission
    const event = tx.logs.find(log => log.event === 'TicketPurchased');
    assert.exists(event, "TicketPurchased event should be emitted");
    assert.equal(event.args.buyer, bob, "Event buyer should be Bob");
    assert.equal(event.args.ticketId.toNumber(), 2, "Event ticketId should be 2");
  });

  it("should allow offering a swap", async () => {
    // Alice (ticket #1) offers to swap with Bob's ticket #2
    const tx = await instance.offerSwap(2, { from: alice });

    // Verify event emission
    const event = tx.logs.find(log => log.event === 'SwapOffered');
    assert.exists(event, "SwapOffered event should be emitted");
    assert.equal(event.args.offerer, alice, "Event offerer should be Alice");
    assert.equal(event.args.partner, bob, "Event partner should be Bob");
    assert.equal(event.args.ticketId.toNumber(), 2, "Event ticketId should be 2");
  });

  it("should accept swap offers correctly", async () => {
    // Bob accepts the swap offer from Alice
    const tx = await instance.acceptSwap(1, { from: bob }); // Bob accepts swapping Alice's ticket #1

    const aliceTicket = await instance.getTicketOf(alice);
    const bobTicket = await instance.getTicketOf(bob);
    assert.equal(aliceTicket.toNumber(), 2, "After swap, Alice should have #2");
    assert.equal(bobTicket.toNumber(), 1, "After swap, Bob should have #1");

    // Verify event emission
    const event = tx.logs.find(log => log.event === 'SwapAccepted');
    assert.exists(event, "SwapAccepted event should be emitted");
    assert.equal(event.args.accepter, bob, "Event accepter should be Bob");
    assert.equal(event.args.partner, alice, "Event partner should be Alice");
    assert.equal(event.args.myTicketId.toNumber(), 2, "Event myTicketId should be 2");
    assert.equal(event.args.partnerTicketId.toNumber(), 1, "Event partnerTicketId should be 1");
  });

  it("should put a ticket on resale", async () => {
    // Alice resells her ticket (#2)
    const resalePrice = web3.utils.toWei('0.005', 'ether'); // 0.005 ETH
    const tx = await instance.resaleTicket(resalePrice, { from: alice });
    const resaleList = await instance.checkResale();
    assert.equal(resaleList.length, 1, "One ticket should be on resale");
    assert.equal(resaleList[0].toNumber(), 2, "Ticket #2 is on resale");

    // Verify event emission
    const event = tx.logs.find(log => log.event === 'TicketResaled');
    assert.exists(event, "TicketResaled event should be emitted");
    assert.equal(event.args.owner, alice, "Event owner should be Alice");
    assert.equal(event.args.ticketId.toNumber(), 2, "Event ticketId should be 2");
    assert.equal(event.args.price.toString(), resalePrice, "Event price should match resale price");
  });

  it("should allow another user to accept resale", async () => {
    const resalePrice = web3.utils.toWei('0.005', 'ether');
    const tx = await instance.acceptResale(2, { from: claire, value: resalePrice });
    const claireTicket = await instance.getTicketOf(claire);
    assert.equal(claireTicket.toNumber(), 2, "Claire should now own ticket #2");
    const resaleList = await instance.checkResale();
    assert.equal(resaleList.length, 0, "No tickets should be on resale after purchase");

    // Verify event emission
    const event = tx.logs.find(log => log.event === 'ResaleAccepted');
    assert.exists(event, "ResaleAccepted event should be emitted");
    assert.equal(event.args.buyer, claire, "Event buyer should be Claire");
    assert.equal(event.args.seller, alice, "Event seller should be Alice");
    assert.equal(event.args.ticketId.toNumber(), 2, "Event ticketId should be 2");
    assert.equal(event.args.price.toString(), resalePrice, "Event price should match resale price");
  });

it("should allow a user to return their ticket and receive a refund minus service fee", async () => {
  // Step 1: Alice buys ticket #3
  const txBuy = await instance.buyTicket(3, { from: alice, value: PRICE });
  const aliceTicket = await instance.getTicketOf(alice);
  assert.equal(aliceTicket.toNumber(), 3, "Alice should own ticket #3");

  // Step 2: Record balances before return
  const aliceBalanceBefore = BigInt(await web3.eth.getBalance(alice));
  const ownerBalanceBefore = BigInt(await web3.eth.getBalance(owner));
  const contractBalanceBefore = BigInt(await web3.eth.getBalance(instance.address));
  console.log("Contract balance before return:", contractBalanceBefore.toString());

  // Step 3: Alice returns the ticket #3
  const txReturn = await instance.returnTicket({ from: alice });
  const txReceipt = await web3.eth.getTransactionReceipt(txReturn.tx);
  const gasUsed = BigInt(txReceipt.gasUsed);
  const txDetails = await web3.eth.getTransaction(txReturn.tx);
  const gasPrice = BigInt(txDetails.gasPrice);
  const gasCost = gasUsed * gasPrice;

  // Step 4: Calculate expected refund and service fee
  const refundAmount = BigInt(web3.utils.toWei('0.009', 'ether')); // 0.009 ETH
  const serviceFee = BigInt(web3.utils.toWei('0.001', 'ether')); // 0.001 ETH

  // Step 5: Record balances after return
  const aliceBalanceAfter = BigInt(await web3.eth.getBalance(alice));
  const ownerBalanceAfter = BigInt(await web3.eth.getBalance(owner));
  const contractBalanceAfter = BigInt(await web3.eth.getBalance(instance.address));
  console.log("Contract balance after return:", contractBalanceAfter.toString());

  // Step 6: Assertions

  // Alice's balance should have increased by approximately 0.009 ETH minus gas costs
  const aliceBalanceDifference = aliceBalanceAfter - aliceBalanceBefore + gasCost;
  assert.equal(
    aliceBalanceDifference.toString(),
    refundAmount.toString(),
    "Alice should receive the correct refund minus the service fee"
  );

  // Owner's balance should increase by the service fee
  const ownerBalanceDifference = ownerBalanceAfter - ownerBalanceBefore;
  assert.equal(
    ownerBalanceDifference.toString(),
    serviceFee.toString(),
    "Owner should receive the service fee from the returned ticket"
  );

  // Contract balance should decrease by the refund amount and service fee
  const expectedContractBalanceAfter = contractBalanceBefore - refundAmount - serviceFee;
  assert.equal(
    contractBalanceAfter.toString(),
    expectedContractBalanceAfter.toString(),
    "Contract balance should decrease by the refunded amount and service fee after ticket return"
  );

  // Ticket #3 should now be unowned
  const ticketOwner = await instance.ticketOwners(3);
  assert.equal(
    ticketOwner,
    '0x0000000000000000000000000000000000000000',
    "Ticket #3 should now be unowned after return"
  );

  // Alice should no longer own any ticket
  const aliceTicketAfter = await instance.getTicketOf(alice);
  assert.equal(
    aliceTicketAfter.toNumber(),
    0,
    "Alice should no longer own any ticket after returning ticket #3"
  );

  // Verify event emission for returnTicket
  const logs = await instance.getPastEvents('TicketReturned', {
    fromBlock: txReceipt.blockNumber,
    toBlock: txReceipt.blockNumber
  });
  assert.isAtLeast(logs.length, 1, "TicketReturned event should be emitted");
  const eventReturn = logs[0];
  assert.equal(eventReturn.args.owner, alice, "Event owner should be Alice");
  assert.equal(eventReturn.args.ticketId.toNumber(), 3, "Event ticketId should be 3");
});

  

  
});
