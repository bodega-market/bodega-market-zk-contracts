# Bodega Market Protocol Specification v1.0

## 1. Protocol Overview

### 1.1 Scope
Bodega Market is a privacy-preserving prediction market protocol built on Midnight blockchain that enables:
- Private betting with public market outcomes
- Anonymous position management using zero-knowledge proofs
- Automated market making for price discovery (algorithmic pricing without order books)
- In-house oracle system for market resolution
- Regulatory compliance through selective disclosure

**Automated Market Making (AMM) - LMSR Implementation:**
Bodega uses the Logarithmic Market Scoring Rule (LMSR), the gold standard for prediction market AMMs. LMSR provides superior price discovery with bounded losses for the market maker.

**LMSR Core Formula:**

```
Cost(q₁, q₂) = b × ln(e^(q₁/b) + e^(q₂/b))
Price_i = e^(qᵢ/b) / (e^(q₁/b) + e^(q₂/b))
```

**Key Parameters:**

- `q₁, q₂`: Outstanding shares for YES/NO outcomes
- `b`: Liquidity parameter (controls market depth and maximum subsidy)
- Maximum market maker loss: `b × ln(2)` ≈ `0.693 × b`

**LMSR Advantages:**

- **Bounded Losses**: Market maker losses capped by liquidity parameter
- **Smooth Pricing**: Better price curves with less slippage for small trades  
- **Asymptotic Behavior**: Prices approach but never reach 0 or 1
- **Proven Design**: Used by Augur, Gnosis, and other successful prediction markets

**Example with b=1000:**

- Initial state: q₁=q₂=0 → prices both 50%
- After 500 YES shares purchased: q₁=500, q₂=0 → YES price ≈ 62%
- Market maker subsidy: ~693 NIGHT maximum loss

### 1.2 Core Requirements

**Privacy Requirements:**
- Individual betting positions must remain private
- Bet amounts hidden from other participants
- User identities protected during betting phase
- Optional selective disclosure for compliance

**Transparency Requirements:**
- Market questions and metadata publicly visible
- Total market volume and current odds public
- Resolution outcomes publicly verifiable
- Audit trails for regulatory compliance

**Economic Requirements:**
- Efficient price discovery through automated market making
- Fair settlement based on market outcomes
- Incentive alignment for oracle operators
- Gas-efficient operations on Midnight

**Security Requirements:**
- Resistance to manipulation attacks
- Protection against oracle failures
- Safe handling of funds throughout lifecycle
- Prevention of double-spending and re-entry attacks

## 2. Market Lifecycle

### 2.1 State Transitions

```
                    Market Lifecycle State Machine
                              
    ┌─────────┐    deposit    ┌─────────┐    endTime    ┌─────────┐
    │ CREATED │────────────→ │ ACTIVE  │─────────────→ │  ENDED  │
    └─────────┘    bond +    └─────────┘    reached    └─────────┘
         │         liquidity       │                          │
         │                         │                          │
         ▼                         ▼                          ▼
    ┌─────────┐              ┌─────────┐    oracle      ┌─────────┐
    │CANCELLED│              │ PAUSED  │    submits     │RESOLVED │
    └─────────┘              └─────────┘    outcome     └─────────┘
                                  │             │             │
                                  │             │             │
                                  │             ▼             ▼
                                  │        ┌─────────┐   ┌─────────┐
                                  └───────→│DISPUTED │   │SETTLED  │
                                           └─────────┘   └─────────┘
                                                │             │
                                                │             │
                                                ▼             ▼
                                           ┌─────────┐   ┌─────────┐
                                           │RESOLVED │   │ARCHIVED │
                                           └─────────┘   └─────────┘
                                                │
                                                ▼
                                           ┌─────────┐
                                           │SETTLED  │
                                           └─────────┘
                                                │
                                                ▼
                                           ┌─────────┐
                                           │ARCHIVED │
                                           └─────────┘

    Legend:
    ────→  Normal flow
    ────▼  Alternative/error flows
```

### 2.2 Market States

#### CREATED

- Market question and parameters defined
- Creator bond deposited
- Initial liquidity can be added
- Not yet accepting bets

#### ACTIVE

- Accepting new positions
- Automated market making active
- Price discovery in progress
- Positions accumulating privately

#### ENDED

- End time reached
- No new positions accepted
- Awaiting oracle resolution
- Existing positions remain private

#### RESOLVED

- Oracle has submitted outcome
- Challenge period active (24 hours)
- Positions still private
- Settlement calculations prepared

#### SETTLED

- Winnings distributed via zk-proofs
- Losing positions revealed (optional)
- Market permanently closed
- Historical data archived

#### DISPUTED

- Resolution challenged during dispute period
- Additional oracles may be consulted
- Market temporarily frozen
- Requires governance intervention

### 2.3 State Transition Rules

**CREATED → ACTIVE:**

- Requires minimum liquidity threshold
- Creator bond locked
- Market parameters immutable

**ACTIVE → ENDED:**

- Automatic at specified end time
- No new positions after this point
- Existing positions locked

**ENDED → RESOLVED:**

- Oracle submits outcome with proof
- 24-hour challenge period begins
- Requires oracle bond deposit

**RESOLVED → SETTLED:**

- Challenge period expires without disputes
- Settlement calculations finalized
- Payout distribution begins

**Any State → DISPUTED:**

- Valid challenge submitted with bond
- Requires additional oracle consensus
- Market operations suspended

**DISPUTED → RESOLVED:**

- Oracle consensus reached (>66%)
- Challenger bond returned or slashed
- Normal settlement process resumes

## 2.4 UTXO Batching and Scalability

### 2.4.1 Batched Position Commitments

To prevent UTXO bottlenecks and improve scalability, the protocol implements batched position commitments using Merkle tree aggregation:

```
                    UTXO Batching Architecture
                              
    ┌─────────────────────────────────────────────────────────────────┐
    │                     BATCH WINDOW (30 seconds)                  │
    └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │Position 1   │  │Position 2   │  │Position 3   │  │Position N   │
    │commitment   │  │commitment   │  │commitment   │  │commitment   │
    │hash₁        │  │hash₂        │  │hash₃        │  │hashₙ        │
    └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
           │                │                │                │
           └────────────────┼────────────────┼────────────────┘
                           │                │
                           ▼                ▼
                    ┌─────────────┐  ┌─────────────┐
                    │Merkle Node  │  │Merkle Node  │
                    │hash(1,2)    │  │hash(3,N)    │
                    └─────────────┘  └─────────────┘
                           │                │
                           └────────┬───────┘
                                   ▼
                          ┌─────────────────┐
                          │  Merkle Root    │
                          │ (Single UTXO)   │
                          └─────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  On-Chain       │
                          │  Storage        │
                          └─────────────────┘
```

**Batch Data Structure:**
```typescript
interface BatchedPositionUTXO {
    batchId: string;
    merkleRoot: Hash;            // Root of position commitments
    totalValue: Amount;          // Sum of all positions in batch
    positionCount: number;       // Number of positions in batch
    batchTimestamp: Timestamp;   // When batch was created
    marketId: MarketId;         // Associated market
}

interface PositionMerkleProof {
    position: PrivatePosition;
    merkleProof: Hash[];        // Proof path to root
    leafIndex: number;          // Position in tree
    batchId: string;           // Reference to batch UTXO
}
```

