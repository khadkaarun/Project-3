pragma solidity ^0.5.16;

contract TicketSale {
    // Contract variables
    address public owner;
    uint public ticketPrice;
    uint public numTickets;
    mapping(uint => address) public ticketOwners; // Mapping from ticketId to owner's address
    mapping(address => uint) public ticketsOwned; // Mapping from address to ticketId
    mapping(uint => uint) public resaleTickets; // Mapping from ticketId to resale price
    mapping(address => address) public swapOffers; // Mapping to keep track of swap offers

    // Constructor
    constructor(uint _numTickets, uint _price) public {
        owner = msg.sender;
        ticketPrice = _price;
        numTickets = _numTickets;
    }

    // Buy Ticket
    function buyTicket(uint ticketId) public payable {
        require(ticketId > 0 && ticketId <= numTickets, "Invalid ticket ID");
        require(ticketOwners[ticketId] == address(0), "Ticket already sold");
        require(ticketsOwned[msg.sender] == 0, "You already own a ticket");
        require(msg.value == ticketPrice, "Incorrect ticket price");

        // Assign ticket to buyer
        ticketOwners[ticketId] = msg.sender;
        ticketsOwned[msg.sender] = ticketId;
    }

    // Get Ticket ID owned by an address
    function getTicketOf(address person) public view returns (uint) {
        return ticketsOwned[person];
    }

    // Offer Swap
    function offerSwap(uint ticketId) public {
        require(ticketsOwned[msg.sender] != 0, "You do not own a ticket");
        require(ticketOwners[ticketId] != address(0), "Invalid ticket ID");
        address partner = ticketOwners[ticketId];
        require(partner != msg.sender, "Cannot swap with yourself");
        require(swapOffers[partner] == address(0), "Swap offer already exists for this partner");

        swapOffers[partner] = msg.sender;
    }

    // Accept Swap Offer
    function acceptSwap() public {
        address partner = swapOffers[msg.sender];
        require(partner != address(0), "No valid swap offer found");
        require(ticketsOwned[partner] != 0, "Partner does not own a ticket");
        require(ticketsOwned[msg.sender] != 0, "You do not own a ticket");

        uint myTicket = ticketsOwned[msg.sender];
        uint partnerTicket = ticketsOwned[partner];

        // Perform the swap
        ticketsOwned[msg.sender] = partnerTicket;
        ticketsOwned[partner] = myTicket;

        ticketOwners[myTicket] = partner;
        ticketOwners[partnerTicket] = msg.sender;

        // Delete the swap offer
        delete swapOffers[msg.sender];
    }

    // Resale Ticket
    function resaleTicket(uint price) public {
        uint ticketId = ticketsOwned[msg.sender];
        require(ticketId != 0, "You do not own a ticket");
        resaleTickets[ticketId] = price;
    }

    // Accept Resale Ticket
    function acceptResale(uint ticketId) public payable {
        uint resalePrice = resaleTickets[ticketId];
        require(resalePrice > 0, "Ticket is not available for resale");
        require(ticketOwners[ticketId] != msg.sender, "You already own this ticket");
        require(msg.value == resalePrice, "Incorrect resale price");

        // 10% service fee
        uint serviceFee = resalePrice / 10;
        uint sellerAmount = resalePrice - serviceFee;
        address seller = ticketOwners[ticketId];
        require(seller != address(0), "Invalid ticket owner");

        // Transfer ownership
        ticketsOwned[seller] = 0;
        ticketOwners[ticketId] = msg.sender;
        ticketsOwned[msg.sender] = ticketId;

        // Pay the seller
        address(uint160(seller)).transfer(sellerAmount);
        address(uint160(owner)).transfer(serviceFee);

        // Remove from resale list
        delete resaleTickets[ticketId];
    }

    // Check Resale Tickets
    function checkResale() public view returns (uint[] memory) {
        uint count = 0;
        for (uint i = 1; i <= numTickets; i++) {
            if (resaleTickets[i] > 0) {
                count++;
            }
        }
        uint[] memory resaleList = new uint[](count);
        uint index = 0;
        for (uint i = 1; i <= numTickets; i++) {
            if (resaleTickets[i] > 0) {
                resaleList[index] = i;
                index++;
            }
        }
        return resaleList;
    }
}
