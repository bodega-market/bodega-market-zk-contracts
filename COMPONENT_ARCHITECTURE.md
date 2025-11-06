# Bodega Market - Component Architecture & Integration Plan

## Executive Summary

This document provides a detailed breakdown of the Bodega Market system architecture, component responsibilities, integration patterns, deployment strategies, and testing approaches. It serves as the technical blueprint for implementation and integration across all system layers.

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Web DApp    │  │  Mobile App  │  │  CLI Tools   │              │
│  │  (React)     │  │  (React      │  │  (Node.js)   │              │
│  │              │  │   Native)    │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WebSocket/JSON-RPC
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                              │
│                     (TypeScript/Node.js)                          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                   Bodega SDK (TypeScript)                  │   │
│  │  • Market Management API                                   │   │
│  │  • Position Management API                                 │   │
│  │  • Oracle Management API                                   │   │
│  │  • ZK Proof Generation Coordinator                         │   │
│  └────────────────────────────────────────────────────────────┘   │
│                              │                                     │
│         ┌────────────────────┼────────────────────┐                │
│         │                    │                    │                │
│         ▼                    ▼                    ▼                │
│  ┌─────────────┐      ┌─────────────┐     ┌─────────────┐         │
│  │  Market     │      │  Position   │     │   Oracle    │         │
│  │  Manager    │      │  Manager    │     │   Manager   │         │
│  │             │      │             │     │             │         │
│  │• Creation   │      │• Commitment │     │• Resolution │         │
│  │• Validation │      │• Proof Gen  │     │• Consensus  │         │
│  │• State Mgmt │      │• Settlement │     │• Disputes   │         │
│  └─────────────┘      └─────────────┘     └─────────────┘         │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ Midnight.js SDK
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                   SMART CONTRACT LAYER                             │
│                   (Compact/Midnight Blockchain)                   │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              BodegaMarketFactory.compact                   │   │
│  │  • Market creation and registration                        │   │
│  │  • Bond management                                         │   │
│  │  • Market discovery                                        │   │
│  └────────────────────────────────────────────────────────────┘   │
│                              │                                     │
│         ┌────────────────────┼────────────────────┐                │
│         │                    │                    │                │
│         ▼                    ▼                    ▼                │
│  ┌─────────────┐      ┌─────────────┐     ┌─────────────┐         │
│  │Prediction   │      │  Position   │     │   Oracle    │         │
│  │Market       │      │  Manager    │     │  Consensus  │         │
│  │             │      │             │     │             │         │
│  │• AMM Logic  │      │• ZK Circuits│     │• Multi-sig  │         │
│  │• Batching   │      │• Commitments│     │• Voting     │         │
│  │• Settlement │      │• Merkle Tree│     │• Disputes   │         │
│  └─────────────┘      └─────────────┘     └─────────────┘         │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                   BLOCKCHAIN LAYER                                 │
│                   (Midnight Network)                              │
│  • Consensus & Block Production                                   │
│  • ZK Proof Verification                                          │
│  • UTXO State Management                                          │
│  • Transaction Processing                                         │
└────────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow Architecture

```
┌─────────────┐                                         ┌─────────────┐
│   User      │                                         │  Blockchain │
│   Device    │                                         │   State     │
└─────────────┘                                         └─────────────┘
      │                                                        ▲
      │ 1. Place Bet Request                                  │
      ▼                                                        │
┌─────────────┐                                               │
│   Bodega    │                                               │
│    DApp     │                                               │
└─────────────┘                                               │
      │                                                        │
      │ 2. Generate Private Data                              │
      ▼                                                        │
┌─────────────┐                                               │
│   Local     │                                               │
│   Proof     │                                               │
│   Server    │                                               │
└─────────────┘                                               │
      │                                                        │
      │ 3. Generate ZK Proof                                  │
      │    + Commitment                                       │
      ▼                                                        │
┌─────────────┐                                               │
│ TypeScript  │                                               │
│ Application │                                               │
│   Layer     │                                               │
└─────────────┘                                               │
      │                                                        │
      │ 4. Submit Transaction                                 │
      │    (proof + commitment)                               │
      ▼                                                        │
┌─────────────┐                                               │
│  Compact    │                                               │
│  Contract   │                                               │
└─────────────┘                                               │
      │                                                        │
      │ 5. Verify Proof                                       │
      │    Update State                                       │
      ├────────────────────────────────────────────────────────┘
      │
      │ 6. Confirmation Event
      ▼
┌─────────────┐
│   User      │
│   Device    │
└─────────────┘
```

---

## 2. Client Layer Components

### 2.1 Web DApp (React)

**Technology Stack:**
- React 18+ with TypeScript
- Vite for build tooling
- TanStack Query for state management
- Wagmi/Midnight.js for wallet integration
- Tailwind CSS for styling

**Component Structure:**

```
src/
├── components/
│   ├── markets/
│   │   ├── MarketList.tsx          # Browse available markets
│   │   ├── MarketCard.tsx          # Individual market display
│   │   ├── MarketDetail.tsx        # Detailed market view
│   │   └── CreateMarket.tsx        # Market creation form
│   ├── positions/
│   │   ├── PlaceBet.tsx            # Betting interface
│   │   ├── PositionList.tsx        # User's positions
│   │   ├── PositionCard.tsx        # Individual position
│   │   └── ClaimWinnings.tsx       # Settlement interface
│   ├── oracle/
│   │   ├── OracleResolution.tsx    # Oracle submission UI
│   │   ├── DisputeForm.tsx         # Dispute submission
│   │   └── ConsensusDisplay.tsx    # Show consensus status
│   └── wallet/
│       ├── WalletConnect.tsx       # Wallet connection
│       ├── Balance.tsx             # Token balances
│       └── TransactionHistory.tsx  # Transaction list
├── hooks/
│   ├── useMarkets.ts               # Market data fetching
│   ├── usePositions.ts             # Position management
│   ├── useProofGeneration.ts      # ZK proof generation
│   └── useOracle.ts                # Oracle operations
├── services/
│   ├── bodegaSDK.ts                # SDK initialization
│   ├── proofService.ts             # Proof generation service
│   └── storageService.ts           # Local storage management
└── utils/
    ├── formatting.ts               # Display formatting
    ├── validation.ts               # Input validation
    └── constants.ts                # App constants
```