**Batching Process:**

1. **Collection Window**: Positions accumulate in 30-second windows
2. **Merkle Tree Construction**: Build tree from position commitments
3. **Single UTXO Creation**: Create one UTXO containing the Merkle root
4. **Individual Proofs**: Users generate Merkle proofs for their positions

**Benefits:**

- **Scalability**: O(n) positions → O(1) UTXO per batch
- **Cost Efficiency**: Shared gas costs across all positions in batch
- **Privacy Preservation**: Individual positions remain hidden
- **Atomic Operations**: All positions in batch succeed or fail together

### 2.4.2 Compact Circuit Implementation

```compact
// Batch validation circuit
export circuit validateBatch(
    merkleRoot: Hash,
    positionCommitments: Hash[],
    totalValue: Field
): Bool {
    // Verify Merkle tree construction
    let computedRoot = buildMerkleTree(positionCommitments);
    assert(computedRoot == merkleRoot, "Invalid Merkle root");
    
    // Verify total value matches sum of positions
    let computedTotal = Field(0);
    for (commitment in positionCommitments) {
        computedTotal = computedTotal + extractValue(commitment);
    }
    assert(computedTotal == totalValue, "Value mismatch");
    
    return true;
}

// Individual position claim circuit
export circuit claimFromBatch(
    batchRoot: Hash,
    position: PrivatePosition,
    merkleProof: Hash[],
    leafIndex: Field
): Bool {
    // Verify position is in batch
    let positionHash = poseidon(position.userId, position.amount, position.outcome, position.nonce);
    return verifyMerkleProof(batchRoot, positionHash, merkleProof, leafIndex);
}
```

## 2.5 Transaction Flow with Local Proof Server

```
                    Bodega Market Transaction Flow - Local Proof Server
                                  
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │   Bodega    │    │Local Proof  │    │ TypeScript  │    │   Compact   │
    │   DApp      │    │   Server    │    │ Application │    │  Circuits   │
    │ (Browser)   │    │(User Device)│    │   Layer     │    │(Blockchain) │
    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
           │                   │                   │                   │
           │                   │                   │                   │
    ┌──────────────────────────────────────────────────────────────────────┐
    │                       1. Place Bet Flow                            │
    └──────────────────────────────────────────────────────────────────────┘
           │                   │                   │                   │
           │ 1. Place Bet     │                   │                   │
           ├──────────────────┐                   │                   │
           │(marketId, amount,│                   │                   │
           │ outcome)         │                   │                   │
           │                  │                   │                   │
           │                  ▼                   │                   │
           │       ┌─────────────────────────────┐                   │
           │       │  2. Store Private Data      │                   │
           │       │  • userId: secret           │                   │
           │       │  • amount: 100 NIGHT        │                   │
           │       │  • outcome: YES             │                   │
           │       │  • nonce: random            │                   │
           │       │  ⚠️  NEVER LEAVES DEVICE     │                   │
           │       └─────────────────────────────┘                   │
           │                  │                   │                   │
           │                  │ 3. Generate      │                   │
           │                  │    Commitment    │                   │
           │                  ▼                   │                   │
           │       ┌─────────────────────────────┐                   │
           │       │ commit = poseidon(          │                   │
           │       │   userId, 100, YES, nonce  │                   │
           │       │ )                           │                   │
           │       │ ⚠️  COMPUTED LOCALLY         │                   │
           │       └─────────────────────────────┘                   │
           │                  │                   │                   │
           │                  │ 4. Generate      │                   │
           │                  │    ZK Proof      │                   │
           │                  ▼                   │                   │
           │       ┌─────────────────────────────┐                   │
           │       │ proof = prove(              │                   │
           │       │   privateInputs: {          │                   │
           │       │     userId, amount,         │                   │
           │       │     outcome, nonce          │                   │
           │       │   },                        │                   │
           │       │   publicInputs: {           │                   │
           │       │     commitment, marketId    │                   │
           │       │   }                         │                   │
           │       │ )                           │                   │
           │       │ ⚠️  PROOF GENERATED LOCALLY  │                   │
           │       └─────────────────────────────┘                   │
           │                  │                   │                   │
           │                  │ 5. Send Proof +  │                   │
           │                  │    Public Data   │                   │
           │                  ├──────────────────▼──────────────────→│
           │                  │              (proof,                 │
           │                  │               commitment,             │
           │                  │               marketId)               │
           │                  │                   │                   │
           │                  │                   │ 6. Validate      │
           │                  │                   │    Timing        │
           │                  │                   │ ┌──────────────┐ │
           │                  │                   │ │if (ended)    │ │
           │                  │                   │ │  reject tx   │ │
           │                  │                   │ └──────────────┘ │
           │                  │                   │                   │
           │                  │                   │ 7. Submit to     │
           │                  │                   │    Blockchain    │
           │                  │                   ├──────────────────→│
           │                  │                   │  (proof, commit) │
           │                  │                   │                   │
           │                  │                   │                   │ 8. Verify Proof
           │                  │                   │                   │ ┌──────────────┐
           │                  │                   │                   │ │ verify ZK    │
           │                  │                   │                   │ │ proof        │
           │                  │                   │                   │ │ update AMM   │
           │                  │                   │                   │ │ shares       │
           │                  │                   │                   │ │ store commit │
           │                  │                   │                   │ └──────────────┘
           │                  │                   │                   │
           │ 9. Confirmation  │                   │ 8. Position      │
           │←─────────────────┼───────────────────┼───────────────────┤
           │(positionId)      │                   │  Created         │
           │                  │                   │                   │
    ┌──────────────────────────────────────────────────────────────────────┐
    │                      2. Settlement Flow                             │
    └──────────────────────────────────────────────────────────────────────┘
           │                  │                   │                   │
           │ 10. Claim        │                   │                   │
           │     Winnings     │                   │                   │
           ├──────────────────┐                   │                   │
           │ (positionId)     │                   │                   │
           │                  ▼                   │                   │
           │       ┌─────────────────────────────┐                   │
           │       │ 11. Retrieve Private Data   │                   │
           │       │ • Load position from local  │                   │
           │       │   encrypted storage         │                   │
           │       │ • userId, amount, outcome   │                   │
           │       │ ⚠️  STILL NEVER LEAVES DEVICE│                   │
           │       └─────────────────────────────┘                   │
           │                  │                   │                   │
           │                  │ 12. Generate     │                   │
           │                  │     Settlement   │                   │
           │                  │     Proof        │                   │
           │                  ▼                   │                   │
           │       ┌─────────────────────────────┐                   │
           │       │ winProof = prove(           │                   │
           │       │   privateInputs: {          │                   │
           │       │     position data           │                   │
           │       │   },                        │                   │
           │       │   publicInputs: {           │                   │
           │       │     market outcome,         │                   │
           │       │     winnings amount         │                   │
           │       │   }                         │                   │
           │       │ )                           │                   │
           │       │ ⚠️  PROOF GENERATED LOCALLY  │                   │
           │       └─────────────────────────────┘                   │
           │                  │                   │                   │
           │                  │ 13. Submit       │                   │
           │                  │     Settlement   │                   │
           │                  ├──────────────────▼──────────────────→│
           │                  │              (winProof,              │
           │                  │               positionId)            │
           │                  │                   │                   │
           │                  │                   │                   │ 14. Verify &
           │                  │                   │                   │     Payout
           │                  │                   │                   │ ┌──────────────┐
           │                  │                   │                   │ │ verify proof │
           │                  │                   │                   │ │ calculate    │
           │                  │                   │                   │ │ winnings     │
           │                  │                   │                   │ │ transfer     │
           │                  │                   │                   │ │ tokens       │
           │                  │                   │                   │ └──────────────┘
           │ 15. Payout       │                   │                   │
           │     Received     │                   │ 14. Settlement   │
           │←─────────────────┼───────────────────┼───────────────────┤
           │ (amount)         │                   │    Complete       │
           │                  │                   │                   │

    🔒 Enhanced Privacy Notes:
    • Private data (amounts, outcomes, IDs) NEVER leaves user device
    • Local proof server generates all ZK proofs client-side  
    • Only cryptographic proofs and commitments sent to blockchain
    • Blockchain never sees individual betting details
    • Even Bodega cannot see private betting information
    • Users have complete control over their sensitive data
```

