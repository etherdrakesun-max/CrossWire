export const crossWireRouterAbi = [
  // ── Core Wire Operations ──
  {
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'refHash', type: 'bytes32' },
      { name: 'purposeCode', type: 'uint8' },
      { name: 'memo', type: 'string' },
    ],
    name: 'initiateWire',
    outputs: [{ name: 'wireId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'sendRemittance',
    outputs: [{ name: 'wireId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'recipients', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'references', type: 'bytes32[]' },
      { name: 'purposeCodes', type: 'uint8[]' },
    ],
    name: 'batchInitiateWires',
    outputs: [{ name: 'wireIds', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // ── Approval ──
  {
    inputs: [{ name: 'wireId', type: 'uint256' }],
    name: 'approveWire',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'wireId', type: 'uint256' }],
    name: 'cancelWire',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // ── View ──
  {
    inputs: [{ name: 'wireId', type: 'uint256' }],
    name: 'getWire',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'sender', type: 'address' },
          { name: 'recipient', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'feeAmount', type: 'uint256' },
          { name: 'refHash', type: 'bytes32' },
          { name: 'purposeCode', type: 'uint8' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'needsApproval', type: 'bool' },
          { name: 'approvalCount', type: 'uint256' },
          { name: 'memo', type: 'string' },
        ],
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getStats',
    outputs: [
      { name: 'totalWires', type: 'uint256' },
      { name: 'totalVolume', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'wireCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalVolumeSettled',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'approvalThreshold',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feeBasisPoints',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feeVault',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalFeesCollected',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'wireId', type: 'uint256' }],
    name: 'cancelledAt',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // ── Admin ──
  {
    inputs: [
      { name: '_feeBasisPoints', type: 'uint256' },
      { name: '_feeVault', type: 'address' },
    ],
    name: 'configureFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdrawFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // ── Events ──
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'wireId', type: 'uint256' },
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'reference', type: 'bytes32' },
      { indexed: false, name: 'purposeCode', type: 'uint8' },
      { indexed: false, name: 'memo', type: 'string' },
    ],
    name: 'WireInitiated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'wireId', type: 'uint256' },
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'reference', type: 'bytes32' },
    ],
    name: 'WireExecuted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'wireId', type: 'uint256' },
      { indexed: true, name: 'approver', type: 'address' },
      { indexed: false, name: 'approvalCount', type: 'uint256' },
    ],
    name: 'WireApproved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'wireId', type: 'uint256' },
      { indexed: true, name: 'canceller', type: 'address' },
    ],
    name: 'WireCancelled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'wireId', type: 'uint256' },
      { indexed: false, name: 'feeAmount', type: 'uint256' },
      { indexed: true, name: 'vault', type: 'address' },
    ],
    name: 'WireFeeCollected',
    type: 'event',
  },
] as const

// Standard ERC-20 ABI subset for USDC approve + balanceOf
export const erc20Abi = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const