**Key Features:**
- Real-time market odds display
- Privacy-preserving bet placement
- Encrypted local position storage
- Transaction status tracking
- Responsive mobile-first design

**Privacy Features:**
- No server-side analytics
- Local-only private data storage
- Encrypted position data
- Privacy warnings for unique amounts
- Network privacy recommendations

### 2.2 Mobile App (React Native)

**Technology Stack:**
- React Native with TypeScript
- Expo for development and deployment
- React Navigation for routing
- AsyncStorage for local storage
- Native crypto modules for proof generation

**Component Structure:**

```
src/
├── screens/
│   ├── MarketsScreen.tsx           # Market browser
│   ├── MarketDetailScreen.tsx      # Market details
│   ├── BettingScreen.tsx           # Place bets
│   ├── PositionsScreen.tsx         # User positions
│   ├── ProfileScreen.tsx           # User profile
│   └── SettingsScreen.tsx          # App settings
├── components/
│   ├── MarketCard.tsx              # Market display
│   ├── BetSlider.tsx               # Bet amount selector
│   ├── OddsDisplay.tsx             # Current odds
│   └── ProofProgress.tsx           # Proof generation UI
├── navigation/
│   ├── AppNavigator.tsx            # Main navigation
│   └── TabNavigator.tsx            # Bottom tabs
└── services/
    ├── bodegaService.ts            # SDK wrapper
    ├── notificationService.ts      # Push notifications
    └── secureStorage.ts            # Encrypted storage
```

**Mobile-Specific Features:**
- Biometric authentication
- Push notifications for market events
- Offline position viewing
- QR code market sharing
- Haptic feedback

### 2.3 CLI Tools (Node.js)

**Technology Stack:**
- Node.js with TypeScript
- Commander.js for CLI framework
- Chalk for colored output
- Inquirer for interactive prompts

**Command Structure:**

```bash
bodega markets list                 # List active markets
bodega markets create               # Create new market
bodega markets get <id>             # Get market details

bodega bet place <market-id>        # Place a bet
bodega bet list                     # List user bets
bodega bet claim <position-id>      # Claim winnings

bodega oracle submit <market-id>    # Submit resolution
bodega oracle dispute <market-id>   # Dispute resolution
bodega oracle status <market-id>    # Check oracle status
```

**Use Cases:**
- Automated trading bots
- Oracle operator tools
- Bulk market creation
- Analytics and reporting
- Integration testing

---

## 3. Application Layer Components

### 3.1 Bodega SDK (TypeScript)

**Purpose:** Unified API for interacting with Bodega Market contracts.

**Architecture:**

```typescript
// Core SDK Structure
class BodegaSDK {
  // Sub-managers
  public markets: MarketManager;
  public positions: PositionManager;
  public oracles: OracleManager;
  public wallet: WalletManager;

  // Configuration
  private config: BodegaConfig;
  private provider: MidnightProvider;
  private signer: MidnightSigner;

  // Initialization
  constructor(config: BodegaConfig) { }
  async initialize(): Promise<void> { }

  // Event subscriptions
  on(event: string, handler: Function): void { }
  off(event: string, handler: Function): void { }
}

// Factory function
export async function createBodegaSDK(
  config: BodegaConfig
): Promise<BodegaSDK> {
  const sdk = new BodegaSDK(config);
  await sdk.initialize();
  return sdk;
}
```

**Key Responsibilities:**
- Contract interaction abstraction
- Transaction building and submission
- Event listening and parsing
- Error handling and retries
- State caching and synchronization

### 3.2 Market Manager

**Purpose:** Handles all market-related operations.

**Interface:**

```typescript
interface IMarketManager {
  // Market Creation
  createMarket(params: CreateMarketParams): Promise<MarketId>;
  cancelMarket(marketId: MarketId): Promise<TransactionReceipt>;

  // Market Queries
  getMarket(marketId: MarketId): Promise<MarketMetadata>;
  getMarketState(marketId: MarketId): Promise<MarketState>;
  listMarkets(filter?: MarketFilter): Promise<Market[]>;
  getMarketOdds(marketId: MarketId): Promise<{yes: number, no: number}>;

  // Market Subscriptions
  subscribeToMarket(marketId: MarketId, callback: Callback): Subscription;
  subscribeToMarketUpdates(callback: Callback): Subscription;
}

// Implementation
class MarketManager implements IMarketManager {
  private contract: BodegaMarketFactoryContract;
  private cache: MarketCache;
  private eventEmitter: EventEmitter;

  // Implementation methods...
}
```

**Key Features:**
- Market validation (question clarity, resolution criteria)
- Bond management
- State caching with TTL
- Real-time market updates via events
- Pagination for market lists

**Data Structures:**

```typescript
interface CreateMarketParams {
  question: string;                    // Market question
  description: string;                 // Detailed description
  resolutionCriteria: string;         // How to resolve
  endTime: Date;                      // When betting ends
  resolutionDeadline: Date;           // When resolution due
  bondAmount?: bigint;                // Creator bond (default: 100 NIGHT, refundable)
  minLiquidity?: bigint;              // Min liquidity (default: 1000 NIGHT)
  oracleConfig?: OracleConfig;        // Oracle configuration
}

// Market creation fees (in addition to bondAmount):
// - Listing fee: 10 NIGHT (non-refundable, sent to treasury)
// - Oracle setup fee: 50 NIGHT (non-refundable, sent to treasury)
// Total cost: bondAmount (default 100) + 10 + 50 = 160 NIGHT

interface Market {
  id: MarketId;
  metadata: MarketMetadata;
  state: MarketState;
  odds: {yes: number, no: number};
  volume: {yes: bigint, no: bigint};
  status: MarketStatus;  // CREATED, ACTIVE, ENDED, RESOLVED, SETTLED, DISPUTED, CANCELLED, PAUSED, ARCHIVED
  createdAt: Date;
  updatedAt: Date;
}

// Market lifecycle: CREATED → ACTIVE → ENDED → RESOLVED → SETTLED → ARCHIVED
// See PROTOCOL_SPEC.md Section 2 for complete state machine
```