## 3. Privacy Model and Zero-Knowledge Proofs

### 3.1 Privacy Architecture with Local Proof Server

```
                    Bodega Privacy Architecture - Midnight Local Proof Server
                                  
    ┌─────────────────────────────────────────────────────────────────┐
    │                        USER DEVICE                              │
    │                                                                 │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
    │  │ Bodega DApp │  │Local Proof  │  │   Private Data Store    │  │
    │  │             │──│   Server    │──│ • User ID               │  │
    │  │ • UI/UX     │  │             │  │ • Betting positions     │  │
    │  │ • Market    │  │ • ZK Proof  │  │ • Amounts & outcomes    │  │
    │  │   Display   │  │   Generation│  │ • Entry timestamps      │  │
    │  │ • Tx Submit │  │ • Commitment│  │ • Nonces & secrets      │  │
    │  │             │  │   Creation  │  │ • P&L calculations      │  │
    │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
    │                          │                        │             │
    │                          │                        │             │
    │                     ┌────▼────┐              ┌────▼────┐        │
    │                     │ ZK Proof│              │Position │        │
    │                     │Generator│              │Commitment│        │
    │                     └─────────┘              └─────────┘        │
    └─────────────────────────────────────────────────────────────────┘
                                    │
                                    │ ONLY: ZK Proofs + Commitments
                                    │ NEVER: Private data
                                    ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                    MIDNIGHT BLOCKCHAIN                          │
    │                       (Public Layer)                           │
    │                                                                 │
    │  ┌─────────────────┐              ┌─────────────────────────┐   │
    │  │ Market Metadata │              │    Market State         │   │
    │  │ • Question      │              │ • Total Shares (aggr.)  │   │
    │  │ • End Time      │              │ • Current Odds          │   │
    │  │ • Resolution    │              │ • AMM Invariant         │   │
    │  │   Criteria      │              │ • Active Positions      │   │
    │  │ • Creator Info  │              │ • Market Status         │   │
    │  └─────────────────┘              └─────────────────────────┘   │
    │           │                                    ▲                │
    │           │                                    │                │
    │           ▼                                    │                │
    │  ┌─────────────────────────────────────────────┼──────────────┐ │
    │  │              Position Commitments           │              │ │
    │  │  • Hash(userId, amount, outcome, nonce)     │              │ │
    │  │  • NO individual amounts visible            │              │ │
    │  │  • NO user identities visible               │              │ │
    │  │  • NO outcome preferences visible           │              │ │
    │  └─────────────────────────────────────────────┼──────────────┘ │
    │                                                │                │
    │  ┌─────────────────┐              ┌───────────▼─────────────┐   │
    │  │ Oracle Data     │              │   Settlement Proofs     │   │
    │  │ • Outcomes      │              │ • ZK proof of position  │   │
    │  │ • Evidence      │              │   validity              │   │
    │  │ • Timestamps    │              │ • Winnings calculation  │   │
    │  │ • Disputes      │              │ • NO reveal of losers   │   │
    │  └─────────────────┘              └─────────────────────────┘   │
    └─────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────┐
    │                   Enhanced Privacy Guarantees                   │
    │                                                                 │
    │  🔒 Local Processing: All private data processed on user device │
    │     • Never transmitted to any server or blockchain            │
    │     • ZK proofs generated entirely client-side                 │
    │     • User maintains complete control over sensitive data      │
    │                                                                 │
    │  🔒 Cryptographic Privacy: Zero-knowledge proofs ensure        │
    │     • Position validity without revealing details              │
    │     • Settlement correctness without exposing amounts          │
    │     • Market participation without identity disclosure         │
    │                                                                 │
    │  🔒 Network Privacy: Only commitments and proofs on-chain      │
    │     • Individual bet amounts never touch blockchain            │
    │     • User identities cryptographically separated             │
    │     • Trading patterns completely obfuscated                  │
    │                                                                 │
    │  🔒 Selective Disclosure: Users choose what to reveal          │
    │     • Winners can prove positions to claim rewards            │
    │     • Losers never need to reveal anything                    │
    │     • Compliance data available if legally required           │
    └─────────────────────────────────────────────────────────────────┘

    Client-Side Data Flow:
    [Private Data] → [Local Proof Server] → [ZK Proof] → [Blockchain]
          ↑                   ↑                ↑              ↑
    Never leaves       Never leaves     Only proofs    Public state
      device             device        transmitted       only
```

**Public Data (On-Chain):**

- Market metadata (question, end time, resolution criteria)
- Total volume per outcome (aggregated)
- Current market odds
- Market state and transitions
- Oracle resolutions and challenges

**Private Data (Off-Chain with ZK-Proofs):**

- Individual betting positions
- User identities and bet amounts
- Position entry and exit times
- Individual profit/loss calculations

### 3.2 Zero-Knowledge Circuits

**Position Commitment Circuit:**
```
circuit commitPosition(
    @private userId: UserId,
    @private amount: Amount,
    @private outcome: Outcome,
    @private nonce: Scalar
) -> Hash {
    commitment = poseidon(userId, amount, outcome, nonce)
    assert(amount > 0)
    assert(outcome ∈ {YES, NO})
    return commitment
}
```

**Settlement Proof Circuit:**
```
circuit proveWinnings(
    @private position: Position,
    @private nonce: Scalar,
    @public marketOutcome: Outcome,
    @public totalPool: Amount
) -> Amount {
    // Prove position validity
    commitment = poseidon(position.userId, position.amount, position.outcome, nonce)
    assert(commitment == position.commitment)
    
    // Calculate winnings if outcome matches
    if (position.outcome == marketOutcome) {
        winnings = calculatePayout(position.amount, totalPool)
        return winnings
    } else {
        return 0
    }
}
```

**Liquidity Proof Circuit:**
```
circuit proveLiquidityContribution(
    @private contribution: Amount,
    @private timestamp: Timestamp,
    @public totalLiquidity: Amount
) -> ShareTokens {
    assert(contribution > 0)
    shares = (contribution * PRECISION) / totalLiquidity
    return shares
}
```

### 3.3 Enhanced Privacy Guarantees with Local Proof Server

**Client-Side Data Protection:**

- **Complete Local Processing**: All private data (user IDs, bet amounts, outcomes, nonces) processed entirely on user's device
- **Zero Server Trust**: No reliance on external servers for private data handling
- **Cryptographic Isolation**: Private data never leaves user's control, even encrypted
- **Proof-Only Transmission**: Only zero-knowledge proofs and commitments sent to blockchain

