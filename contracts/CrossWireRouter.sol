// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CrossWireRouter
 * @notice Professional wire transfer protocol on Arc Testnet
 * @dev Uses USDC (ERC-20, 6 decimals) for settlement. Supports batch transfers,
 *      multi-sig approval, SWIFT-style references, and compliance audit trail.
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract CrossWireRouter {
    // ============================================================
    //                        STATE
    // ============================================================

    IERC20 public immutable usdc;
    address public owner;

    uint256 public wireCount;
    uint256 public totalVolumeSettled;
    uint256 public approvalThreshold; // Amount above which multi-sig is required (6 decimals)

    // Signatories for multi-sig approvals
    mapping(address => bool) public isSignatory;
    address[] public signatories;
    uint256 public requiredApprovals;

    struct WireTransfer {
        uint256 id;
        address sender;
        address recipient;
        uint256 amount;         // USDC amount (6 decimals)
        bytes32 refHash;        // SWIFT-style reference hash
        uint8 purposeCode;      // ISO 20022 purpose codes
        uint256 timestamp;
        bool executed;
        bool needsApproval;
        uint256 approvalCount;
        string memo;
    }

    mapping(uint256 => WireTransfer) public wires;
    mapping(uint256 => mapping(address => bool)) public wireApprovals;

    // ============================================================
    //                        EVENTS
    // ============================================================

    event WireInitiated(
        uint256 indexed wireId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        bytes32 refHash,
        uint8 purposeCode,
        string memo
    );

    event WireApproved(
        uint256 indexed wireId,
        address indexed approver,
        uint256 approvalCount
    );

    event WireExecuted(
        uint256 indexed wireId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        bytes32 refHash
    );

    event WireCancelled(uint256 indexed wireId, address indexed canceller);

    event SignatoryAdded(address indexed signatory);
    event SignatoryRemoved(address indexed signatory);
    event ThresholdUpdated(uint256 newThreshold);

    // ============================================================
    //                        MODIFIERS
    // ============================================================

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlySignatory() {
        require(isSignatory[msg.sender], "Not signatory");
        _;
    }

    // ============================================================
    //                        CONSTRUCTOR
    // ============================================================

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
        owner = msg.sender;
        approvalThreshold = 10000 * 1e6; // $10,000 USDC (6 decimals)
        requiredApprovals = 2;

        // Owner is first signatory
        isSignatory[msg.sender] = true;
        signatories.push(msg.sender);
        emit SignatoryAdded(msg.sender);
    }

    // ============================================================
    //                  CORE WIRE OPERATIONS
    // ============================================================

    /**
     * @notice Initiate a wire transfer with SWIFT-style metadata
     * @param recipient Destination wallet address
     * @param amount USDC amount (6 decimals)
     * @param refHash Encoded SWIFT-style reference (keccak256)
     * @param purposeCode ISO 20022 purpose code
     * @param memo Human-readable memo
     */
    function initiateWire(
        address recipient,
        uint256 amount,
        bytes32 refHash,
        uint8 purposeCode,
        string calldata memo
    ) external returns (uint256 wireId) {
        require(amount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");

        wireId = ++wireCount;
        bool needsApproval = amount >= approvalThreshold;

        wires[wireId] = WireTransfer({
            id: wireId,
            sender: msg.sender,
            recipient: recipient,
            amount: amount,
            refHash: refHash,
            purposeCode: purposeCode,
            timestamp: block.timestamp,
            executed: false,
            needsApproval: needsApproval,
            approvalCount: 0,
            memo: memo
        });

        emit WireInitiated(wireId, msg.sender, recipient, amount, refHash, purposeCode, memo);

        // Auto-execute if below threshold
        if (!needsApproval) {
            _executeWire(wireId);
        }
    }

    /**
     * @notice Simple remittance (backward compatible) - auto-executes
     * @param recipient Destination wallet address
     * @param amount USDC amount (6 decimals)
     */
    function sendRemittance(address recipient, uint256 amount) external returns (uint256 wireId) {
        require(amount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");

        wireId = ++wireCount;
        bytes32 ref = keccak256(abi.encodePacked(msg.sender, recipient, amount, block.timestamp));

        wires[wireId] = WireTransfer({
            id: wireId,
            sender: msg.sender,
            recipient: recipient,
            amount: amount,
            refHash: ref,
            purposeCode: 0,
            timestamp: block.timestamp,
            executed: false,
            needsApproval: false,
            approvalCount: 0,
            memo: ""
        });

        emit WireInitiated(wireId, msg.sender, recipient, amount, ref, 0, "");
        _executeWire(wireId);
    }

    /**
     * @notice Batch initiate wires from CSV data
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts (6 decimals)
     * @param references Array of reference hashes
     * @param purposeCodes Array of purpose codes
     */
    function batchInitiateWires(
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32[] calldata references,
        uint8[] calldata purposeCodes
    ) external returns (uint256[] memory wireIds) {
        require(recipients.length == amounts.length, "Length mismatch");
        require(recipients.length == references.length, "Length mismatch");
        require(recipients.length == purposeCodes.length, "Length mismatch");
        require(recipients.length <= 50, "Max 50 per batch");

        wireIds = new uint256[](recipients.length);

        for (uint256 i = 0; i < recipients.length; i++) {
            require(amounts[i] > 0, "Amount must be > 0");
            require(recipients[i] != address(0), "Invalid recipient");

            uint256 wireId = ++wireCount;
            wireIds[i] = wireId;
            bool needsApproval = amounts[i] >= approvalThreshold;

            wires[wireId] = WireTransfer({
                id: wireId,
                sender: msg.sender,
                recipient: recipients[i],
                amount: amounts[i],
                refHash: references[i],
                purposeCode: purposeCodes[i],
                timestamp: block.timestamp,
                executed: false,
                needsApproval: needsApproval,
                approvalCount: 0,
                memo: ""
            });

            emit WireInitiated(wireId, msg.sender, recipients[i], amounts[i], references[i], purposeCodes[i], "");

            if (!needsApproval) {
                _executeWire(wireId);
            }
        }
    }

    // ============================================================
    //                  APPROVAL OPERATIONS
    // ============================================================

    /**
     * @notice Approve a pending wire transfer (multi-sig)
     */
    function approveWire(uint256 wireId) external onlySignatory {
        WireTransfer storage wire = wires[wireId];
        require(wire.id != 0, "Wire not found");
        require(!wire.executed, "Already executed");
        require(wire.needsApproval, "No approval needed");
        require(!wireApprovals[wireId][msg.sender], "Already approved");

        wireApprovals[wireId][msg.sender] = true;
        wire.approvalCount++;

        emit WireApproved(wireId, msg.sender, wire.approvalCount);

        if (wire.approvalCount >= requiredApprovals) {
            _executeWire(wireId);
        }
    }

    /**
     * @notice Cancel a pending wire (only sender or owner)
     */
    function cancelWire(uint256 wireId) external {
        WireTransfer storage wire = wires[wireId];
        require(wire.id != 0, "Wire not found");
        require(!wire.executed, "Already executed");
        require(msg.sender == wire.sender || msg.sender == owner, "Not authorized");

        wire.executed = true; // Mark as done so it can't be approved later
        emit WireCancelled(wireId, msg.sender);
    }

    // ============================================================
    //                  INTERNAL
    // ============================================================

    function _executeWire(uint256 wireId) internal {
        WireTransfer storage wire = wires[wireId];
        require(!wire.executed, "Already executed");

        wire.executed = true;
        totalVolumeSettled += wire.amount;

        require(
            usdc.transferFrom(wire.sender, wire.recipient, wire.amount),
            "USDC transfer failed"
        );

        emit WireExecuted(wireId, wire.sender, wire.recipient, wire.amount, wire.refHash);
    }

    // ============================================================
    //                  ADMIN
    // ============================================================

    function addSignatory(address _signatory) external onlyOwner {
        require(!isSignatory[_signatory], "Already signatory");
        isSignatory[_signatory] = true;
        signatories.push(_signatory);
        emit SignatoryAdded(_signatory);
    }

    function removeSignatory(address _signatory) external onlyOwner {
        require(isSignatory[_signatory], "Not signatory");
        require(signatories.length > requiredApprovals, "Cannot go below threshold");
        isSignatory[_signatory] = false;
        emit SignatoryRemoved(_signatory);
    }

    function updateThreshold(uint256 _threshold) external onlyOwner {
        approvalThreshold = _threshold;
        emit ThresholdUpdated(_threshold);
    }

    function setRequiredApprovals(uint256 _required) external onlyOwner {
        require(_required > 0, "Must be > 0");
        requiredApprovals = _required;
    }

    // ============================================================
    //                  VIEW FUNCTIONS
    // ============================================================

    function getWire(uint256 wireId) external view returns (WireTransfer memory) {
        return wires[wireId];
    }

    function getSignatories() external view returns (address[] memory) {
        return signatories;
    }

    function getStats() external view returns (uint256 totalWires, uint256 totalVolume) {
        return (wireCount, totalVolumeSettled);
    }
}
