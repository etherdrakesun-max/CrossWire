// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CrossWireRouterV2
 * @notice Professional wire transfer protocol on Arc Testnet (V2)
 * @dev Uses USDC (ERC-20, 6 decimals) for settlement. Supports batch transfers,
 *      multi-sig approval, SWIFT-style references, and compliance audit trail.
 *      Includes protocol fee engine, reentrancy protection, and time-locked cancellation.
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract CrossWireRouterV2 {
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

    // Fee engine config
    uint256 public feeBasisPoints = 25; // 0.25%
    address public feeVault;
    uint256 public totalFeesCollected;

    enum WireStatus { PENDING, APPROVED, EXECUTED, CANCELLED }

    struct WireTransfer {
        uint256 id;
        address sender;
        address recipient;
        uint256 amount;
        uint256 feeAmount;
        bytes32 refHash;
        uint8 purposeCode;
        uint256 timestamp;
        WireStatus status;
        bool needsApproval;
        uint256 approvalCount;
        string memo;
    }

    mapping(uint256 => WireTransfer) public wires;
    mapping(uint256 => mapping(address => bool)) public wireApprovals;
    mapping(uint256 => uint256) public cancelledAt;

    // Custom lightweight reentrancy guard
    uint8 private _unlocked = 1;

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
    event WireFeeCollected(uint256 indexed wireId, uint256 feeAmount, address indexed vault);

    event SignatoryAdded(address indexed signatory);
    event SignatoryRemoved(address indexed signatory);
    event ThresholdUpdated(uint256 newThreshold);
    event FeeConfigUpdated(uint256 feeBasisPoints, address feeVault);

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

    modifier nonReentrant() {
        require(_unlocked == 1, "REENTRANCY_GUARD");
        _unlocked = 0;
        _;
        _unlocked = 1;
    }

    // ============================================================
    //                        CONSTRUCTOR
    // ============================================================

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
        owner = msg.sender;
        feeVault = msg.sender;
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
    ) external nonReentrant returns (uint256 wireId) {
        require(amount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");

        wireId = ++wireCount;
        bool needsApproval = amount >= approvalThreshold;
        uint256 feeAmount = (amount * feeBasisPoints) / 10000;

        wires[wireId] = WireTransfer({
            id: wireId,
            sender: msg.sender,
            recipient: recipient,
            amount: amount,
            feeAmount: feeAmount,
            refHash: refHash,
            purposeCode: purposeCode,
            timestamp: block.timestamp,
            status: WireStatus.PENDING,
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
    function sendRemittance(address recipient, uint256 amount) external nonReentrant returns (uint256 wireId) {
        require(amount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");

        wireId = ++wireCount;
        bytes32 ref = keccak256(abi.encodePacked(msg.sender, recipient, amount, block.timestamp));
        uint256 feeAmount = (amount * feeBasisPoints) / 10000;

        wires[wireId] = WireTransfer({
            id: wireId,
            sender: msg.sender,
            recipient: recipient,
            amount: amount,
            feeAmount: feeAmount,
            refHash: ref,
            purposeCode: 0,
            timestamp: block.timestamp,
            status: WireStatus.PENDING,
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
    ) external nonReentrant returns (uint256[] memory wireIds) {
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
            uint256 feeAmount = (amounts[i] * feeBasisPoints) / 10000;

            wires[wireId] = WireTransfer({
                id: wireId,
                sender: msg.sender,
                recipient: recipients[i],
                amount: amounts[i],
                feeAmount: feeAmount,
                refHash: references[i],
                purposeCode: purposeCodes[i],
                timestamp: block.timestamp,
                status: WireStatus.PENDING,
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
    function approveWire(uint256 wireId) external onlySignatory nonReentrant {
        WireTransfer storage wire = wires[wireId];
        require(wire.id != 0, "Wire not found");
        require(wire.status == WireStatus.PENDING, "Not pending");
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
     * @notice Cancel a pending wire (only sender or owner, after 1-hour time-lock)
     */
    function cancelWire(uint256 wireId) external nonReentrant {
        WireTransfer storage wire = wires[wireId];
        require(wire.id != 0, "Wire not found");
        require(wire.status == WireStatus.PENDING, "Not pending");
        require(msg.sender == wire.sender || msg.sender == owner, "Not authorized");
        require(block.timestamp >= wire.timestamp + 1 hours, "1-hour hold required");

        wire.status = WireStatus.CANCELLED;
        cancelledAt[wireId] = block.timestamp;

        emit WireCancelled(wireId, msg.sender);
    }

    // ============================================================
    //                  INTERNAL
    // ============================================================

    function _executeWire(uint256 wireId) internal {
        WireTransfer storage wire = wires[wireId];
        require(wire.status == WireStatus.PENDING, "Not pending");

        wire.status = WireStatus.EXECUTED;

        uint256 transferAmount = wire.amount - wire.feeAmount;

        totalVolumeSettled += transferAmount;
        totalFeesCollected += wire.feeAmount;

        if (wire.feeAmount > 0) {
            require(
                usdc.transferFrom(wire.sender, feeVault, wire.feeAmount),
                "Fee transfer failed"
            );
            emit WireFeeCollected(wireId, wire.feeAmount, feeVault);
        }

        require(
            usdc.transferFrom(wire.sender, wire.recipient, transferAmount),
            "USDC transfer failed"
        );

        emit WireExecuted(wireId, wire.sender, wire.recipient, transferAmount, wire.refHash);
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
        
        // Properly remove from signatories array
        uint256 length = signatories.length;
        for (uint256 i = 0; i < length; i++) {
            if (signatories[i] == _signatory) {
                signatories[i] = signatories[length - 1];
                signatories.pop();
                break;
            }
        }
        
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

    function configureFee(uint256 _feeBasisPoints, address _feeVault) external onlyOwner {
        require(_feeBasisPoints <= 1000, "Fee too high"); // max 10% safety
        require(_feeVault != address(0), "Invalid fee vault");
        feeBasisPoints = _feeBasisPoints;
        feeVault = _feeVault;
        emit FeeConfigUpdated(_feeBasisPoints, _feeVault);
    }

    /**
     * @notice Withdraw USDC from the contract balance (for safety/fees if sent directly)
     */
    function withdrawFees() external nonReentrant {
        require(msg.sender == feeVault, "Not fee vault");
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");
        require(usdc.transfer(feeVault, balance), "Transfer failed");
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