**Betting Privacy:**

- **Individual Position Secrecy**: Bet amounts, outcomes, and timing completely hidden
- **Order Flow Privacy**: No MEV extraction possible - positions invisible until settlement
- **Market Maker Blindness**: AMM operates on aggregate data only, cannot see individual trades
- **Temporal Obfuscation**: Entry/exit timing analysis impossible due to commitment schemes

**Identity Privacy:**

- **Address Unlinkability**: Wallet addresses cryptographically separated from betting positions
- **Cross-Market Privacy**: Betting patterns across different markets remain private
- **Reputation Protection**: No public betting history or performance tracking
- **Selective Disclosure**: Users choose what to reveal, when, and to whom

**Financial Privacy:**

- **P&L Confidentiality**: Individual profit/loss calculations remain private
- **Portfolio Secrecy**: Total positions and risk exposure hidden from all parties
- **Whale Protection**: Large positions cannot be detected or front-run
- **Volume Analysis Resistance**: No correlation possible between wallet activity and market participation

**Cryptographic Guarantees:**

- **Zero-Knowledge Proofs**: Mathematical guarantee that proofs reveal no information beyond validity
- **Commitment Binding**: Positions cryptographically committed without revelation
- **Proof Soundness**: Impossible to generate valid proofs for invalid positions
- **Privacy Preservation**: Even under adversarial conditions, private data remains protected

**Compliance Privacy:**

- **Granular Disclosure**: Reveal only what's legally required, when required
- **Jurisdiction Flexibility**: Different privacy levels for different regulatory environments  
- **Audit Trails**: Compliance data available without compromising general privacy
- **User Control**: Users maintain sovereignty over their disclosure decisions

**Network-Level Privacy:**

- **Traffic Analysis Resistance**: Network communications reveal no betting patterns
- **Metadata Protection**: Transaction timing and frequency provide no information leakage
- **Geographic Privacy**: Physical location of users irrelevant and untrackable
- **ISP/Network Blindness**: Internet service providers cannot infer betting activity

**Advanced Privacy Features:**

- **Future-Proof Privacy**: Architecture adapts to new cryptographic advances
- **Multi-Market Privacy**: Positions across different prediction markets remain unlinkable  
- **Long-Term Secrecy**: Historical betting data remains private indefinitely
- **Recovery Privacy**: Account recovery processes maintain privacy guarantees

## 4. Data Structures and Contract Interfaces

### 4.1 Core Data Types

```typescript
// Market Identifier
type MarketId = string;
type UserId = string;
type PositionId = string;
type OracleId = string;

// Enums
enum Outcome {
    YES = 0,
    NO = 1
}

enum MarketStatus {
    CREATED = "CREATED",
    ACTIVE = "ACTIVE", 
    ENDED = "ENDED",
    RESOLVED = "RESOLVED",
    SETTLED = "SETTLED",
    DISPUTED = "DISPUTED",
    CANCELLED = "CANCELLED"
}

// Basic Types
type Amount = bigint;
type Timestamp = bigint;
type Hash = string;
type Address = string;
type Scalar = bigint;
```

### 4.2 Market Data Structures

```typescript
interface MarketMetadata {
    id: MarketId;
    question: string;
    description: string;
    resolutionCriteria: string;
    creator: Address;
    endTime: Timestamp;      // Off-chain timestamp for market end
    resolutionTime: Timestamp; // Off-chain timestamp for resolution
    creatorBond: Amount;
    minLiquidity: Amount;
    status: MarketStatus;
    createdAt: Timestamp;    // Off-chain timestamp when created
}

interface MarketState {
    id: MarketId;
    sharesYes: Amount;       // Outstanding YES shares
    sharesNo: Amount;        // Outstanding NO shares  
    invariant: Amount;       // Constant product k = sharesYes * sharesNo
    activePositions: number;
    lastTradeTime: Timestamp; // Off-chain timestamp of last trade
}

interface Resolution {
    marketId: MarketId;
    outcome: Outcome;
    oracle: OracleId;
    submittedAt: Timestamp;        // Off-chain timestamp when submitted
    evidence: string;
    bond: Amount;
    challengePeriodEnd: Timestamp; // Off-chain timestamp when challenge period ends
}
```

### 4.3 Position Data Structures

```typescript
interface Position {
    id: PositionId;
    commitment: Hash;          // Public commitment
    // Private fields (off-chain)
    userId?: UserId;           
    marketId?: MarketId;       
    amount?: Amount;           
    outcome?: Outcome;         
    timestamp?: Timestamp;     // Off-chain timestamp when position created
    nonce?: Scalar;            
}

interface PositionProof {
    positionId: PositionId;
    zkProof: ZKProof;
    publicInputs: PublicInputs;
    commitment: Hash;
}

interface Settlement {
    positionId: PositionId;
    marketId: MarketId;
    winnings: Amount;
    proof: ZKProof;
    claimed: boolean;
    claimedAt?: Timestamp;  // Off-chain timestamp when claimed
}
```

### 4.4 Contract Interfaces

**MarketFactory Interface:**
```typescript
interface IMarketFactory {
    // Market Creation
    createMarket(params: CreateMarketParams): Promise<MarketId>;
    cancelMarket(marketId: MarketId): Promise<void>;
    
    // Market Queries
    getMarket(id: MarketId): Promise<MarketMetadata>;
    getMarketState(id: MarketId): Promise<MarketState>;
    listMarkets(status?: MarketStatus): Promise<MarketId[]>;
    
    // Events
    event MarketCreated(marketId: MarketId, creator: Address);
    event MarketCancelled(marketId: MarketId);
}
```

**PredictionMarket Interface:**
```typescript
interface IPredictionMarket {
    // Public Views
    getMetadata(): Promise<MarketMetadata>;
    getState(): Promise<MarketState>;
    getOdds(): Promise<{yes: number, no: number}>;
    getVolume(): Promise<{yes: Amount, no: Amount}>;
    
    // Position Management (Private)
    commitPosition(commitment: Hash, amount: Amount): Promise<PositionId>;
    provePosition(proof: PositionProof): Promise<boolean>;
    
    // Settlement
    claimWinnings(positionId: PositionId, proof: ZKProof): Promise<Amount>;
    
    // Market State Changes
    endMarket(): Promise<void>;
    resolveMarket(outcome: Outcome, evidence: string): Promise<void>;
    
    // Events
    event PositionCommitted(positionId: PositionId, commitment: Hash);
    event MarketResolved(outcome: Outcome, oracle: Address);
    event WinningsClaimed(positionId: PositionId, amount: Amount);
}
```

