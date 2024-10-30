const TicketSale = artifacts.require("TicketSale");

contract("TicketSale", (accounts) => {
  const [owner, alice, bob, claire] = accounts;
  let instance;

  beforeEach(async () => {
    instance = await TicketSale.new(100000, web3.utils.toWei("0.01", "ether"), { from: owner });
  });

  // Test case for buyTicket
  it("should allow a user to buy a ticket", async () => {
    await instance.buyTicket(1, { from: alice, value: web3.utils.toWei("0.01", "ether") });
    const ticketOwner = await instance.getTicketOf(alice);
    assert.equal(ticketOwner.toString(), "1", "Alice should own ticket #1");
  });

  // Test case for getTicketOf
  it("should return the ticket ID owned by an address", async () => {
    await instance.buyTicket(2, { from: bob, value: web3.utils.toWei("0.01", "ether") });
    const ticketId = await instance.getTicketOf(bob);
    assert.equal(ticketId.toString(), "2", "Bob should own ticket #2");
  });

  // Test case for offerSwap and acceptSwap
  it("should allow users to swap tickets", async function() {
    this.timeout(20000); // Increase timeout for this test

    // Alice and Bob buy their tickets first
    await instance.buyTicket(3, { from: alice, value: web3.utils.toWei("0.01", "ether") });
    await instance.buyTicket(4, { from: bob, value: web3.utils.toWei("0.01", "ether") });

    // Alice offers to swap her ticket with Bob's ticket (ticketId: 4)
    await instance.offerSwap(4, { from: alice });

    // Bob accepts the swap offer from Alice
    await instance.acceptSwap({ from: bob });

    // Fetch the ticket ownership details after the swap
    const aliceTicket = await instance.getTicketOf(alice);
    const bobTicket = await instance.getTicketOf(bob);

    assert.equal(aliceTicket.toString(), "4", "Alice should now own ticket #4");
    assert.equal(bobTicket.toString(), "3", "Bob should now own ticket #3");
  });

  // Test case for resaleTicket and acceptResale
  it("should allow a user to resale their ticket and another user to buy it", async function() {
    this.timeout(20000); // Increase timeout for this test

    // Alice buys ticket #5
    await instance.buyTicket(5, { from: alice, value: web3.utils.toWei("0.01", "ether") });
    // Alice decides to resale her ticket for 0.008 ether
    await instance.resaleTicket(web3.utils.toWei("0.008", "ether"), { from: alice });

    // Claire buys the ticket from Alice
    await instance.acceptResale(5, { from: claire, value: web3.utils.toWei("0.008", "ether") });

    // Fetch the new ownership details
    const ticketOwner = await instance.getTicketOf(claire);
    assert.equal(ticketOwner.toString(), "5", "Claire should now own ticket #5");

    // Confirm Alice no longer owns a ticket
    const aliceTicket = await instance.getTicketOf(alice);
    assert.equal(aliceTicket.toString(), "0", "Alice should no longer own a ticket");
  });

  // Additional test case for checkResale
  it("should display resale tickets and their prices", async () => {
    await instance.buyTicket(6, { from: alice, value: web3.utils.toWei("0.01", "ether") });
    await instance.resaleTicket(web3.utils.toWei("0.009", "ether"), { from: alice });

    const resaleTickets = await instance.checkResale();
    assert.equal(resaleTickets.length, 1, "There should be one ticket on resale");
    assert.equal(resaleTickets[0].toString(), "6", "Ticket #6 should be on resale");
  });
});