### 3.3 Position Manager

**Purpose:** Manages private betting positions with ZK proofs.

**Interface:**

```typescript
interface IPositionManager {
  // Position Creation
  placeBet(params: PlaceBetParams): Promise<PositionId>;

  // Position Queries
  getPosition(positionId: PositionId): Promise<PrivatePosition>;
  getUserPositions(marketId?: MarketId): Promise<PrivatePosition[]>;
  calculatePortfolioValue(): Promise<bigint>;

  // Settlement
  claimWinnings(positionId: PositionId): Promise<bigint>;
  batchClaimWinnings(positionIds: PositionId[]): Promise<bigint>;

  // Proof Generation
  generatePositionProof(position: PrivatePosition): Promise<ZKProof>;
  generateSettlementProof(position: PrivatePosition, outcome: Outcome): Promise<ZKProof>;
}

// Implementation
class PositionManager implements IPositionManager {
  private contract: PredictionMarketContract;
  private proofService: ProofGenerationService;
  private storage: PrivateStorage;

  // Implementation methods...
}
```

**Key Features:**
- Local proof generation (never sends private data)
- Encrypted position storage
- Batch operations for gas efficiency
- Position P&L tracking
- Commitment verification

**Data Structures:**

```typescript
interface PlaceBetParams {
  marketId: MarketId;
  amount: bigint;                     // Bet amount in NIGHT
  outcome: Outcome;                   // YES or NO
  userId?: string;                    // Optional user identifier
}

interface PrivatePosition {
  id: PositionId;
  marketId: MarketId;
  userId: string;
  amount: bigint;
  outcome: Outcome;
  timestamp: Date;
  nonce: bigint;
  commitment: Hash;                   // Public commitment
  batchId?: string;                   // If part of batch
  merkleProof?: Hash[];               // Batch membership proof
  status: 'active' | 'claimed' | 'expired';
}
```

**Privacy Architecture:**

```typescript
// Private data never leaves device
class PrivateStorage {
  private encryptionKey: CryptoKey;

  // Store position with encryption
  async storePosition(position: PrivatePosition): Promise<void> {
    const encrypted = await this.encrypt(position);
    localStorage.setItem(`position_${position.id}`, encrypted);
  }

  // Retrieve and decrypt position
  async getPosition(positionId: PositionId): Promise<PrivatePosition> {
    const encrypted = localStorage.getItem(`position_${positionId}`);
    return await this.decrypt(encrypted);
  }

  // Clear all positions (user initiated only)
  async clearAll(): Promise<void> {
    // Implementation...
  }
}
```

### 3.4 Oracle Manager

**Purpose:** Handles oracle operations and dispute resolution.

**Interface:**

```typescript
interface IOracleManager {
  // Resolution Submission
  submitResolution(params: SubmitResolutionParams): Promise<TransactionReceipt>;
  proposeResolution(params: ProposeResolutionParams): Promise<ProposalId>;
  approveResolution(proposalId: ProposalId): Promise<TransactionReceipt>;

  // Disputes
  submitDispute(params: SubmitDisputeParams): Promise<DisputeId>;
  getDisputeStatus(disputeId: DisputeId): Promise<DisputeStatus>;

  // Queries
  getResolution(marketId: MarketId): Promise<Resolution>;
  getConsensusState(marketId: MarketId): Promise<ConsensusState>;
  isOracleOperator(address: Address): Promise<boolean>;
}

// Implementation
class OracleManager implements IOracleManager {
  private contract: BodegaOracleContract;
  private signer: MidnightSigner;

  // Implementation methods...
}
```

**Key Features:**
- Multi-signature oracle operations
- Evidence submission and validation
- Dispute period tracking
- Consensus calculation
- Operator permission management

**Data Structures:**

```typescript
interface SubmitResolutionParams {
  marketId: MarketId;
  outcome: Outcome;
  evidence: Evidence;
  confidence?: number;                // 0-100 confidence score
}

interface Evidence {
  sources: string[];                  // URLs to data sources
  description: string;                // Evidence description
  timestamp: Date;                    // When evidence collected
  hash?: Hash;                        // Hash for verification
  signature?: Signature;              // Cryptographic signature
}

interface ConsensusState {
  marketId: MarketId;
  votes: OracleVote[];
  threshold: number;                  // Required consensus %
  consensusReached: boolean;
  outcome?: Outcome;
  confidence: number;
}
```

### 3.5 Proof Generation Service

**Purpose:** Generates zero-knowledge proofs client-side.

**Architecture:**

```typescript
class ProofGenerationService {
  private worker: Worker;             // Web Worker for non-blocking
  private circuits: CircuitRegistry;

  // Initialize proof system
  async initialize(): Promise<void> {
    this.worker = new Worker('./proofWorker.js');
    await this.loadCircuits();
  }

  // Generate position commitment proof
  async generateCommitmentProof(
    position: PrivatePosition
  ): Promise<ZKProof> {
    return new Promise((resolve, reject) => {
      this.worker.postMessage({
        type: 'GENERATE_COMMITMENT_PROOF',
        data: {
          userId: position.userId,
          amount: position.amount,
          outcome: position.outcome,
          nonce: position.nonce
        }
      });

      this.worker.onmessage = (event) => {
        if (event.data.success) {
          resolve(event.data.proof);
        } else {
          reject(event.data.error);
        }
      };
    });
  }

  // Generate settlement proof
  async generateSettlementProof(
    position: PrivatePosition,
    marketOutcome: Outcome
  ): Promise<ZKProof> {
    // Implementation...
  }

  // Adaptive proof generation based on device
  private async optimizeForDevice(): Promise<ProofParams> {
    const capabilities = await this.detectDeviceCapabilities();
    return this.selectOptimalParams(capabilities);
  }
}
```

