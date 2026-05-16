// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract CrossWireContract {
    IERC20 public usdcToken;

    event RemittanceSent(address indexed sender, address indexed recipient, uint256 amount);

    constructor(address _usdcToken) {
        usdcToken = IERC20(_usdcToken);
    }

    function sendRemittance(address recipient, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(usdcToken.transferFrom(msg.sender, recipient, amount), "Remittance failed");
        
        emit RemittanceSent(msg.sender, recipient, amount);
    }
}
