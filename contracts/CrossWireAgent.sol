// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CrossWireAgent
 * @notice Combines ERC-8004 AI Agent Trust & Identity layer with ERC-8183 Agentic Job Escrow Settlement.
 * Integrates with USDC gas fees and CrossWireRouterV2 protocol fee splits.
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract CrossWireAgent {
    // USDC Address on Arc Testnet
    address public constant USDC = 0x3600000000000000000000000000000000000000;
    
    // CrossWire fee collection wallet
    address public feeRecipient;
    uint256 public constant PROTOCOL_FEE_BPS = 25; // 0.25%
    
    // ERC-8004 Agent Identity Card
    struct AgentCard {
        string name;
        string agentCardUri; // Pointers to off-chain MCP/A2A endpoints
        uint256 reputationScore; // starts at 100
        bool active;
    }
    
    // ERC-8183 Job Escrow state machine
    enum JobStatus { CREATED, SUBMITTED, APPROVED, DISPUTED }
    
    struct Job {
        bytes32 jobHash;
        address client;
        address agent;
        uint256 escrowAmount;
        JobStatus status;
        string proofUri;
        bool exists;
    }
    
    // Registries
    mapping(address => AgentCard) public agents;
    mapping(bytes32 => Job) public jobs;
    
    // Events
    event AgentRegistered(address indexed agentAddress, string name, string agentCardUri);
    event JobCreated(bytes32 indexed jobHash, address indexed client, address indexed agent, uint256 amount);
    event JobProofSubmitted(bytes32 indexed jobHash, string proofUri);
    event JobApproved(bytes32 indexed jobHash, uint256 payout, uint256 fee);
    event JobDisputed(bytes32 indexed jobHash);

    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice ERC-8004 Identity Registration
     */
    function registerAgent(string calldata _name, string calldata _agentCardUri) external {
        agents[msg.sender] = AgentCard({
            name: _name,
            agentCardUri: _agentCardUri,
            reputationScore: 100,
            active: true
        });
        emit AgentRegistered(msg.sender, _name, _agentCardUri);
    }
    
    /**
     * @notice Update agent status or reputation
     */
    function updateAgentReputation(address _agent, uint256 _newScore) external {
        require(msg.sender == feeRecipient, "Only admin can update score");
        require(agents[_agent].active, "Agent not active");
        agents[_agent].reputationScore = _newScore;
    }

    /**
     * @notice ERC-8183 Job Creation with Escrow lockup
     */
    function createJob(bytes32 _jobHash, address _agent, uint256 _amount) external {
        require(_amount > 0, "Amount must be positive");
        require(agents[_agent].active, "Target agent must be registered");
        require(!jobs[_jobHash].exists, "Job already exists");
        
        // Deposit USDC into escrow contract
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), _amount),
            "USDC escrow deposit failed"
        );
        
        jobs[_jobHash] = Job({
            jobHash: _jobHash,
            client: msg.sender,
            agent: _agent,
            escrowAmount: _amount,
            status: JobStatus.CREATED,
            proofUri: "",
            exists: true
        });
        
        emit JobCreated(_jobHash, msg.sender, _agent, _amount);
    }

    /**
     * @notice Agent submits deliverables proof
     */
    function submitProof(bytes32 _jobHash, string calldata _proofUri) external {
        Job storage job = jobs[_jobHash];
        require(job.exists, "Job not found");
        require(msg.sender == job.agent, "Only assigned agent can submit proof");
        require(job.status == JobStatus.CREATED, "Invalid job status");
        
        job.status = JobStatus.SUBMITTED;
        job.proofUri = _proofUri;
        
        emit JobProofSubmitted(_jobHash, _proofUri);
    }

    /**
     * @notice Client releases escrow to agent, charging protocol fee
     */
    function releaseEscrow(bytes32 _jobHash) external {
        Job storage job = jobs[_jobHash];
        require(job.exists, "Job not found");
        require(msg.sender == job.client, "Only client can release escrow");
        require(job.status == JobStatus.SUBMITTED, "Job must have proof submitted");
        
        job.status = JobStatus.APPROVED;
        
        uint256 fee = (job.escrowAmount * PROTOCOL_FEE_BPS) / 10000;
        uint256 payout = job.escrowAmount - fee;
        
        // Distribute fee
        if (fee > 0) {
            require(IERC20(USDC).transfer(feeRecipient, fee), "Fee payout failed");
        }
        
        // Pay agent
        require(IERC20(USDC).transfer(job.agent, payout), "Agent payout failed");
        
        // Reward reputation
        if (agents[job.agent].reputationScore < 100) {
            agents[job.agent].reputationScore += 1;
        }
        
        emit JobApproved(_jobHash, payout, fee);
    }

    /**
     * @notice Client triggers dispute
     */
    function disputeJob(bytes32 _jobHash) external {
        Job storage job = jobs[_jobHash];
        require(job.exists, "Job not found");
        require(msg.sender == job.client, "Only client can dispute");
        require(job.status == JobStatus.SUBMITTED, "Can only dispute submitted tasks");
        
        job.status = JobStatus.DISPUTED;
        
        // Penalize reputation score for dispute
        if (agents[job.agent].reputationScore > 50) {
            agents[job.agent].reputationScore -= 10;
        } else {
            agents[job.agent].reputationScore = 40;
        }
        
        emit JobDisputed(_jobHash);
    }
}