**Proof Worker (Web Worker):**

```typescript
// proofWorker.ts - Runs in separate thread
importScripts('zklib.js');

self.onmessage = async (event) => {
  const {type, data} = event.data;

  try {
    switch (type) {
      case 'GENERATE_COMMITMENT_PROOF':
        const proof = await generateCommitmentProof(data);
        self.postMessage({success: true, proof});
        break;

      case 'GENERATE_SETTLEMENT_PROOF':
        const settleProof = await generateSettlementProof(data);
        self.postMessage({success: true, proof: settleProof});
        break;

      default:
        throw new Error(`Unknown proof type: ${type}`);
    }
  } catch (error) {
    self.postMessage({success: false, error: error.message});
  }
};
```

---

## 4. Smart Contract Layer Components

### 4.1 BodegaMarketFactory.compact

**Purpose:** Factory contract for creating and managing prediction markets.

**File Structure:**

```
contracts/
├── BodegaMarketFactory.compact     # Main factory contract
├── interfaces/
│   ├── IMarketFactory.compact      # Factory interface
│   └── IMarket.compact             # Market interface
└── libraries/
    ├── MarketValidation.compact    # Validation logic
    └── BondManager.compact         # Bond management
```

**Contract Structure:**

```compact
// BodegaMarketFactory.compact
ledger BodegaMarketFactory {
    markets: Map<MarketId, Market>;
    marketCount: Field;
    creatorBonds: Map<MarketId, Bond>;
    treasury: Address;
    admin: Address;
}

export circuit createMarket(
    question: Bytes,
    endTime: Timestamp,
    resolutionCriteria: Bytes,
    bondAmount: Field
): MarketId {
    // Fee constants (in smallest units)
    const CREATOR_BOND: Field = Field(100_000_000_000_000_000_000);  // 100 NIGHT
    const LISTING_FEE: Field = Field(10_000_000_000_000_000_000);    // 10 NIGHT (non-refundable)
    const ORACLE_SETUP_FEE: Field = Field(50_000_000_000_000_000_000); // 50 NIGHT

    // Validate inputs
    assert(bondAmount >= MIN_BOND, "Insufficient bond");
    assert(endTime > currentTime(), "Invalid end time");
    assert(len(question) > 0 && len(question) <= MAX_QUESTION_LENGTH, "Invalid question");

    // Collect fees (total: bondAmount + listingFee + oracleSetupFee)
    let totalFees = bondAmount + LISTING_FEE + ORACLE_SETUP_FEE;
    assert(msg.value >= totalFees, "Insufficient funds for market creation");

    // Transfer non-refundable fees to treasury
    transfer(this.treasury, LISTING_FEE + ORACLE_SETUP_FEE);

    // Lock creator bond (refundable upon proper resolution)
    let bondId = lockBond(msg.sender, bondAmount);

    // Create market
    let marketId = generateMarketId();
    let market = Market {
        id: marketId,
        question: question,
        endTime: endTime,
        resolutionCriteria: resolutionCriteria,
        creator: msg.sender,
        status: MarketStatus::CREATED,
        createdAt: currentTime()
    };

    // Store in ledger
    this.markets.insert(marketId, market);
    this.creatorBonds.insert(marketId, Bond {
        amount: bondAmount,
        owner: msg.sender,
        locked: true
    });
    this.marketCount = this.marketCount + Field(1);

    // Emit event
    emit MarketCreated(marketId, msg.sender, question);

    return marketId;
}

export circuit getMarket(marketId: MarketId): Market {
    assert(this.markets.contains(marketId), "Market not found");
    return this.markets.get(marketId);
}

export circuit cancelMarket(marketId: MarketId): Bool {
    let market = this.markets.get(marketId);
    assert(market.creator == msg.sender, "Only creator can cancel");
    assert(market.status == MarketStatus::CREATED, "Cannot cancel active market");

    // Refund bond
    let bond = this.creatorBonds.get(marketId);
    transfer(bond.owner, bond.amount);

    // Update status
    market.status = MarketStatus::CANCELLED;
    this.markets.insert(marketId, market);

    emit MarketCancelled(marketId);
    return true;
}
```

**Key Features:**
- Market validation and creation
- Creator bond management
- Market status transitions
- Access control
- Event emission

### 4.2 PredictionMarket.compact

**Purpose:** Core prediction market logic with AMM and batching.

**Contract Structure:**

