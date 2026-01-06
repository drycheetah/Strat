// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Hello World Smart Contract for STRAT Blockchain
 *
 * This is a simple example contract that demonstrates:
 * - State variables
 * - Functions
 * - Events
 * - Access control
 *
 * Deploy this to test STRAT's smart contract functionality!
 */

contract HelloWorld {
    // State variables
    string public message;
    address public owner;
    uint256 public updateCount;

    // Event emitted when message is updated
    event MessageUpdated(string newMessage, address updatedBy, uint256 timestamp);

    // Constructor - runs once when contract is deployed
    constructor(string memory initialMessage) {
        message = initialMessage;
        owner = msg.sender;
        updateCount = 0;
    }

    // Read the current message (free, no gas cost)
    function getMessage() public view returns (string memory) {
        return message;
    }

    // Update the message (costs gas/fees)
    function setMessage(string memory newMessage) public {
        message = newMessage;
        updateCount++;
        emit MessageUpdated(newMessage, msg.sender, block.timestamp);
    }

    // Only owner can reset the contract
    function reset() public {
        require(msg.sender == owner, "Only owner can reset");
        message = "Hello, STRAT!";
        updateCount = 0;
    }

    // Get contract stats
    function getStats() public view returns (
        string memory currentMessage,
        address contractOwner,
        uint256 timesUpdated
    ) {
        return (message, owner, updateCount);
    }
}
