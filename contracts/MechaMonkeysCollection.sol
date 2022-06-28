pragma solidity ^0.8.0;

contract MechaMonkeysCollection {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {}
}