```compact
// PredictionMarket.compact
ledger PredictionMarket {
    marketId: MarketId;
    metadata: MarketMetadata;
    sharesYes: Field;
    sharesNo: Field;
    invariant: Field;                    // k = sharesYes * sharesNo
    batchQueue: BatchQueue;              // 30-second batching
    positionCommitments: Map<PositionId, Hash>;
    currentBatch: Batch;
}

export circuit placeBet(
    commitment: Hash,
    amount: Field,
    outcome: Field,
    proof: ZKProof
): PositionId {
    // Validate timing
    assert(currentTime() < this.metadata.endTime, "Market ended");

    // Verify ZK proof
    assert(verifyProof(proof, commitment), "Invalid proof");

    // Add to current batch
    let positionId = generatePositionId();
    this.currentBatch.addPosition(Position {
        id: positionId,
        commitment: commitment,
        amount: amount,
        outcome: outcome,
        timestamp: currentTime()
    });

    // Check if batch window expired (30 seconds)
    if (currentTime() - this.currentBatch.startTime >= BATCH_WINDOW) {
        processBatch();
    }

    emit PositionCommitted(positionId, commitment);
    return positionId;
}

witness processBatch() {
    let batch = this.currentBatch;

    // Build Merkle tree from commitments
    let merkleRoot = buildMerkleTree(batch.positions);

    // Update AMM state
    this.sharesYes += batch.totalYesShares;
    this.sharesNo += batch.totalNoShares;
    this.invariant = this.sharesYes * this.sharesNo;

    // Store batch UTXO
    let batchUTXO = BatchUTXO {
        batchId: batch.id,
        merkleRoot: merkleRoot,
        totalValue: batch.totalValue,
        positionCount: batch.positions.length,
        timestamp: currentTime()
    };
    storeBatchUTXO(batchUTXO);

    // Start new batch
    this.currentBatch = Batch::new();

    emit BatchProcessed(batch.id, merkleRoot, batch.positions.length);
}

export circuit claimWinnings(
    positionId: PositionId,
    position: PrivatePosition,
    merkleProof: Hash[],
    settlementProof: ZKProof
): Field {
    // Verify market resolved
    assert(this.metadata.status == MarketStatus::SETTLED, "Market not settled");

    // Verify position in batch
    let commitment = poseidon(position.userId, position.amount, position.outcome, position.nonce);
    assert(verifyMerkleProof(this.batches[position.batchId].merkleRoot, commitment, merkleProof), "Invalid batch proof");

    // Verify settlement proof
    assert(verifySettlementProof(settlementProof, position, this.metadata.outcome), "Invalid settlement proof");

    // Calculate winnings
    let winnings = calculateWinnings(position.amount, position.outcome, this.metadata.outcome);

    // Transfer winnings
    transfer(msg.sender, winnings);

    // Mark as claimed
    markClaimed(positionId);

    emit WinningsClaimed(positionId, winnings);
    return winnings;
}

witness calculateWinnings(
    betAmount: Field,
    betOutcome: Outcome,
    marketOutcome: Outcome
): Field {
    if (betOutcome != marketOutcome) {
        return Field(0);  // Lost bet
    }

    // Winner receives proportional share of losing pool
    let winningPool = if (marketOutcome == Outcome::YES) {
        this.sharesYes
    } else {
        this.sharesNo
    };
    let losingPool = if (marketOutcome == Outcome::YES) {
        this.sharesNo
    } else {
        this.sharesYes
    };

    // Proportional payout: betAmount + (betAmount / winningPool) * losingPool
    let shareRatio = (betAmount * PRECISION) / winningPool;
    let profit = (shareRatio * losingPool) / PRECISION;
    return betAmount + profit;
}
```

**Key Features:**
- UTXO batching with Merkle trees
- Constant product AMM
- ZK proof verification
- Settlement calculations
- Gas-optimized operations

### 4.3 BodegaOracle.compact

**Purpose:** Multi-oracle consensus system for market resolution.

**Contract Structure:**

```compact
// BodegaOracle.compact
ledger BodegaOracle {
    operators: Map<Address, OracleOperator>;
    marketResolutions: Map<MarketId, Resolution>;
    proposals: Map<ProposalId, ResolutionProposal>;
    disputes: Map<DisputeId, Dispute>;
}

export circuit submitResolution(
    marketId: MarketId,
    outcome: Outcome,
    evidence: Evidence
): ResolutionId {
    // Verify caller is oracle operator
    assert(this.operators.contains(msg.sender), "Not an oracle");
    assert(this.operators.get(msg.sender).active, "Oracle not active");

    // Verify market timing
    let market = getMarket(marketId);
    assert(currentTime() > market.endTime, "Market not ended");
    assert(currentTime() < market.resolutionDeadline, "Resolution deadline passed");

    // Create resolution proposal
    let proposalId = generateProposalId();
    let proposal = ResolutionProposal {
        marketId: marketId,
        outcome: outcome,
        evidence: evidence,
        submitter: msg.sender,
        submittedAt: currentTime(),
        votes: [OracleVote {
            oracle: msg.sender,
            outcome: outcome,
            confidence: 100
        }],
        status: ProposalStatus::PENDING
    };

    this.proposals.insert(proposalId, proposal);

    emit ResolutionProposed(proposalId, marketId, outcome);
    return proposalId;
}

export circuit voteOnResolution(
    proposalId: ProposalId,
    agree: Bool,
    confidence: Field
): Bool {
    // Verify caller is oracle
    assert(this.operators.contains(msg.sender), "Not an oracle");

    let proposal = this.proposals.get(proposalId);

    // Add vote
    proposal.votes.push(OracleVote {
        oracle: msg.sender,
        outcome: if (agree) proposal.outcome else opposite(proposal.outcome),
        confidence: confidence
    });

    // Check if consensus reached
    let consensus = calculateConsensus(proposal.votes);
    if (consensus.reached) {
        finalizeResolution(proposalId, consensus.outcome);
    }

    this.proposals.insert(proposalId, proposal);
    return consensus.reached;
}

witness calculateConsensus(votes: OracleVote[]): ConsensusResult {
    let totalWeight = Field(0);
    let yesWeight = Field(0);
    let noWeight = Field(0);

    for (vote in votes) {
        let weight = vote.confidence;
        totalWeight += weight;

        if (vote.outcome == Outcome::YES) {
            yesWeight += weight;
        } else {
            noWeight += weight;
        }
    }

    // Check if 66% threshold reached
    let yesRatio = (yesWeight * Field(100)) / totalWeight;
    let noRatio = (noWeight * Field(100)) / totalWeight;

    if (yesRatio >= Field(66)) {
        return ConsensusResult {
            reached: true,
            outcome: Outcome::YES,
            confidence: yesRatio
        };
    } else if (noRatio >= Field(66)) {
        return ConsensusResult {
            reached: true,
            outcome: Outcome::NO,
            confidence: noRatio
        };
    } else {
        return ConsensusResult {
            reached: false,
            outcome: Outcome::YES,  // Placeholder
            confidence: Field(0)
        };
    }
}

export circuit submitDispute(
    marketId: MarketId,
    evidence: Evidence,
    bondAmount: Field
): DisputeId {
    // Verify dispute bond
    assert(bondAmount >= DISPUTE_BOND, "Insufficient bond");

    // Verify market in challenge period
    let resolution = this.marketResolutions.get(marketId);
    assert(currentTime() < resolution.challengePeriodEnd, "Challenge period expired");

    // Lock dispute bond
    lockBond(msg.sender, bondAmount);

    // Create dispute
    let disputeId = generateDisputeId();
    let dispute = Dispute {
        marketId: marketId,
        challenger: msg.sender,
        evidence: evidence,
        bond: bondAmount,
        submittedAt: currentTime(),
        status: DisputeStatus::PENDING
    };

    this.disputes.insert(disputeId, dispute);

    // Pause market settlement
    pauseMarket(marketId);

    emit DisputeSubmitted(disputeId, marketId, msg.sender);
    return disputeId;
}
```

