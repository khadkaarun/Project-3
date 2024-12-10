import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ticketSaleABI } from './ABI';

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  const [purchaseTicketId, setPurchaseTicketId] = useState('');
  const [swapTicketId, setSwapTicketId] = useState('');
  const [acceptOfferId, setAcceptOfferId] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [ticketNumberResult, setTicketNumberResult] = useState('');
  const [message, setMessage] = useState('');

  const contractAddress = import.meta.env.VITE_REACT_APP_CONTRACT_ADDRESS;

  useEffect(() => {
    const init = async () => {
      if (typeof window.ethereum === 'undefined') {
        console.error("MetaMask not found. Please install it.");
        alert("MetaMask is required to use this application. Please install it.");
        return;
      }

      try {
        console.log("Requesting MetaMask accounts...");
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        console.log("Initializing ethers provider and signer...");
        const _provider = new ethers.BrowserProvider(window.ethereum); // For ethers.js v6
        const _signer = await _provider.getSigner();
        const _contract = new ethers.Contract(contractAddress, ticketSaleABI, _signer);

        console.log("Ethers provider:", _provider);
        console.log("Ethers signer:", _signer);
        console.log("Contract instance initialized:", _contract);

        setProvider(_provider);
        setSigner(_signer);
        setContract(_contract);
        setMessage("Connected to MetaMask and contract successfully!");
      } catch (error) {
        console.error("Failed to initialize MetaMask or contract:", error);
        setMessage("Failed to connect to MetaMask. Please try again.");
      }
    };

    init();
  }, [contractAddress]);

  const handlePurchase = async () => {
    if (!contract) {
      console.error("Contract is not initialized.");
      setMessage("Contract is not initialized.");
      return;
    }
  
    if (!purchaseTicketId) {
      setMessage("Please enter a ticket ID to purchase.");
      return;
    }
  
    try {
      console.log("Fetching ticket price...");
      const price = await contract.ticketPrice(); // Get ticket price (BigInt)
      console.log("Raw ticket price value:", price);
  
      if (!price) {
        setMessage("Ticket price could not be fetched or is invalid.");
        console.error("Ticket price is undefined or null:", price);
        return;
      }
  
      // Handle formatEther for BigInt
      const formattedPrice = ethers.formatEther(price); // ethers v6
      console.log("Formatted ticket price:", formattedPrice);
  
      console.log("Sending transaction to buy ticket...");
      const tx = await contract.buyTicket(purchaseTicketId, { value: price });
      console.log("Transaction sent:", tx);
  
      await tx.wait();
      console.log("Transaction confirmed:", tx);
      setMessage(`Ticket #${purchaseTicketId} purchased successfully!`);
    } catch (err) {
      console.error("Purchase failed:", err);
      setMessage("Purchase failed: " + (err.data?.message || err.message));
    }
  };
  
  

  const handleOfferSwap = async () => {
    if (!contract) {
      console.error("Contract is not initialized.");
      return;
    }
    if (!swapTicketId) {
      setMessage("Please enter a ticket ID to offer swap.");
      return;
    }
    try {
      console.log(`Sending transaction to offer swap for ticket #${swapTicketId}...`);
      const tx = await contract.offerSwap(swapTicketId);
      console.log("Transaction sent:", tx);

      await tx.wait();
      console.log("Transaction confirmed:", tx);
      setMessage(`Swap offer created for ticket #${swapTicketId}`);
    } catch (err) {
      console.error("Swap offer failed:", err);
      setMessage("Swap offer failed: " + (err.data?.message || err.message));
    }
  };

  const handleAcceptOffer = async () => {
    if (!contract) {
      console.error("Contract is not initialized.");
      return;
    }
    if (!acceptOfferId) {
      setMessage("Please enter a ticket ID to accept offer.");
      return;
    }
    try {
      console.log(`Sending transaction to accept swap for ticket #${acceptOfferId}...`);
      const tx = await contract.acceptSwap(acceptOfferId);
      console.log("Transaction sent:", tx);

      await tx.wait();
      console.log("Transaction confirmed:", tx);
      setMessage(`Swap accepted for ticket ID: ${acceptOfferId}`);
    } catch (err) {
      console.error("Accept offer failed:", err);
      setMessage("Accept offer failed: " + (err.data?.message || err.message));
    }
  };

  const handleGetTicketNumber = async () => {
    if (!contract) {
      console.error("Contract is not initialized.");
      return;
    }
    if (!ownerAddress) {
      setMessage("Please enter an address.");
      return;
    }
    try {
      console.log(`Fetching ticket number for address: ${ownerAddress}`);
      const ticketId = await contract.getTicketOf(ownerAddress);
      console.log(`Ticket number fetched: ${ticketId.toString()}`);
      setTicketNumberResult(ticketId.toString());
      setMessage(`The ticket ID for ${ownerAddress} is ${ticketId}`);
    } catch (err) {
      console.error("Failed to get ticket number:", err);
      setMessage("Failed to get ticket number: " + (err.data?.message || err.message));
    }
  };

  const handleReturnTicket = async () => {
    if (!contract) {
      console.error("Contract is not initialized.");
      return;
    }
    try {
      console.log("Sending transaction to return ticket...");
      const tx = await contract.returnTicket();
      console.log("Transaction sent:", tx);

      await tx.wait();
      console.log("Transaction confirmed:", tx);
      setMessage("Ticket returned successfully!");
    } catch (err) {
      console.error("Return ticket failed:", err);
      setMessage("Return ticket failed: " + (err.data?.message || err.message));
    }
  };

  return (
    <div style={{ margin: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Ticket Sale Frontend (Sepolia)</h1>
  
      {/* Purchase Ticket */}
      <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
        <h2>Purchase Ticket</h2>
        <input
          type="number"
          placeholder="Ticket ID"
          value={purchaseTicketId}
          onChange={e => setPurchaseTicketId(e.target.value)}
          style={{ padding: '8px', marginRight: '10px', width: '200px' }}
        />
        <button onClick={handlePurchase} style={{ padding: '8px 16px' }}>Purchase</button>
      </div>
  
      {/* Offer Swap */}
      <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
        <h2>Offer Swap</h2>
        <input
          type="number"
          placeholder="Ticket ID to swap for"
          value={swapTicketId}
          onChange={e => setSwapTicketId(e.target.value)}
          style={{ padding: '8px', marginRight: '10px', width: '200px' }}
        />
        <button onClick={handleOfferSwap} style={{ padding: '8px 16px' }}>Offer Swap</button>
      </div>
  
      {/* Accept Offer */}
      <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
        <h2>Accept Offer</h2>
        <input
          type="text"
          placeholder="Ticket ID to accept"
          value={acceptOfferId}
          onChange={e => setAcceptOfferId(e.target.value)}
          style={{ padding: '8px', marginRight: '10px', width: '200px' }}
        />
        <button onClick={handleAcceptOffer} style={{ padding: '8px 16px' }}>Accept Offer</button>
      </div>
  
      {/* Get Ticket Number */}
      <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
        <h2>Get Ticket Number</h2>
        <input
          type="text"
          placeholder="Wallet Address"
          value={ownerAddress}
          onChange={e => setOwnerAddress(e.target.value)}
          style={{ padding: '8px', marginRight: '10px', width: '300px' }}
        />
        <button onClick={handleGetTicketNumber} style={{ padding: '8px 16px' }}>Get Ticket Number</button>
        {ticketNumberResult && (
          <div style={{ marginTop: '10px' }}>
            Your Ticket ID: <strong>{ticketNumberResult}</strong>
          </div>
        )}
      </div>
  
      {/* Return Ticket */}
      <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
        <h2>Return Ticket</h2>
        <button onClick={handleReturnTicket} style={{ padding: '8px 16px' }}>Return Ticket</button>
      </div>
  
      {/* Message */}
      {message && (
        <div style={{ color: 'blue', marginTop: '20px', padding: '10px', border: '1px solid blue', borderRadius: '5px', backgroundColor: '#f0f8ff' }}>
          {message}
        </div>
      )}
    </div>
  );
  
}

export default App;
