// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @notice Minimal vault: pulls USDC margin when a user opens a paper position.
/// @dev `direction`: 0 = long, 1 = short. `leverage` is stored in events for off-chain / future use.
contract PrediPerpsVault {
    IERC20 public immutable usdc;

    event PositionOpened(
        address indexed user,
        string market,
        uint256 margin,
        uint256 leverage,
        uint8 direction
    );

    constructor(address usdc_) {
        usdc = IERC20(usdc_);
    }

    function openPosition(
        string calldata market,
        uint256 margin,
        uint256 leverage,
        uint8 direction
    ) external {
        require(direction < 2, "bad direction");
        require(margin > 0, "margin");
        require(usdc.transferFrom(msg.sender, address(this), margin), "transfer");
        emit PositionOpened(msg.sender, market, margin, leverage, direction);
    }
}