**Key Features:**
- Multi-signature oracle consensus
- Weighted voting with confidence scores
- Evidence submission and validation
- Dispute mechanism
- Challenge periods

---

## 5. Integration Patterns

### 5.1 Contract Deployment Flow

```
1. Deploy Core Contracts
   ├── BodegaMarketFactory.compact
   ├── PredictionMarket.compact (template)
   └── BodegaOracle.compact

2. Initialize Contracts
   ├── Set admin addresses
   ├── Configure oracle operators
   ├── Set bond amounts
   └── Configure system parameters

3. Deploy SDK
   ├── Build TypeScript SDK
   ├── Publish to npm
   └── Deploy documentation

4. Deploy Frontend
   ├── Build React DApp
   ├── Deploy to IPFS
   └── Set up domain/CDN
```

### 5.2 Transaction Flow Patterns

**Pattern 1: Market Creation**

```typescript
// Client-side (DApp)
const sdk = await createBodegaSDK(config);

// 1. Validate inputs
const validationResult = await sdk.markets.validateMarketParams(params);
if (!validationResult.valid) {
  throw new Error(validationResult.errors.join(', '));
}

// 2. Prepare transaction
const tx = await sdk.markets.createMarket({
  question: "Will Bitcoin reach $100k by EOY?",
  description: "Market resolves based on CoinGecko price",
  resolutionCriteria: "Price must reach $100,000 on CoinGecko",
  endTime: new Date('2024-12-31'),
  bondAmount: BigInt('100000000000000000000') // 100 NIGHT
});

// 3. Submit to blockchain
const receipt = await tx.wait();

// 4. Get market ID from event
const marketId = receipt.events.find(e => e.name === 'MarketCreated').args.marketId;
```

**Pattern 2: Private Bet Placement**

```typescript
// Client-side (DApp)
// 1. Generate private position data (NEVER leaves device)
const position = {
  userId: generateUserId(),
  marketId: marketId,
  amount: BigInt('10000000000000000000'), // 10 NIGHT
  outcome: Outcome.YES,
  nonce: generateNonce()
};

// 2. Generate commitment (local)
const commitment = await sdk.positions.generateCommitment(position);

// 3. Generate ZK proof (local, in Web Worker)
const proof = await sdk.positions.generateProof(position, commitment);

// 4. Store encrypted position locally
await sdk.positions.storePosition(position);

// 5. Submit only proof + commitment to blockchain
const tx = await sdk.positions.placeBet({
  marketId: position.marketId,
  commitment: commitment,
  proof: proof
});

// 6. Wait for confirmation
const receipt = await tx.wait();
const positionId = receipt.events.find(e => e.name === 'PositionCommitted').args.positionId;

// 7. Update local position with ID
await sdk.positions.updatePosition(positionId, {id: positionId});
```

**Pattern 3: Oracle Resolution**

```typescript
// Oracle operator tool (CLI or backend)
const sdk = await createBodegaSDK(oracleConfig);

// 1. Gather evidence
const evidence = {
  sources: [
    'https://coingecko.com/api/bitcoin/price',
    'https://archive.org/bitcoin-price-2024-12-31'
  ],
  description: 'Bitcoin price on 2024-12-31 was $95,432',
  timestamp: new Date('2024-12-31T23:59:59Z'),
  hash: hashEvidence(data)
};

// 2. Submit resolution proposal
const proposalId = await sdk.oracles.submitResolution({
  marketId: marketId,
  outcome: Outcome.NO,
  evidence: evidence
});

// 3. Wait for other oracle votes
await sdk.oracles.waitForConsensus(proposalId, {timeout: 48 * 60 * 60});

// 4. Check consensus
const consensus = await sdk.oracles.getConsensusState(marketId);
if (consensus.consensusReached) {
  console.log(`Market resolved: ${consensus.outcome}`);
}
```

### 5.3 Event Handling Pattern

```typescript
// Subscribe to market events
sdk.markets.on('MarketCreated', (event) => {
  console.log(`New market created: ${event.marketId}`);
  // Update UI
});

sdk.positions.on('PositionCommitted', (event) => {
  console.log(`Position committed: ${event.positionId}`);
  // Update user's position list
});

sdk.oracles.on('MarketResolved', (event) => {
  console.log(`Market resolved: ${event.marketId} -> ${event.outcome}`);
  // Notify users to claim winnings
});

// Unsubscribe when component unmounts
useEffect(() => {
  const subscription = sdk.markets.subscribeToMarket(marketId, callback);
  return () => subscription.unsubscribe();
}, [marketId]);
```

---

## 6. Deployment Architecture

### 6.1 Development Environment