**Oracle Interface (In-House System):**
```typescript
interface IBodegaOracle {
    // Resolution (Admin functions)
    submitResolution(
        marketId: MarketId, 
        outcome: Outcome, 
        evidence: Evidence
    ): Promise<void>;
    
    // Multi-signature for high-value markets
    proposeResolution(
        marketId: MarketId, 
        outcome: Outcome,
        evidence: Evidence
    ): Promise<ProposalId>;
    
    approveResolution(proposalId: ProposalId): Promise<void>;
    
    // Dispute handling
    submitDispute(
        marketId: MarketId, 
        disputeEvidence: Evidence,
        bond: Amount
    ): Promise<DisputeId>;
    
    resolveDispute(
        disputeId: DisputeId,
        finalOutcome: Outcome
    ): Promise<void>;
    
    // Admin management
    addOracleOperator(operator: Address): Promise<void>;
    removeOracleOperator(operator: Address): Promise<void>;
    
    // Queries
    getResolution(marketId: MarketId): Promise<Resolution>;
    getDisputeStatus(disputeId: DisputeId): Promise<DisputeStatus>;
    isOracleOperator(address: Address): Promise<boolean>;
    
    // Events
    event ResolutionSubmitted(marketId: MarketId, outcome: Outcome);
    event ResolutionProposed(proposalId: ProposalId, marketId: MarketId);
    event DisputeSubmitted(disputeId: DisputeId, marketId: MarketId);
    event DisputeResolved(disputeId: DisputeId, finalOutcome: Outcome);
}
```

## 5. Economic Model and Tokenomics

### 5.1 Token Architecture

**Primary Tokens:**

- **NIGHT**: Midnight network native token for transaction fees
- **DUST**: Governance and reward token for protocol participation
- **Market Shares**: Represent positions in specific prediction markets

**Share Token Model:**

```typescript
interface ShareToken {
    marketId: MarketId;
    outcome: Outcome;
    totalSupply: Amount;
    pricePerShare: number;
}
```

### 5.2 Fee Structure

**Trading Fees:**

- Base trading fee: 0.3% of trade volume
- Distribution: 70% to liquidity providers, 20% to protocol treasury, 10% burned
- Dynamic fees based on market volatility and liquidity depth

**Market Creation:**

- Creator bond: 100 NIGHT tokens (refundable upon proper resolution)
- Listing fee: 10 NIGHT tokens (non-refundable)
- Oracle setup fee: 50 NIGHT tokens

**Oracle Operations (In-House):**

- No bond required for Bodega oracle operators
- Dispute bond: 1000 DUST tokens (returned if dispute succeeds)
- Oracle operational costs covered by platform fees

### 5.3 Automated Market Maker (AMM)

**AMM Implementation (Compact-Compatible):**

Given Compact's limitations (no division, no exponential functions), we'll use a **Simplified Constant Product AMM** instead of full LMSR:

**Constant Product Formula:**
```compact
// Invariant: x * y = k (constant product)
ledger {
    sharesYes: Field;
    sharesNo: Field;
    invariant: Field;  // k = sharesYes * sharesNo
}

export circuit calculatePrice(shares: Field, totalShares: Field, price: Field): Bool {
    // Verify: price * totalShares = shares (avoiding division)
    return price * totalShares == shares;
}

export circuit maintainInvariant(
    oldYes: Field, oldNo: Field, 
    newYes: Field, newNo: Field
): Bool {
    // Ensure k remains constant (or increases)
    return newYes * newNo >= oldYes * oldNo;
}
```

**Alternative: Pre-computed Price Tables**
For more sophisticated pricing, use off-chain LMSR calculations with on-chain verification:

```typescript
// Off-chain: Calculate LMSR prices
function calculateLMSRPrice(shares: [number, number], b: number): [number, number] {
    const expSum = Math.exp(shares[0]/b) + Math.exp(shares[1]/b);
    return [
        Math.exp(shares[0]/b) / expSum,
        Math.exp(shares[1]/b) / expSum
    ];
}

// On-chain: Verify pre-computed prices
circuit verifyPricing(
    sharesYes: Field, sharesNo: Field,
    priceYes: Field, priceNo: Field,
    precision: Field
): Bool {
    // Verify prices sum to 1 (scaled by precision)
    return priceYes + priceNo == precision;
}
```

**Implementation Strategy:**
- **Phase 1**: Use simple constant product AMM for MVP
- **Phase 2**: Implement LMSR pricing off-chain with on-chain verification
- **Phase 3**: Full LMSR when Compact supports advanced math operations

### 5.4 Incentive Mechanisms

**Liquidity Mining:**

- LP providers earn DUST rewards proportional to liquidity provided
- Bonus multipliers for markets with high prediction accuracy
- Time-weighted rewards encourage long-term liquidity provision

**Oracle Operations (In-House):**

- Oracle costs covered by protocol treasury (20% of trading fees)
- Dispute resolution handled by Bodega team
- Insurance fund compensates users for oracle errors

**User Rewards:**

- Volume-based DUST rewards for active traders
- Prediction accuracy streaks earn bonus multipliers
- Referral rewards for bringing new users to platform

### 5.5 Bond Mechanism & Economic Security

**Bond System Overview:**
The protocol uses security deposits (bonds) as economic incentives to ensure honest behavior and prevent spam. Bonds are temporarily locked funds that are released upon successful completion of responsibilities or slashed for malicious behavior.

**Bond Types & Lifecycle:**

```
                          Bond Lifecycle Flow
                              
    ┌─────────────┐    Lock    ┌─────────────┐    Monitor   ┌─────────────┐
    │    USER     │   Bond     │   PROTOCOL  │  Behavior    │  CONDITION  │
    │   Funds     ├─────────→  │   ESCROW    ├─────────────→│   CHECKER   │
    └─────────────┘            └─────────────┘              └─────────────┘
                                      │                            │
                                      │                            │
                                      ▼                            ▼
                          ┌─────────────────────────────────────────────┐
                          │              RESOLUTION                     │
                          └─────────────────────────────────────────────┘
                                      │                            │
                                      ▼                            ▼
                          ┌─────────────┐              ┌─────────────┐
                          │   RELEASE   │              │   SLASH     │
                          │   (Success) │              │ (Violation) │
                          └─────────────┘              └─────────────┘
                                      │                            │
                                      ▼                            ▼
                          ┌─────────────┐              ┌─────────────┐
                          │ Return to   │              │ Burn or     │
                          │ User Wallet │              │ Redistribute│
                          └─────────────┘              └─────────────┘
```

**1. Creator Bond (100 NIGHT)**
```typescript
interface CreatorBond {
    amount: 100_000_000; // 100 NIGHT (in smallest units)
    purpose: "market_creation_commitment";
    lockConditions: {
        trigger: "market_creation";
        duration: "until_market_resolution";
    };
    releaseConditions: {
        success: "market_resolved_successfully";
        slash: ["market_abandoned", "malicious_behavior", "invalid_criteria"];
    };
}
```

**Purpose:**

- Ensures market creator commitment to proper resolution
- Prevents spam/low-quality market creation  
- Provides economic stake in market success

**Lifecycle:**

- **Lock:** At market creation, 100 NIGHT moved to protocol escrow
- **Hold:** Bond remains locked throughout market lifecycle
- **Release:** After successful market resolution (oracle confirms outcome)
- **Slash:** If creator abandons market or violates terms

**2. Dispute Bond (1000 DUST)**
```typescript
interface DisputeBond {
    amount: 1000_000_000; // 1000 DUST (in smallest units)
    purpose: "oracle_dispute_commitment";
    lockConditions: {
        trigger: "dispute_submission";
        evidence: "required_with_bond";
    };
    releaseConditions: {
        success: "dispute_upheld_by_consensus";
        slash: "dispute_rejected_as_frivolous";
    };
}
```

**Purpose:**

- Prevents frivolous disputes against oracle resolutions
- Ensures only serious challenges with evidence are submitted
- Compensates protocol for dispute processing costs

