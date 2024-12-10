// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

contract TicketSale {
    address public owner;
    uint public ticketPrice;
    uint public numTickets;
    
    // Mappings to track ticket ownership and resale listings
    mapping(uint => address) public ticketOwners;
    mapping(address => uint) public ticketsOwned;
    mapping(address => address) public swapOffers;
    mapping(uint => uint) public resaleTickets;

    // Events for better tracking and frontend integration
    event TicketPurchased(address indexed buyer, uint ticketId);
    event SwapOffered(address indexed offerer, address indexed partner, uint ticketId);
    event SwapAccepted(address indexed accepter, address indexed partner, uint myTicketId, uint partnerTicketId);
    event TicketResaled(address indexed owner, uint ticketId, uint price);
    event ResaleAccepted(address indexed buyer, address indexed seller, uint ticketId, uint price);
    event TicketReturned(address indexed owner, uint ticketId);

    constructor(uint _numTickets, uint _price) {
        owner = msg.sender;
        ticketPrice = _price;
        numTickets = _numTickets;
    }

    // Buy a ticket
    function buyTicket(uint ticketId) public payable {
        require(ticketId > 0 && ticketId <= numTickets, "Invalid ticket ID");
        require(ticketOwners[ticketId] == address(0), "Ticket already sold");
        require(ticketsOwned[msg.sender] == 0, "You already own a ticket");
        require(msg.value == ticketPrice, "Incorrect ticket price");

        // Calculate service fee (10%)
        uint serviceFee = ticketPrice / 10; // 0.001 ETH if ticketPrice is 0.01 ETH

        // Transfer service fee to owner
        (bool successOwner, ) = owner.call{value: serviceFee}("");
        require(successOwner, "Transfer to owner failed");

        // The remaining 0.009 ETH stays in the contract as refund pool

        // Update ownership mappings
        ticketOwners[ticketId] = msg.sender;
        ticketsOwned[msg.sender] = ticketId;

        // Emit event
        emit TicketPurchased(msg.sender, ticketId);
    }

    // Get the ticket ID owned by a person
    function getTicketOf(address person) public view returns (uint) {
        return ticketsOwned[person];
    }

    // Offer a swap with another user's ticket
    function offerSwap(uint ticketId) public {
        require(ticketsOwned[msg.sender] != 0, "You do not own a ticket");
        require(ticketOwners[ticketId] != address(0), "Invalid ticket ID");
        address partner = ticketOwners[ticketId];
        require(partner != msg.sender, "Cannot swap with yourself");
        require(swapOffers[partner] == address(0), "Swap offer already exists");

        swapOffers[partner] = msg.sender;

        emit SwapOffered(msg.sender, partner, ticketId);
    }

    // Accept a swap offer
    function acceptSwap(uint partnerTicketId) public {
        address partner = ticketOwners[partnerTicketId];
        require(swapOffers[msg.sender] == partner, "No valid swap offer found");
        require(ticketsOwned[partner] != 0, "Partner does not own a ticket");
        require(ticketsOwned[msg.sender] != 0, "You do not own a ticket");

        uint myTicket = ticketsOwned[msg.sender];
        uint partnerTicket = ticketsOwned[partner];

        // Swap tickets
        ticketsOwned[msg.sender] = partnerTicket;
        ticketsOwned[partner] = myTicket;
        ticketOwners[myTicket] = partner;
        ticketOwners[partnerTicket] = msg.sender;

        // Remove swap offer
        delete swapOffers[msg.sender];

        emit SwapAccepted(msg.sender, partner, myTicket, partnerTicket);
    }

    // Resale a ticket
    function resaleTicket(uint price) public {
        uint ticketId = ticketsOwned[msg.sender];
        require(ticketId != 0, "You do not own a ticket");
        require(resaleTickets[ticketId] == 0, "Ticket already on resale");

        resaleTickets[ticketId] = price;

        emit TicketResaled(msg.sender, ticketId, price);
    }

    // Accept a resale offer
    function acceptResale(uint ticketId) public payable {
        uint resalePrice = resaleTickets[ticketId];
        require(resalePrice > 0, "Ticket not for resale");
        require(ticketOwners[ticketId] != msg.sender, "You already own this ticket");
        require(ticketsOwned[msg.sender] == 0, "You already own a ticket");
        require(msg.value == resalePrice, "Incorrect resale price");

        address currentOwner = ticketOwners[ticketId];
        require(currentOwner != address(0), "Invalid ticket owner");

        uint serviceFee = resalePrice / 10;
        uint sellerAmount = resalePrice - serviceFee;

        // Transfer funds
        (bool successSeller, ) = currentOwner.call{value: sellerAmount}("");
        require(successSeller, "Transfer to seller failed");

        (bool successOwner, ) = owner.call{value: serviceFee}("");
        require(successOwner, "Transfer to owner failed");

        // Transfer ownership
        ticketsOwned[currentOwner] = 0;
        ticketOwners[ticketId] = msg.sender;
        ticketsOwned[msg.sender] = ticketId;

        // Remove resale listing
        delete resaleTickets[ticketId];

        emit ResaleAccepted(msg.sender, currentOwner, ticketId, resalePrice);
    }

    // Check all tickets on resale
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

    // Return a ticket and receive a refund minus service fee
    function returnTicket() public {
    uint ticketId = ticketsOwned[msg.sender];
    require(ticketId != 0, "You do not own a ticket");

    // Calculate refund and service fee
    uint serviceFee = ticketPrice / 10; // 10% service fee
    uint refundAmount = ticketPrice - serviceFee; // 0.009 ETH

    // Ensure the contract has enough balance to process the refund
    require(address(this).balance >= refundAmount + serviceFee, "Contract has insufficient funds");

    // Remove ownership
    ticketsOwned[msg.sender] = 0;
    ticketOwners[ticketId] = address(0);

    // Transfer refund to the user
    (bool successRefund, ) = msg.sender.call{value: refundAmount}("");
    require(successRefund, "Refund to user failed");

    // Transfer service fee to the owner
    (bool successOwner, ) = owner.call{value: serviceFee}("");
    require(successOwner, "Transfer to owner failed");

    // Emit event
    emit TicketReturned(msg.sender, ticketId);
    }
    // Fallback function to accept Ether
    receive() external payable {}
}