```
┌─────────────────────────────────────────────────────────────┐
│                   Developer Machine                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   VS Code    │  │   Compact    │  │   Node.js    │      │
│  │  + Compact   │  │   Compiler   │  │   Runtime    │      │
│  │  Extension   │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Local Midnight Testnet Node                  │   │
│  │  • Fast development cycles                           │   │
│  │  • No real tokens required                           │   │
│  │  • Full debugging capabilities                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Testnet Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                   Midnight Testnet                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Smart Contracts                         │   │
│  │  • BodegaMarketFactory: 0xabc123...                 │   │
│  │  • BodegaOracle: 0xdef456...                        │   │
│  │  • Template contracts                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Test Infrastructure                     │   │
│  │  • Faucet for test tokens                           │   │
│  │  • Test oracle operators                            │   │
│  │  • Monitoring dashboard                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   DApp Hosting (Testnet)                    │
├─────────────────────────────────────────────────────────────┤
│  • Vercel/Netlify for web DApp                             │
│  • IPFS for decentralized hosting                          │
│  • Testnet.bodega.market domain                            │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Production Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                   Midnight Mainnet                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Production Smart Contracts                 │   │
│  │  • Multi-sig deployment                              │   │
│  │  • Audited code only                                 │   │
│  │  • Immutable core logic                              │   │
│  │  • Time-locked upgrades                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Primary    │  │   Backup     │  │  Indexer     │      │
│  │   Node       │  │   Nodes      │  │  (SubQuery)  │      │
│  │              │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   API        │  │   Oracle     │  │  Monitoring  │      │
│  │   Gateway    │  │   Service    │  │  & Alerts    │      │
│  │              │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Frontend Layer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web DApp   │  │   IPFS       │  │   Mobile     │      │
│  │   (CDN)      │  │   Hosting    │  │   App        │      │
│  │              │  │              │  │  (App Store) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Testing Strategy

### 7.1 Unit Testing

**Smart Contracts:**

```typescript
// test/PredictionMarket.test.ts
describe('PredictionMarket', () => {
  let market: PredictionMarket;
  let oracle: BodegaOracle;

  beforeEach(async () => {
    market = await deployPredictionMarket();
    oracle = await deployOracle();
  });

  describe('placeBet', () => {
    it('should accept valid bet with proof', async () => {
      const position = generateTestPosition();
      const commitment = await generateCommitment(position);
      const proof = await generateProof(position, commitment);

      const positionId = await market.placeBet(commitment, position.amount, position.outcome, proof);
      expect(positionId).toBeDefined();
    });

    it('should reject bet after market ends', async () => {
      await advanceTime(MARKET_DURATION + 1);

      await expect(
        market.placeBet(commitment, amount, outcome, proof)
      ).rejects.toThrow('Market ended');
    });

    it('should reject invalid proof', async () => {
      const invalidProof = generateInvalidProof();

      await expect(
        market.placeBet(commitment, amount, outcome, invalidProof)
      ).rejects.toThrow('Invalid proof');
    });
  });

  describe('batching', () => {
    it('should batch positions within 30-second window', async () => {
      const positions = await Promise.all([
        market.placeBet(c1, a1, o1, p1),
        market.placeBet(c2, a2, o2, p2),
        market.placeBet(c3, a3, o3, p3)
      ]);

      const batch = await market.getCurrentBatch();
      expect(batch.positions.length).toBe(3);
    });

    it('should process batch after 30 seconds', async () => {
      await market.placeBet(c1, a1, o1, p1);
      await advanceTime(31);

      const batchProcessedEvent = await waitForEvent('BatchProcessed');
      expect(batchProcessedEvent).toBeDefined();
    });
  });
});
```

**SDK Functions:**

```typescript
// test/MarketManager.test.ts
describe('MarketManager', () => {
  let sdk: BodegaSDK;
  let marketManager: MarketManager;

  beforeEach(async () => {
    sdk = await createBodegaSDK(testConfig);
    marketManager = sdk.markets;
  });

  describe('createMarket', () => {
    it('should create market with valid params', async () => {
      const marketId = await marketManager.createMarket({
        question: 'Test market?',
        description: 'Test description',
        resolutionCriteria: 'Test criteria',
        endTime: futureDate()
      });

      expect(marketId).toBeDefined();

      const market = await marketManager.getMarket(marketId);
      expect(market.metadata.question).toBe('Test market?');
    });

    it('should validate question length', async () => {
      await expect(
        marketManager.createMarket({
          question: 'A'.repeat(1000),
          description: 'Test',
          resolutionCriteria: 'Test',
          endTime: futureDate()
        })
      ).rejects.toThrow('Question too long');
    });
  });
});
```

### 7.2 Integration Testing

```typescript
// test/integration/EndToEnd.test.ts
describe('End-to-End Flow', () => {
  it('should complete full market lifecycle', async () => {
    // 1. Create market
    const marketId = await sdk.markets.createMarket(testMarketParams);

    // 2. Place bets
    const position1 = await sdk.positions.placeBet({
      marketId,
      amount: BigInt('10000000000000000000'),
      outcome: Outcome.YES
    });

    const position2 = await sdk.positions.placeBet({
      marketId,
      amount: BigInt('20000000000000000000'),
      outcome: Outcome.NO
    });

    // 3. Wait for market end
    await advanceTimeToMarketEnd(marketId);

    // 4. Oracle resolution
    await sdk.oracles.submitResolution({
      marketId,
      outcome: Outcome.YES,
      evidence: testEvidence
    });

    // 5. Wait for consensus
    await sdk.oracles.waitForConsensus(marketId);

    // 6. Claim winnings
    const winnings = await sdk.positions.claimWinnings(position1);
    expect(winnings).toBeGreaterThan(BigInt('10000000000000000000'));

    // 7. Verify loser cannot claim
    await expect(
      sdk.positions.claimWinnings(position2)
    ).rejects.toThrow('No winnings to claim');
  });
});
```

### 7.3 Performance Testing

```typescript
// test/performance/Scalability.test.ts
describe('Performance Tests', () => {
  it('should handle 1000 concurrent bets', async () => {
    const market = await createTestMarket();

    const startTime = Date.now();

    // Create 1000 bet promises
    const bets = Array.from({length: 1000}, (_, i) =>
      sdk.positions.placeBet({
        marketId: market.id,
        amount: randomAmount(),
        outcome: randomOutcome()
      })
    );

    // Execute in parallel
    await Promise.all(bets);

    const duration = Date.now() - startTime;
    console.log(`1000 bets completed in ${duration}ms`);

    // Should complete within reasonable time
    expect(duration).toBeLessThan(60000); // 60 seconds
  });

  it('should batch 100 positions into single UTXO', async () => {
    const market = await createTestMarket();

    // Place 100 bets rapidly
    const positions = await Promise.all(
      Array.from({length: 100}, () => placeBet(market))
    );

    // Wait for batch processing
    await waitForBatchProcessed();

    // Verify single UTXO created
    const utxos = await getMarketUTXOs(market.id);
    const batchUTXOs = utxos.filter(u => u.type === 'batch');
    expect(batchUTXOs.length).toBe(1);
    expect(batchUTXOs[0].positionCount).toBe(100);
  });
});
```

### 7.4 Security Testing

```typescript
// test/security/Exploits.test.ts
describe('Security Tests', () => {
  it('should prevent double-spending', async () => {
    const position = await sdk.positions.placeBet(testParams);

    // Attempt to claim twice
    await sdk.positions.claimWinnings(position.id);

    await expect(
      sdk.positions.claimWinnings(position.id)
    ).rejects.toThrow('Position already claimed');
  });

  it('should reject invalid ZK proofs', async () => {
    const validPosition = generateTestPosition();
    const commitment = await generateCommitment(validPosition);

    // Create proof for different position
    const differentPosition = {...validPosition, amount: validPosition.amount + BigInt(100)};
    const invalidProof = await generateProof(differentPosition, commitment);

    await expect(
      market.placeBet(commitment, validPosition.amount, validPosition.outcome, invalidProof)
    ).rejects.toThrow('Invalid proof');
  });

  it('should prevent bet after market end', async () => {
    await advanceTimeToMarketEnd(market.id);

    await expect(
      sdk.positions.placeBet(testParams)
    ).rejects.toThrow('Market ended');
  });
});
```

---

## 8. Monitoring & Observability

### 8.1 Metrics to Track

**Contract Metrics:**
- Total markets created
- Active markets count
- Total volume (NIGHT tokens)
- Average market liquidity
- Position commitment rate
- Batch processing efficiency
- Oracle response times
- Dispute rate

**Application Metrics:**
- API response times
- SDK method latencies
- Proof generation times
- Transaction success rates
- Error rates by type
- User session duration

**Business Metrics:**
- Daily/Monthly active users
- Markets created per day
- Average bet size
- Market resolution accuracy
- User retention rate

### 8.2 Monitoring Stack

```
┌─────────────────────────────────────────────────────────────┐
│                   Monitoring Infrastructure                 │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Prometheus  │  │   Grafana    │  │  PagerDuty   │      │
│  │  (Metrics)   │  │ (Dashboards) │  │  (Alerts)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  ElasticSearch│ │   Kibana     │  │  Sentry      │      │
│  │  (Logs)      │  │  (Log View)  │  │  (Errors)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Alert Rules