**Lifecycle:**

- **Lock:** When submitting dispute against oracle resolution
- **Hold:** During dispute review period (48-72 hours)
- **Release:** If dispute successful (oracle was wrong) + reward bonus
- **Slash:** If dispute fails (oracle was correct)

**Bond Management System:**

```typescript
interface BondManager {
    // Lock bond when condition triggered
    lockBond(
        user: Address,
        bondType: BondType,
        amount: Amount,
        conditions: BondConditions
    ): Promise<BondId>;
    
    // Check if bond can be released
    checkReleaseConditions(bondId: BondId): Promise<boolean>;
    
    // Release bond back to user
    releaseBond(bondId: BondId): Promise<void>;
    
    // Slash bond for violation
    slashBond(bondId: BondId, reason: string): Promise<void>;
    
    // Query bond status
    getBondStatus(bondId: BondId): Promise<BondStatus>;
}

interface BondStatus {
    id: BondId;
    user: Address;
    amount: Amount;
    type: BondType;
    status: 'LOCKED' | 'RELEASED' | 'SLASHED';
    lockedAt: Timestamp;
    conditions: BondConditions;
    releaseEligible: boolean;
}
```

**Economic Impact & Incentives:**

**Positive Incentives:**

- Released bonds returned in full
- Successful dispute challengers receive bonus rewards
- Long-term reputation benefits for consistent honest behavior

**Negative Incentives:**

- Slashed bonds permanently removed from circulation (burned)
- Loss of economic stake for malicious behavior
- Reduced ability to participate in future protocol activities

**Treasury Management:**

- 20% of all fees go to protocol treasury
- Treasury funds used for:
  - Development and maintenance
  - Bug bounties and security audits
  - Marketing and ecosystem growth
  - Oracle operations and infrastructure
  - Dispute resolution and insurance fund
  - Bond slashing compensation

**Deflationary Mechanisms:**

- 10% of trading fees burned (reduces NIGHT supply)  
- Slashed creator bonds burned after market settlement
- Failed dispute bonds burned (prevents spam disputes)
- Unclaimed bonds after 1 year automatically burned

## 6. State Management and Cleanup

### 6.1 Preventing UTXO Bloat

To prevent unbounded state growth, the protocol implements automatic cleanup mechanisms:

**Cleanup Strategy:**

```typescript
interface CleanupPolicy {
    settlementDeadline: 90 * 24 * 60 * 60; // 90 days in seconds
    archivalThreshold: 180 * 24 * 60 * 60; // 180 days
    batchCleanupSize: 100; // Process 100 expired positions per cleanup
}

// Automatic cleanup circuit
export circuit cleanupExpiredPositions(
    currentTime: Timestamp,
    positions: PositionCommitment[],
    expirationTime: Timestamp
): CleanupResult {
    let expiredCount = 0;
    let reclaimedValue = Field(0);
    
    for (position in positions) {
        if (position.timestamp + EXPIRY_PERIOD < currentTime) {
            expiredCount++;
            reclaimedValue += position.bondValue;
        }
    }
    
    return CleanupResult {
        expiredPositions: expiredCount,
        reclaimedValue: reclaimedValue,
        newStateRoot: computeNewRoot(positions.filter(notExpired))
    };
}
```

**Archival System:**

```typescript
// Move settled markets to IPFS after deadline
interface MarketArchival {
    marketId: MarketId;
    finalState: MarketState;
    ipfsHash: string;           // Complete market history
    archivedAt: Timestamp;
    retentionPolicy: {
        commitments: false;      // Delete individual commitments
        aggregates: true;        // Keep aggregated statistics
        metadata: true;         // Keep market question/outcome
    };
}

// Cleanup triggers
interface AutoCleanupTriggers {
    onSettlement: boolean;      // Clean up when market settles
    onExpiration: boolean;      // Clean up expired unclaimed positions
    onThreshold: number;        // Clean up when state size exceeds threshold
    manual: boolean;           // Allow manual cleanup calls
}
```

### 6.2 Enhanced Oracle Architecture

**Multi-Oracle Consensus System:**

```typescript
interface OracleConsensus {
    primaryOracles: OracleId[];     // 3 primary oracles
    backupOracles: OracleId[];      // 2 backup oracles
    consensusThreshold: 0.66;       // 66% agreement required
    timeoutPeriod: 48 * 60 * 60;   // 48 hours
    challengePeriod: 24 * 60 * 60;  // 24 hours for disputes
}

// Privacy-preserving oracle voting
witness OracleVote {
    oracleId: Bytes32;
    outcome: U8;
    confidence: U8;             // 0-100 confidence score
    evidence: string;
    timestamp: Timestamp;
}

export circuit aggregateOracleVotes(
    votes: OracleVote[],
    threshold: Field,
    marketValue: Field
): OracleConsensus {
    let outcomeScores = new Map<U8, Field>();
    let totalWeight = Field(0);
    
    // Weight votes by oracle reputation and confidence
    for (vote in votes) {
        let weight = calculateOracleWeight(vote.oracleId, vote.confidence);
        outcomeScores[vote.outcome] += weight;
        totalWeight += weight;
    }
    
    // Check if consensus threshold reached
    for ((outcome, score) in outcomeScores) {
        if (score / totalWeight >= threshold) {
            return OracleConsensus {
                outcome: outcome,
                confidence: score / totalWeight,
                participatingOracles: votes.length,
                consensusReached: true
            };
        }
    }
    
    return OracleConsensus {
        outcome: 0, // No consensus
        confidence: Field(0),
        consensusReached: false
    };
}
```

**Oracle Failure Handling:**

```typescript
interface OracleFailureMitigation {
    automaticFailover: {
        enabled: true,
        timeoutThreshold: 48 * 60 * 60, // 48 hours
        backupOracleActivation: true
    },
    disputeResolution: {
        multiSigRequirement: 3, // 3 of 5 oracles must agree
        escalationToDAO: true,  // Escalate if no consensus
        emergencyPause: true    // Pause market if critical failure
    },
    insuranceFund: {
        enabled: true,
        fundingSource: "5% of trading fees",
        coverageLimit: "10,000 NIGHT per market",
        claimProcess: "Automated for oracle failures"
    }
}
```

### 6.3 Proof Failure UX and Recovery

**Enhanced Error Handling:**

```typescript
interface ProofFailureRecovery {
    errorType: "INVALID_PROOF" | "EXPIRED_NONCE" | "INSUFFICIENT_RESOURCES" | "NETWORK_ERROR";
    diagnostics: {
        proofHash: string;
        verificationStep: string;
        deviceCapabilities: DeviceInfo;
        recommendedAction: string;
    };
    recoveryOptions: {
        regenerateProof: boolean;
        adjustParameters: boolean;
        contactSupport: boolean;
    };
}

// Adaptive proof generation
export witness ProofGenerationManager {
    attemptHistory: ProofAttempt[];
    deviceProfile: DeviceCapabilities;
    networkConditions: NetworkInfo;
    
    generateAdaptiveProof(position: PrivatePosition): Result<ZKProof, ProofError> {
        // Adjust proof parameters based on device capabilities
        let params = this.optimizeForDevice(this.deviceProfile);
        
        // Implement progressive fallback
        let strategies = [
            () => this.generateStandardProof(position, params),
            () => this.generateLightweightProof(position, params.reduced()),
            () => this.generateMinimalProof(position, params.minimal())
        ];
        
        for (strategy in strategies) {
            try {
                let proof = strategy();
                this.recordSuccess(strategy);
                return Ok(proof);
            } catch (error) {
                this.recordFailure(strategy, error);
                continue;
            }
        }
        
        return Err(this.generateDetailedError());
    }
}
```

