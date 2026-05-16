# CrossWire — Professional Wire Transfer Protocol on Arc

> Replace SWIFT with stablecoin rails. Cross-border USDC settlement with sub-second deterministic finality, multi-sig compliance, and full on-chain audit trail.

**Track 1**: Best Cross-Border Payments & Remittances Experience  
**Chain**: Arc Testnet (Chain ID: 5042002)  
**Settlement Token**: USDC (ERC-20, 6 decimals)

---

## Overview

CrossWire is a production-grade wire transfer protocol that replaces traditional SWIFT messaging with on-chain USDC settlement on the Arc blockchain. It provides:

- **Instant Settlement**: Deterministic finality in <1 second (vs. 1-5 days via SWIFT)
- **Zero Intermediaries**: Direct peer-to-peer settlement via smart contract
- **Enterprise Compliance**: Multi-sig approval workflow for high-value transfers with immutable audit trail
- **Cross-Chain Liquidity**: Bridge USDC from any supported chain via Circle's Cross-Chain Transfer Protocol (CCTP)
- **Batch Processing**: Execute up to 50 wire transfers in a single transaction

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     CrossWire Frontend                       │
│  Next.js 14 App Router  │  RainbowKit  │  Notion Design     │
├──────────────┬───────────┴──────────────┴──────────────┬──────┤
│  App Kit SDK │  Send │ Bridge │ Swap │ Unified Balance │      │
├──────────────┴────────────────────────────────────────┤      │
│              CrossWireRouter.sol (Arc Testnet)         │ viem │
│  initiateWire │ batchWires │ multiSig │ compliance     │      │
├───────────────────────────────────────────────────────┤      │
│           USDC (ERC-20, 6 dec) + CCTP v2              │      │
├───────────────────────────────────────────────────────┤      │
│              Arc Testnet (Chain ID: 5042002)           │      │
└───────────────────────────────────────────────────────┴──────┘
```

## Circle Developer Tools Integration

| Tool | Integration | Usage |
|------|------------|-------|
| **USDC** | ✅ Active | Settlement token for all wire transfers |
| **App Kit — Send** | ✅ Active | Same-chain USDC transfers |
| **App Kit — Bridge (CCTP)** | ✅ Active | Cross-chain USDC bridging with live pipeline visualization |
| **App Kit — Swap** | ✅ Available | USDC↔EURC conversion via StableFX |
| **App Kit — Unified Balance** | ✅ Available | Multi-chain balance aggregation |
| **Smart Contract Platform** | ✅ Active | CrossWireRouter deployed on Arc Testnet |
| **CCTP** | ✅ Active | Underlying cross-chain transfer protocol |

## Key Features

### 1. Wire Transfer with SWIFT-Style References
- ISO 20022 purpose codes
- Keccak256-encoded reference hashes stored on-chain
- Deterministic wire IDs for tracking

### 2. Multi-Sig Approval Workflow
- Transfers above $10,000 USDC require 2-of-3 signatory approval
- On-chain approval events create immutable audit trail
- Cancel pending wires (sender or owner only)

### 3. CCTP Bridge with Live Visualization
- Real-time 4-stage pipeline: Burn → Attestation → Mint → Complete
- Transaction hash links at each stage (Etherscan + Arcscan)
- Supports Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia

### 4. Batch Wire Transfers
- CSV upload (papaparse) or manual row entry
- Up to 50 wires in a single on-chain transaction
- Automatic total USDC approval calculation

### 5. Compliance Dashboard
- Immutable audit log from on-chain events
- Wire lifecycle tracking: INITIATED → APPROVED → EXECUTED
- Clickable Arcscan verification for every event

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Web3 | viem 2.x, wagmi 2.x |
| Wallet | RainbowKit (MetaMask, WalletConnect, Coinbase) |
| Circle SDK | @circle-fin/app-kit, @circle-fin/adapter-viem-v2 |
| Smart Contracts | Solidity 0.8.24, Hardhat |
| Design System | Notion-inspired (vanilla CSS) |
| Notifications | react-hot-toast |
| CSV Parsing | papaparse |

## Getting Started

### Prerequisites
- Node.js 18+
- MetaMask or WalletConnect-compatible wallet
- USDC on Arc Testnet (get from [Circle Faucet](https://faucet.circle.com))

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your keys
```

### Development

```bash
npm run dev
```

### Smart Contract Deployment

```bash
# Compile contracts
npx hardhat compile --config hardhat.config.cjs

# Deploy to Arc Testnet
npx hardhat run scripts/deploy.cjs --network arcTestnet --config hardhat.config.cjs
```

After deployment, update `NEXT_PUBLIC_CROSSWIRE_CONTRACT` in your `.env` file.

### Production Build

```bash
npm run build
```

## Project Structure

```
track-1-CrossWire/
├── app/
│   ├── components/         # Sidebar, Topbar
│   ├── send/page.tsx       # Wire transfer with pipeline
│   ├── bridge/page.tsx     # CCTP bridge visualizer
│   ├── batch/page.tsx      # Batch CSV wire transfers
│   ├── history/page.tsx    # On-chain transaction log
│   ├── compliance/page.tsx # Audit trail dashboard
│   ├── integrations/page.tsx # Circle product showcase
│   ├── page.tsx            # Dashboard with live stats
│   ├── layout.tsx          # Root layout + providers
│   └── globals.css         # Notion design system
├── contracts/
│   └── CrossWireRouter.sol # Main smart contract
├── lib/
│   ├── arc-config.ts       # Chain + address config
│   ├── contracts.ts        # ABI definitions
│   ├── web3-provider.tsx   # RainbowKit + wagmi setup
│   └── app-kit.ts          # Circle App Kit wrapper
├── scripts/
│   └── deploy.cjs          # Hardhat deployment script
├── hardhat.config.cjs      # Hardhat configuration
└── .env.example            # Environment template
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Deployer wallet private key (server-side only) |
| `NEXT_PUBLIC_ARC_RPC` | Arc Testnet RPC URL |
| `NEXT_PUBLIC_CROSSWIRE_CONTRACT` | Deployed contract address |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID |
| `NEXT_PUBLIC_CIRCLE_APP_KIT_KEY` | Circle Console App Kit key |

## Smart Contract — CrossWireRouter

### Functions

| Function | Description |
|----------|-------------|
| `initiateWire(recipient, amount, reference, purposeCode, memo)` | Create a wire with SWIFT-style metadata |
| `sendRemittance(recipient, amount)` | Simple auto-executing transfer |
| `batchInitiateWires(recipients[], amounts[], references[], purposeCodes[])` | Batch up to 50 wires |
| `approveWire(wireId)` | Multi-sig approval for high-value wires |
| `cancelWire(wireId)` | Cancel a pending wire |
| `getWire(wireId)` | View wire details |
| `getStats()` | Get total wire count and volume |

### Events

| Event | Emitted When |
|-------|-------------|
| `WireInitiated` | A new wire is created |
| `WireApproved` | A signatory approves a pending wire |
| `WireExecuted` | USDC is transferred and wire is settled |
| `WireCancelled` | A wire is cancelled before execution |

## License

MIT