```yaml
# alerts.yml
alerts:
  - name: HighErrorRate
    condition: error_rate > 5%
    duration: 5m
    severity: critical
    notification: pagerduty

  - name: SlowProofGeneration
    condition: proof_generation_time > 10s
    duration: 10m
    severity: warning
    notification: slack

  - name: OracleNonResponse
    condition: oracle_response_time > 24h
    duration: 1h
    severity: critical
    notification: pagerduty, email

  - name: LowLiquidity
    condition: market_liquidity < min_threshold
    duration: 1h
    severity: warning
    notification: slack
```

---

## 9. Deployment Checklist

### 9.1 Pre-Deployment

- [ ] Smart contracts audited by external firm
- [ ] ZK circuits audited by ZK experts
- [ ] All tests passing (unit, integration, e2e)
- [ ] Performance benchmarks met
- [ ] Security testing completed
- [ ] Documentation finalized
- [ ] Bug bounty program launched
- [ ] Testnet deployed and tested
- [ ] Oracle operators identified and onboarded
- [ ] Monitoring infrastructure set up
- [ ] Incident response plan documented
- [ ] Legal review completed

### 9.2 Deployment Steps

1. **Deploy Contracts to Mainnet**
   ```bash
   npm run deploy:mainnet
   ```
   - [ ] BodegaMarketFactory deployed
   - [ ] BodegaOracle deployed
   - [ ] Template contracts deployed
   - [ ] Verify contract code on explorer

2. **Initialize Contracts**
   ```bash
   npm run initialize:mainnet
   ```
   - [ ] Set admin addresses (multi-sig)
   - [ ] Configure oracle operators
   - [ ] Set bond amounts
   - [ ] Configure parameters

3. **Deploy SDK**
   ```bash
   npm run publish:sdk
   ```
   - [ ] Publish to npm
   - [ ] Deploy documentation
   - [ ] Update changelog

4. **Deploy Frontend**
   ```bash
   npm run deploy:frontend
   ```
   - [ ] Deploy to IPFS
   - [ ] Deploy to CDN
   - [ ] Configure DNS
   - [ ] Test production environment

5. **Launch**
   - [ ] Announce launch on social media
   - [ ] Monitor for first 24 hours
   - [ ] Address any issues immediately
   - [ ] Collect user feedback

### 9.3 Post-Deployment

- [ ] Monitor metrics dashboard
- [ ] Set up automated alerts
- [ ] Schedule weekly reviews
- [ ] Plan feature iterations
- [ ] Engage with community
- [ ] Bug bounty program active
- [ ] Progressive decentralization roadmap

---

## 10. Conclusion

This component architecture document provides a comprehensive blueprint for implementing the Bodega Market privacy-preserving prediction market protocol. Key takeaways:

1. **Modular Design**: Clear separation between client, application, and contract layers enables independent development and testing.

2. **Privacy-First**: All sensitive data processing happens client-side, with only ZK proofs and commitments transmitted to blockchain.

3. **Scalable Architecture**: UTXO batching and efficient state management support high transaction throughput.

4. **Robust Testing**: Comprehensive testing strategy covering unit, integration, performance, and security tests.

5. **Production-Ready**: Detailed deployment procedures, monitoring, and incident response plans ensure reliable operations.

**Next Steps:**
- Begin implementation of core contracts
- Develop TypeScript SDK
- Build React DApp frontend
- Conduct security audits
- Deploy to testnet for community testing