**User Experience Flow:**

```typescript
interface ProofFailureUXFlow {
    immediateResponse: {
        showProgressIndicator: true,
        estimatedTime: "Calculating based on device performance",
        allowCancel: true
    },
    onFailure: {
        displayClearError: true,
        provideDiagnostics: true,
        offerRetryOptions: [
            "Retry with same parameters",
            "Retry with reduced complexity",
            "Switch to different device",
            "Contact support with error details"
        ]
    },
    prevention: {
        deviceCompatibilityCheck: true,
        networkStabilityCheck: true,
        proofComplexityWarnings: true
    }
}
```

## 7. Implementation Considerations

### 7.1 Midnight Platform Integration

**Enhanced UTXO Model:**

Midnight's extended UTXO model provides several advantages for prediction markets:

```typescript
// UTXO Datum Pattern for Market State
interface MarketUTXO {
    datum: {
        marketId: MarketId;
        question: string;
        endTime: Timestamp;         // Block timestamp support
        totalVolume: Amount;
        outcomeCommitments: Hash[];  // Merkle roots of position batches
        resolved: boolean;
        winningOutcome?: Outcome;
    };
    value: Amount;                  // NIGHT tokens locked in market
}

// Redeemer Pattern for Position Claims
interface PositionRedeemer {
    action: "PLACE_BET" | "CLAIM_WINNINGS" | "DISPUTE_OUTCOME";
    zkProof: ZKProof;              // Zero-knowledge proof of validity
    merkleProof?: Hash[];          // For batched positions
    evidence?: string;             // For disputes
}
```

**Timestamp Integration:**

With Midnight's timestamp support, critical timing logic moves on-chain:

```compact
// Native timestamp validation in Compact
export circuit validateMarketTiming(
    currentTime: Timestamp,
    marketEndTime: Timestamp,
    action: Action
): Bool {
    match action {
        Action::PlaceBet => currentTime < marketEndTime,
        Action::ClaimWinnings => currentTime > marketEndTime,
        Action::ResolveMarket => currentTime >= marketEndTime
    }
}

// Automatic state transitions
export circuit updateMarketState(
    currentTime: Timestamp,
    market: MarketState
): MarketState {
    if (!market.ended && currentTime >= market.endTime) {
        return market.withStatus(MarketStatus::ENDED);
    }
    if (market.resolved && currentTime > market.challengePeriodEnd) {
        return market.withStatus(MarketStatus::SETTLED);
    }
    return market;
}
```

**Zero-Knowledge Proof Architecture:**

```typescript
// Witness pattern for private state management
export witness PrivatePositionManager {
    positions: Map<PositionId, PrivatePosition>;
    encryptionKey: CryptoKey;
    
    // All computations happen locally - never transmitted
    calculatePortfolioValue(): Amount {
        return this.positions.values()
            .map(pos => pos.amount)
            .reduce((a, b) => a + b, 0);
    }
    
    // Generate proof without revealing positions
    async provePortfolioSolvency(totalClaimed: Amount): Promise<ZKProof> {
        const actualTotal = this.calculatePortfolioValue();
        return generateProof({
            privateInputs: {
                positions: this.positions,
                actualTotal: actualTotal
            },
            publicInputs: {
                claimedTotal: totalClaimed,
                isSolvent: actualTotal >= totalClaimed
            }
        });
    }
    
    // Secure local storage with encryption
    async persistSecurely(): Promise<void> {
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) },
            this.encryptionKey,
            JSON.stringify(this.positions)
        );
        localStorage.setItem('encrypted_positions', encrypted);
    }
}
```

**Cross-Environment Compatibility:**

```typescript
// Provider pattern for different deployment environments
interface PredictionMarketProvider {
    submitTransaction(circuit: string, inputs: any): Promise<TransactionResult>;
    queryState(marketId: MarketId): Promise<MarketState>;
    generateProof(witness: any, circuit: string): Promise<ZKProof>;
}

// Browser implementation
class BrowserProvider implements PredictionMarketProvider {
    private websocket: WebSocket;
    private proofWorker: Worker;
    
    async generateProof(witness: any, circuit: string): Promise<ZKProof> {
        // Use Web Worker for proof generation to avoid blocking UI
        return new Promise((resolve, reject) => {
            this.proofWorker.postMessage({ witness, circuit });
            this.proofWorker.onmessage = (e) => {
                if (e.data.success) resolve(e.data.proof);
                else reject(e.data.error);
            };
        });
    }
}

// Node.js implementation  
class NodeProvider implements PredictionMarketProvider {
    private httpClient: HttpClient;
    
    async generateProof(witness: any, circuit: string): Promise<ZKProof> {
        // Use native threads for proof generation
        return worker_threads.parentPort.postMessage({
            type: 'GENERATE_PROOF',
            witness,
            circuit
        });
    }
}
```

### 7.2 Compact Smart Contract Architecture

**Contract Hierarchy:**
```
                        System Architecture Overview
                              
    ┌─────────────────────────────────────────────────────────────────┐
    │                        USER LAYER                               │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
    │  │   Web App   │  │ Mobile App  │  │ CLI Tools   │              │
    │  └─────────────┘  └─────────────┘  └─────────────┘              │
    └─────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/WebSocket
                                    ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                    APPLICATION LAYER                            │
    │                     (TypeScript)                                │
    │                                                                 │
    │  ┌─────────────────┐              ┌─────────────────┐           │
    │  │ Market Manager  │              │ Position Manager│           │
    │  │ • Timing Logic  │              │ • ZK Proof Gen  │           │
    │  │ • Validation    │              │ • Commitment    │           │
    │  │ • State Mgmt    │              │   Generation    │           │
    │  └─────────────────┘              └─────────────────┘           │
    │              │                              │                   │
    │              │                              │                   │
    │  ┌─────────────────┐              ┌─────────────────┐           │
    │  │ Oracle Manager  │              │ AMM Calculator  │           │
    │  │ • Resolution    │              │ • Price Calc    │           │
    │  │ • Disputes      │              │ • Slippage Est  │           │
    │  │ • Evidence      │              │ • Share Mgmt    │           │
    │  └─────────────────┘              └─────────────────┘           │
    └─────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Midnight.js SDK
                                    ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                    COMPACT CONTRACTS                            │
    │                    (Midnight Blockchain)                       │
    │                                                                 │
    │  ┌─────────────────────────────────────────────────────────────┐│
    │  │              BodegaMarketFactory                            ││
    │  │  • createMarket()      • getMarket()                       ││
    │  │  • cancelMarket()      • listMarkets()                     ││
    │  └─────────────────────────────────────────────────────────────┘│
    │                              │                                  │
    │         ┌────────────────────┼────────────────────┐             │
    │         │                    │                    │             │
    │         ▼                    ▼                    ▼             │
    │  ┌─────────────┐   ┌─────────────┐    ┌─────────────┐          │
    │  │Prediction   │   │ BodegaOracle│    │ AMM/Liquidity│          │
    │  │Market       │   │             │    │ Pool        │          │
    │  │• placeBet() │   │• submitRes()│    │• calcPrice()│          │
    │  │• claimWin() │   │• dispute()  │    │• updateAMM()│          │
    │  │• getState() │   │• resolve()  │    │• maintain() │          │
    │  └─────────────┘   └─────────────┘    └─────────────┘          │
    │         │                    │                    │             │
    │         └────────────────────┼────────────────────┘             │
    │                              ▼                                  │
    │  ┌─────────────────────────────────────────────────────────────┐│
    │  │                PositionManager                              ││
    │  │  • commitPosition()    • verifyProof()                     ││
    │  │  • generateProof()     • settlePosition()                  ││
    │  └─────────────────────────────────────────────────────────────┘│
    └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                   MIDNIGHT BLOCKCHAIN                           │
    │  • Zero-Knowledge Proof Verification                            │
    │  • Transaction Processing                                       │
    │  • State Storage (Public Only)                                 │
    │  • Event Emission                                               │
    └─────────────────────────────────────────────────────────────────┘

    Data Flow:
    [User] → [TypeScript] → [Compact] → [Midnight Chain]
           ←              ←           ← 
          Events    ZK Proofs    State Updates
```

**Key Implementation Patterns:**

- Modular design for upgradability and testing
- Circuit-based privacy for sensitive operations
- Event-driven architecture for off-chain indexing
- Gas-optimized operations for cost efficiency

### 7.3 Advanced Compact Language Features

**Timestamp Support:**

With native timestamp support, contracts can enforce timing constraints directly:

```compact
// Direct timestamp validation in circuits
ledger PredictionMarket {
    marketId: Field;
    endTime: Timestamp;           // Native timestamp support
    resolutionDeadline: Timestamp;
    challengePeriodEnd: Timestamp;
    sharesYes: Field;
    sharesNo: Field;
}

export circuit placeBet(
    amount: Field,
    outcome: Field,
    currentTime: Timestamp
): Bool {
    // Direct time validation in contract
    assert(currentTime < this.endTime, "Market has ended");
    assert(amount > 0, "Invalid bet amount");
    
    // Update market state
    if (outcome == 0) {
        this.sharesYes += amount;
    } else {
        this.sharesNo += amount;
    }
    
    return true;
}

// Automatic state transitions based on time
export circuit checkMarketStatus(
    currentTime: Timestamp
): MarketStatus {
    if (currentTime >= this.challengePeriodEnd && this.resolved) {
        return MarketStatus::SETTLED;
    }
    if (currentTime >= this.resolutionDeadline && !this.resolved) {
        return MarketStatus::EXPIRED;
    }
    if (currentTime >= this.endTime) {
        return MarketStatus::ENDED;
    }
    return MarketStatus::ACTIVE;
}
```

**Enhanced Cryptographic Operations:**

```compact
// Native signature verification support
export circuit verifyOracleSignature(
    message: Bytes,
    signature: Signature,
    publicKey: PublicKey
): Bool {
    return verify_signature(message, signature, publicKey);
}

// Advanced mathematical operations
export circuit calculateLMSRPrice(
    sharesYes: Field,
    sharesNo: Field,
    liquidityParam: Field
): (Field, Field) {
    // Use native exponential approximation
    let expYes = exp_approx(sharesYes / liquidityParam);
    let expNo = exp_approx(sharesNo / liquidityParam);
    let sum = expYes + expNo;
    
    return (expYes / sum, expNo / sum);
}

// Efficient batch operations
export circuit processBatchedBets(
    bets: BetCommitment[],
    merkleRoot: Hash
): BatchResult {
    let totalYes = Field(0);
    let totalNo = Field(0);
    
    // Verify all bets are in Merkle tree
    for (i, bet) in bets.enumerate() {
        let proof = bet.merkleProof;
        assert(verify_merkle_proof(merkleRoot, bet.commitment, proof), 
               "Invalid Merkle proof");
        
        if (bet.outcome == 0) {
            totalYes += bet.amount;
        } else {
            totalNo += bet.amount;
        }
    }
    
    return BatchResult {
        totalYes: totalYes,
        totalNo: totalNo,
        processedCount: bets.length
    };
}
```

### 7.4 Technical Requirements

**Development Environment:**

- Midnight.js SDK v2.0.0+ (with timestamp support)
- Compact 3.x compiler and VS Code extension
- Node.js 18+ and TypeScript 5+
- Testing framework (Vitest/Jest)
- Zero-knowledge proof libraries (Halo2, Pluto-Eris curves)

**Enhanced Proof Generation:**

- **Native Browser Support**: WebAssembly-based proof generation in browser
- **Multi-Threading**: Parallel proof generation using Web Workers
- **Adaptive Algorithms**: Automatic adjustment based on device capabilities
- **Deployment Options**:
  - **Browser-Native**: Direct proof generation in web browsers
  - **Mobile-Optimized**: Lightweight circuits for mobile devices
  - **Cloud-Hybrid**: Optional cloud acceleration for complex proofs
- **Resource Management**: Dynamic resource allocation based on device profile
- **Security**: Hardware-backed encryption for private data storage

**Infrastructure Requirements:**

- Midnight mainnet/testnet access with NIGHT tokens
- IPFS/Arweave for archival storage (public metadata only)
- Graph Protocol or SubQuery indexer for efficient data queries
- Oracle data sources with cryptographic attestations
- Multi-signature infrastructure for oracle consensus
- Insurance fund smart contracts for oracle failure compensation

**Privacy Infrastructure:**

- **Zero-Knowledge Circuits**: Pre-compiled circuits for position commitments and settlement proofs
- **Cryptographic Libraries**: Poseidon hash, elliptic curve operations for commitments
- **Proof Generation**: Local zk-SNARK proving system (no trusted setup required for user operations)
- **Data Isolation**: Secure separation between private data and network communications

**Deployment Architectures:**

```text
Option 1: Full Local (Maximum Privacy)
┌─────────────────┐
│ User's Device   │
├─────────────────┤
│ • Bodega DApp   │
│ • Local Proof   │
│   Server        │
│ • Private Data  │
│   Storage       │
│ • Network API   │
└─────────────────┘

Option 2: Personal Cloud (Convenience + Privacy)
┌─────────────────┐    ┌─────────────────┐
│ User's Mobile   │────│User's Cloud VPS │
├─────────────────┤    ├─────────────────┤
│ • Bodega App    │    │ • Proof Server  │
│ • Secure Comms  │    │ • Private Store │
└─────────────────┘    │ • Encrypted API │
                       └─────────────────┘

Option 3: Managed Service (Ease of Use)
┌─────────────────┐    ┌─────────────────┐
│ User's Device   │────│Bodega Cloud     │
├─────────────────┤    ├─────────────────┤
│ • Bodega DApp   │    │ • Proof Server  │
│ • UI/UX         │    │ • Encrypted     │
└─────────────────┘    │   Processing    │
                       └─────────────────┘
```

**Performance Optimizations:**

- **Batched Proof Generation**: ~0.5-2 seconds per batch of 10+ positions
- **Reduced Storage**: ~100KB per 1000 positions (compressed + encrypted)
- **Minimal Network Usage**: Only batch roots and proofs transmitted
- **Horizontal Scaling**: Independent user proof generation
- **Circuit Optimization**: Specialized circuits for different market types
- **Caching**: Proof caching for repeated operations
