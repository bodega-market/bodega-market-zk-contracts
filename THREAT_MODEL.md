# Bodega Market - Threat Model & Security Analysis

## Executive Summary

This document analyzes the security threats, attack vectors, and mitigation strategies for the Bodega Market privacy-preserving prediction market protocol. The threat model covers privacy attacks, economic manipulation, oracle failures, smart contract vulnerabilities, and infrastructure threats.

**Risk Classification:**
- **Critical**: Could result in loss of funds or complete privacy breach
- **High**: Could result in partial fund loss or significant privacy degradation
- **Medium**: Could result in service disruption or minor privacy leakage
- **Low**: Could result in inconvenience or negligible privacy impact

---

## 1. Trust Assumptions & Security Boundaries

### 1.1 Trust Model

**Trusted Components:**
- Midnight blockchain consensus and ZK proof verification
- Cryptographic primitives (Poseidon hash, elliptic curves)
- User's local device and proof generation environment
- Smart contract code integrity (after audit)

**Untrusted/Adversarial:**
- Other market participants (competitors, traders)
- External data sources and oracles
- Network infrastructure (ISPs, node operators)
- Market creators
- Bodega platform operators (in privacy-critical operations)

### 1.2 Security Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    TRUST BOUNDARIES                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         FULLY TRUSTED (User Control)                │   │
│  │  • User's private keys                              │   │
│  │  • Local proof generation                           │   │
│  │  • Private position data                            │   │
│  │  • Encrypted local storage                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │    CRYPTOGRAPHICALLY TRUSTED                        │   │
│  │  • ZK proofs and commitments                        │   │
│  │  • Midnight blockchain state                        │   │
│  │  • Smart contract logic                             │   │
│  │  • Merkle tree structures                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │    ECONOMICALLY SECURED (Game Theory)               │   │
│  │  • Oracle consensus (bonded)                        │   │
│  │  • Market makers (incentivized)                     │   │
│  │  • Dispute resolution (staked)                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         UNTRUSTED (Adversarial)                     │   │
│  │  • Network infrastructure                           │   │
│  │  • Other market participants                        │   │
│  │  • External data sources                            │   │
│  │  • Platform operators (for privacy)                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Threat Actor Profiles

### 2.1 Malicious Traders

**Capabilities:**
- Create multiple accounts (Sybil attacks)
- Monitor blockchain state and transaction timing
- Run automated trading bots
- Collude with other traders

**Motivations:**
- Extract profits through market manipulation
- Front-run other traders
- Deanonymize competitors

**Attack Surface:**
- Public blockchain data
- Transaction timing and patterns
- Market price movements

### 2.2 Malicious Oracle Operators

**Capabilities:**
- Submit false resolutions
- Delay or withhold resolutions
- Collude with other oracles
- Access to outcome data before resolution

**Motivations:**
- Financial gain from position holdings
- Bribery from interested parties
- Sabotage competitor markets

**Attack Surface:**
- Resolution submission process
- Evidence validation
- Dispute mechanisms

### 2.3 Market Creators (Malicious)

**Capabilities:**
- Create ambiguous market questions
- Manipulate resolution criteria
- Abandon markets without resolution
- Create spam/low-quality markets

**Motivations:**
- Profit from confusing terms
- Avoid losses by abandoning markets
- Spam/griefing

**Attack Surface:**
- Market creation interface
- Resolution criteria definition
- Bond mechanism

### 2.4 Nation-State/Regulatory Adversaries

**Capabilities:**
- Network surveillance and traffic analysis
- Legal compulsion of service providers
- Large-scale data collection
- Advanced cryptanalysis resources

**Motivations:**
- Identify platform users
- Block/censor prediction markets
- Tax enforcement
- Gambling law enforcement

**Attack Surface:**
- Network metadata
- Service provider cooperation
- Geographic user identification

### 2.5 Protocol Exploiters (Hackers)

**Capabilities:**
- Smart contract vulnerability analysis
- Zero-knowledge proof manipulation attempts
- UTXO state manipulation
- Re-entrancy and logic exploits

**Motivations:**
- Direct theft of locked funds
- Disruption of service
- Exploit bounties (if white-hat)

**Attack Surface:**
- Smart contract code
- ZK circuit implementations
- State transition logic
- Economic mechanisms

---

## 3. Privacy Threats

### 3.1 Position Deanonymization

**Threat:** Linking betting positions to user identities.

**Attack Vectors:**

**3.1.1 Timing Analysis**
- **Risk Level:** Medium
- **Description:** Correlating transaction timestamps with position commitments
- **Attack Scenario:**
  ```
  1. Attacker monitors all position commitment transactions
  2. Correlates timing with known user wallet activity
  3. Infers which positions belong to which users
  ```
- **Mitigation:**
  - Batched position commitments (30-second windows)
  - Random delays in transaction submission
  - Decoy transactions for high-value users
  - Tor/VPN usage recommendations
- **Residual Risk:** Low - Batching significantly reduces timing correlation

**3.1.2 Amount Fingerprinting**
- **Risk Level:** High
- **Description:** Unique bet amounts act as identifiers
- **Attack Scenario:**
  ```
  1. User places bet of exactly 13.37 NIGHT tokens
  2. User's wallet shows withdrawal of 13.37 NIGHT
  3. Attacker links position to user via unique amount
  ```
- **Mitigation:**
  - Encourage standard bet sizes (10, 50, 100 NIGHT)
  - Mixing service recommendations for deposits
  - Privacy warnings for unusual amounts
  - Amount normalization in UI
- **Residual Risk:** Medium - Users may still use unique amounts

**3.1.3 Cross-Market Correlation**
- **Risk Level:** Medium
- **Description:** Linking positions across multiple markets
- **Attack Scenario:**
  ```
  1. User bets on multiple related markets (sports team)
  2. Consistent betting patterns emerge
  3. Statistical analysis identifies user's positions
  ```
- **Mitigation:**
  - Independent commitments per market
  - Different nonces for each position
  - Privacy warnings for correlated betting
  - Separate wallet recommendations
- **Residual Risk:** Medium - Behavioral patterns hard to eliminate

### 3.2 Outcome Inference Before Resolution

**Threat:** Inferring likely outcome from betting patterns before official resolution.

**Attack Vectors:**

**3.2.1 Volume Imbalance Analysis**
- **Risk Level:** Low (by design)
- **Description:** Large volume on one side reveals market sentiment
- **Attack Scenario:**
  ```
  1. Market shows 90% probability for YES outcome
  2. Implies large volume on YES side
  3. May influence late bettors or oracle operators
  ```
- **Mitigation:**
  - Expected behavior - markets should reflect information
  - Oracle bonding ensures honest resolution
  - Challenge period allows dispute of manipulation
- **Residual Risk:** Low - This is feature, not bug

**3.2.2 Oracle Operator Position Inference**
- **Risk Level:** High
- **Description:** Oracles could place bets before resolving
- **Attack Scenario:**
  ```
  1. Oracle knows outcome before resolution deadline
  2. Oracle places large bet on winning side
  3. Oracle resolves market honestly but profits from early info
  ```
- **Mitigation:**
  - Prohibit oracle operators from betting on assigned markets
  - Multi-oracle consensus reduces single-oracle knowledge
  - Time-locked oracle assignments (unknown until after betting ends)
  - Oracle activity monitoring and reputation system
- **Residual Risk:** Medium - Enforcement relies on detection

### 3.3 Network-Level Privacy

**3.3.1 IP Address Leakage**
- **Risk Level:** Medium
- **Description:** ISPs or node operators can link IP addresses to transactions
- **Attack Scenario:**
  ```
  1. User connects to Midnight node without VPN
  2. Node operator logs IP addresses and transactions
  3. Deanonymization via ISP cooperation
  ```
- **Mitigation:**
  - Tor/VPN usage recommendations in documentation
  - Multiple node operator options
  - Browser privacy mode recommendations
- **Residual Risk:** Medium - User behavior dependent

**3.3.2 Browser Fingerprinting**
- **Risk Level:** Low
- **Description:** Browser fingerprinting links sessions across markets
- **Attack Scenario:**
  ```
  1. DApp collects browser fingerprints
  2. User accesses multiple markets
  3. Sessions linked via fingerprint
  ```
- **Mitigation:**
  - No tracking/analytics in DApp
  - Privacy-focused browser recommendations
  - Local-only data storage
- **Residual Risk:** Low - Minimal fingerprinting attack surface

---

## 4. Economic & Manipulation Threats

### 4.1 Market Manipulation

**4.1.1 Wash Trading**
- **Risk Level:** Low
- **Description:** User trades with themselves to manipulate prices
- **Attack Scenario:**
  ```
  1. Attacker creates multiple accounts
  2. Places offsetting bets to move market price
  3. Attracts other traders to manipulated price
  4. Attacker exits with profit
  ```
- **Mitigation:**
  - AMM pricing reduces manipulation effectiveness
  - Trading fees make wash trading expensive
  - Batched positions reduce real-time price manipulation
  - Slippage on large trades
- **Residual Risk:** Low - Economic disincentives strong

**4.1.2 Liquidity Attacks**
- **Risk Level:** Medium
- **Description:** Draining liquidity to cause excessive slippage
- **Attack Scenario:**
  ```
  1. Attacker places large bet to drain one side
  2. Market becomes illiquid and prices skew
  3. Attacker profits from distorted prices
  4. Other users suffer from high slippage
  ```
- **Mitigation:**
  - Minimum liquidity requirements for markets
  - Liquidity provider incentives
  - Dynamic slippage warnings
  - Circuit breakers for extreme price movements
- **Residual Risk:** Medium - Determined attacker with capital could impact

**4.1.3 Oracle Bribery**
- **Risk Level:** High
- **Description:** Bribing oracles to resolve in attacker's favor
- **Attack Scenario:**
  ```
  1. Attacker places large bet on one outcome
  2. Attacker offers bribes > bond amount to oracles
  3. Oracles accept bribes and submit false resolution
  4. Attacker profits, honest bettors lose
  ```
- **Mitigation:**
  - Multi-oracle consensus (66% threshold)
  - Anonymous oracle assignment (unknown who to bribe)
  - High bond requirements (1000 DUST)
  - Reputation system for oracles
  - Challenge period with counter-evidence
  - Insurance fund compensates for oracle failures
- **Residual Risk:** Medium - Sophisticated attackers could bribe multiple oracles

### 4.2 Double-Spending & Re-entrancy

**4.2.1 UTXO Double-Spend Attempts**
- **Risk Level:** Critical (if successful)
- **Description:** Attempting to spend same UTXO multiple times
- **Attack Scenario:**
  ```
  1. Attacker submits bet transaction consuming UTXO
  2. Before confirmation, submits conflicting transaction
  3. Attempts to double-spend position funds
  ```
- **Mitigation:**
  - Midnight blockchain prevents UTXO double-spending by design
  - Transaction finality guarantees
  - UTXO consumption tracking in smart contracts
- **Residual Risk:** Very Low - Blockchain-level protection

**4.2.2 Re-entrancy Attacks**
- **Risk Level:** High (if vulnerable)
- **Description:** Recursive calls to drain contract funds
- **Attack Scenario:**
  ```
  1. Attacker claims winnings
  2. During payout, contract calls attacker's callback
  3. Attacker re-enters claim function before state update
  4. Multiple payouts for same position
  ```
- **Mitigation:**
  - Checks-Effects-Interactions pattern in all functions
  - State updates before external calls
  - Re-entrancy guards on sensitive functions
  - Compact language design prevents common re-entrancy
- **Residual Risk:** Low - Proper coding patterns + audit

### 4.3 Economic Exploits

**4.3.1 Arbitrage Exploitation**
- **Risk Level:** Low
- **Description:** Exploiting price differences between markets
- **Attack Scenario:**
  ```
  1. Similar markets have different prices
  2. Arbitrageur profits from price difference
  3. Depletes liquidity from one market
  ```
- **Mitigation:**
  - Expected behavior - arbitrage improves price discovery
  - Sufficient liquidity prevents large-scale exploitation
  - Trading fees reduce arbitrage profitability
- **Residual Risk:** Very Low - Beneficial for protocol

**4.3.2 Fee Manipulation**
- **Risk Level:** Low
- **Description:** Gaming fee structure to extract value
- **Attack Scenario:**
  ```
  1. Attacker identifies fee loopholes
  2. Structures trades to minimize fees
  3. Extracts value from liquidity providers
  ```
- **Mitigation:**
  - Flat percentage-based fees
  - No fee exemptions or special cases
  - Regular fee structure audits
- **Residual Risk:** Very Low - Simple fee model

---

## 5. Oracle & Resolution Threats

### 5.1 Oracle Failures

**5.1.1 Oracle Non-Response**
- **Risk Level:** High
- **Description:** Oracles fail to submit resolutions
- **Attack Scenario:**
  ```
  1. All primary oracles become unresponsive
  2. Market cannot resolve
  3. Funds locked indefinitely
  ```
- **Mitigation:**
  - 3 primary + 2 backup oracles
  - Automatic failover after 48-hour timeout
  - Emergency governance resolution after 7 days
  - Insurance fund for prolonged failures
- **Residual Risk:** Low - Multiple fallback mechanisms

**5.1.2 Conflicting Oracle Data**
- **Risk Level:** Medium
- **Description:** Oracles submit different resolutions
- **Attack Scenario:**
  ```
  1. 2 oracles vote YES, 1 votes NO
  2. No clear consensus reached
  3. Market enters dispute state
  ```
- **Mitigation:**
  - 66% consensus threshold
  - Confidence scoring for weighted votes
  - Evidence submission requirements
  - Dispute resolution process
  - Governance escalation for deadlocks
- **Residual Risk:** Medium - Ambiguous outcomes may cause delays

**5.1.3 Oracle Compromise**
- **Risk Level:** Critical
- **Description:** Oracle private keys stolen or compromised
- **Attack Scenario:**
  ```
  1. Attacker compromises oracle private key
  2. Submits false resolution to benefit attacker's positions
  3. Resolution accepted before detection
  ```
- **Mitigation:**
  - Multi-signature oracle accounts
  - Hardware wallet requirements
  - Anomaly detection on oracle votes
  - 24-hour challenge period
  - Rapid key rotation procedures
  - Insurance fund coverage
- **Residual Risk:** Medium - Depends on oracle security practices

### 5.2 Resolution Manipulation

**5.2.1 Ambiguous Market Questions**
- **Risk Level:** High
- **Description:** Market creator intentionally creates ambiguous questions
- **Attack Scenario:**
  ```
  1. Market question: "Will candidate win?"
  2. Ambiguous: win primary or general election?
  3. Creator and friends bet based on private interpretation
  4. Oracle resolves in creator's favor
  ```
- **Mitigation:**
  - Market question review before activation
  - Clear resolution criteria requirements
  - Community reporting of ambiguous markets
  - Creator bond slashing for ambiguous questions
  - Dispute process with evidence requirements
- **Residual Risk:** Medium - Subjective determination

**5.2.2 Oracle Collusion**
- **Risk Level:** High
- **Description:** Multiple oracles collude to submit false resolution
- **Attack Scenario:**
  ```
  1. 3 oracles coordinate to vote for false outcome
  2. 66% threshold reached
  3. Market resolves incorrectly
  4. Honest bettors lose funds
  ```
- **Mitigation:**
  - Anonymous oracle selection (unknown until needed)
  - Oracle diversity requirements (geography, reputation)
  - Economic penalties exceed potential gains
  - Challenge period with evidence submission
  - Reputation damage for dishonest oracles
  - Insurance fund for proven collusion
- **Residual Risk:** Medium - Sophisticated collusion still possible

**5.2.3 Evidence Fabrication**
- **Risk Level:** Medium
- **Description:** Submitting fake evidence to support false resolution
- **Attack Scenario:**
  ```
  1. Oracle submits resolution with fabricated screenshots
  2. Evidence appears legitimate at first glance
  3. Market resolves incorrectly
  ```
- **Mitigation:**
  - Multiple independent evidence sources required
  - Community verification during challenge period
  - Cryptographic attestations from trusted sources
  - Evidence provenance tracking
  - Reputation penalties for false evidence
- **Residual Risk:** Medium - Deep fakes and sophisticated forgeries

---

## 6. Smart Contract Vulnerabilities

### 6.1 Logic Errors

**6.1.1 State Transition Bugs**
- **Risk Level:** Critical
- **Description:** Incorrect state machine transitions
- **Attack Scenario:**
  ```
  1. Market in ENDED state
  2. Bug allows transition back to ACTIVE
  3. Attacker places bets after outcome known
  4. Guaranteed profit for attacker
  ```
- **Mitigation:**
  - Formal verification of state machine
  - Comprehensive state transition tests
  - Immutable state transition rules
  - External security audit
- **Residual Risk:** Low - Rigorous testing and audit

**6.1.2 Arithmetic Errors**
- **Risk Level:** High
- **Description:** Integer overflow/underflow in calculations
- **Attack Scenario:**
  ```
  1. Large bet amount causes overflow
  2. Share calculation wraps to small number
  3. Attacker receives massive shares for small cost
  ```
- **Mitigation:**
  - SafeMath operations throughout
  - Bounds checking on all arithmetic
  - Compact language protections
  - Fuzzing tests for edge cases
- **Residual Risk:** Low - Multiple layers of protection

**6.1.3 Access Control Failures**
- **Risk Level:** Critical
- **Description:** Unauthorized access to privileged functions
- **Attack Scenario:**
  ```
  1. Admin function lacks access control
  2. Attacker calls admin function directly
  3. Drains protocol treasury or manipulates state
  ```
- **Mitigation:**
  - Strict access control on all admin functions
  - Multi-signature requirements for critical operations
  - Role-based access control (RBAC)
  - Security audit of all permission checks
- **Residual Risk:** Low - Standard security practice

### 6.2 ZK Circuit Vulnerabilities

**6.2.1 Malformed Proof Acceptance**
- **Risk Level:** Critical
- **Description:** Invalid proofs pass verification
- **Attack Scenario:**
  ```
  1. Attacker crafts malformed ZK proof
  2. Circuit verification bug accepts invalid proof
  3. Attacker claims winnings without valid position
  ```
- **Mitigation:**
  - Trusted setup ceremony for circuits (if required)
  - Multiple proof system implementations for verification
  - Formal verification of circuits
  - Extensive fuzzing and edge case testing
  - Security audit by ZK experts
- **Residual Risk:** Low - Mature ZK libraries and audits

**6.2.2 Witness Manipulation**
- **Risk Level:** Medium
- **Description:** Attacker manipulates witness data
- **Attack Scenario:**
  ```
  1. Attacker modifies private witness inputs
  2. Generates proof with false position data
  3. Attempts to claim invalid winnings
  ```
- **Mitigation:**
  - Commitment-binding ensures witness cannot change
  - Public input validation
  - Merkle proof verification
  - Proof verification checks witness consistency
- **Residual Risk:** Low - Cryptographic binding prevents manipulation

**6.2.3 Circuit Constraints Incomplete**
- **Risk Level:** High
- **Description:** Missing constraints allow invalid states
- **Attack Scenario:**
  ```
  1. Circuit doesn't constrain all variables
  2. Attacker exploits unconstrained values
  3. Generates valid proof for invalid position
  ```
- **Mitigation:**
  - Exhaustive constraint coverage analysis
  - Formal verification of circuit completeness
  - Security audit by ZK circuit experts
  - Test vectors covering all edge cases
- **Residual Risk:** Medium - Complex circuits hard to verify completely

---

## 7. Infrastructure & Operational Threats

### 7.1 Denial of Service (DoS)

**7.1.1 UTXO Spam**
- **Risk Level:** Medium
- **Description:** Attacker creates excessive UTXOs to bloat state
- **Attack Scenario:**
  ```
  1. Attacker creates thousands of tiny positions
  2. UTXO set grows excessively
  3. Node performance degrades
  4. Legitimate users experience slowdowns
  ```
- **Mitigation:**
  - Minimum bet amounts (prevents dust positions)
  - UTXO batching (reduces state growth)
  - Automatic cleanup of expired positions
  - Storage rent for long-lived UTXOs
- **Residual Risk:** Low - Economic disincentives

**7.1.2 Proof Generation DoS**
- **Risk Level:** Low
- **Description:** Forcing users to generate expensive proofs
- **Attack Scenario:**
  ```
  1. Attacker forces complex proof generation
  2. User's device overwhelmed
  3. User cannot submit transaction in time
  ```
- **Mitigation:**
  - Adaptive proof generation (device-dependent)
  - Progressive fallback to lighter proofs
  - Client-side caching of proof components
  - Proof generation timeouts and retries
- **Residual Risk:** Low - Local generation limits attack surface

**7.1.3 Network Flooding**
- **Risk Level:** Medium
- **Description:** Overwhelming network with transaction spam
- **Attack Scenario:**
  ```
  1. Attacker submits thousands of invalid transactions
  2. Network congestion increases
  3. Legitimate transactions delayed or dropped
  ```
- **Mitigation:**
  - Transaction fees deter spam
  - Rate limiting at RPC level
  - Priority queues for valid transactions
  - Midnight blockchain spam protections
- **Residual Risk:** Medium - Determined attacker with capital could impact

### 7.2 Centralization Risks

**7.2.1 Oracle Centralization**
- **Risk Level:** High
- **Description:** All oracles controlled by single entity
- **Attack Scenario:**
  ```
  1. Bodega team controls all oracle keys
  2. Team resolves markets dishonestly
  3. No decentralization, users must trust platform
  ```
- **Mitigation:**
  - Multi-party oracle network planned
  - Geographic and organizational diversity
  - Transparent oracle selection process
  - Governance transition plan
  - Community oracle program
- **Residual Risk:** High (Phase 1) → Medium (Phase 2) - Roadmap dependent

**7.2.2 Contract Upgrade Risks**
- **Risk Level:** Medium
- **Description:** Centralized upgrade authority could deploy malicious code
- **Attack Scenario:**
  ```
  1. Admin key compromised or malicious
  2. Deploys contract with backdoor
  3. Drains user funds or manipulates state
  ```
- **Mitigation:**
  - Time-locked upgrades (48-hour delay)
  - Multi-signature upgrade requirements (3-of-5)
  - Community review period before activation
  - Immutable core logic components
  - Progressive decentralization roadmap
- **Residual Risk:** Medium - Trust in governance process

**7.2.3 Front-End Compromise**
- **Risk Level:** High
- **Description:** Malicious code injected into DApp front-end
- **Attack Scenario:**
  ```
  1. Bodega website compromised
  2. Malicious JavaScript steals private keys
  3. Users sign transactions draining funds
  ```
- **Mitigation:**
  - Open-source front-end code
  - IPFS hosting for decentralized access
  - Subresource Integrity (SRI) checks
  - Browser wallet transaction review
  - Community mirrors and verification
- **Residual Risk:** Medium - Users must verify domain/code

### 7.3 External Dependencies

**7.3.1 Midnight Blockchain Vulnerabilities**
- **Risk Level:** Critical (if exploited)
- **Description:** Underlying blockchain has critical bug
- **Attack Scenario:**
  ```
  1. Midnight consensus bug discovered
  2. Chain halts or forks
  3. All Bodega markets frozen or state inconsistent
  ```
- **Mitigation:**
  - Monitor Midnight security advisories
  - Rapid response plan for chain issues
  - Graceful degradation and pause mechanisms
  - Multi-chain expansion roadmap
- **Residual Risk:** Low - Midnight team security focus

**7.3.2 Cryptographic Library Vulnerabilities**
- **Risk Level:** High (if exploited)
- **Description:** Bug in ZK proof or hash libraries
- **Attack Scenario:**
  ```
  1. Poseidon hash collision discovered
  2. Attacker generates fake commitments
  3. Claims invalid positions
  ```
- **Mitigation:**
  - Use battle-tested cryptographic libraries
  - Multiple implementation verification
  - Monitor security research and advisories
  - Upgrade paths for cryptographic agility
- **Residual Risk:** Low - Mature libraries, active monitoring

---

## 8. Compliance & Regulatory Threats

### 8.1 Regulatory Enforcement

**8.1.1 Platform Shutdown**
- **Risk Level:** High
- **Description:** Authorities order platform closure
- **Attack Scenario:**
  ```
  1. Regulators determine platform violates gambling laws
  2. Bodega team receives cease-and-desist
  3. Platform shuts down, users lose access
  ```
- **Mitigation:**
  - Decentralized architecture (no single point of shutdown)
  - Open-source code (community can fork)
  - Geographic diversity of team and infrastructure
  - Governance token for community control
  - Legal compliance in supported jurisdictions
- **Residual Risk:** High - Regulatory landscape uncertain

**8.1.2 User Identification Requirements**
- **Risk Level:** High
- **Description:** KYC/AML requirements imposed
- **Attack Scenario:**
  ```
  1. Regulations require user identification
  2. Platform must collect personal information
  3. Privacy guarantees compromised
  ```
- **Mitigation:**
  - Selective disclosure capabilities built-in
  - Jurisdiction-specific deployments
  - Self-hosted option for users
  - Privacy-preserving KYC research
- **Residual Risk:** High - Regulatory requirements may conflict with privacy

### 8.2 Financial Crime

**8.2.1 Money Laundering**
- **Risk Level:** Medium
- **Description:** Platform used to launder illicit funds
- **Attack Scenario:**
  ```
  1. Criminal places large bets on both sides
  2. Claims winnings as "legitimate" gambling proceeds
  3. Obfuscates origin of funds
  ```
- **Mitigation:**
  - Transaction monitoring for suspicious patterns
  - Collaboration with chain analysis firms
  - Selective disclosure for law enforcement
  - Terms of service prohibitions
- **Residual Risk:** Medium - Privacy-AML balance difficult

**8.2.2 Insider Trading / Material Non-Public Information**
- **Risk Level:** Medium
- **Description:** Users betting on insider information
- **Attack Scenario:**
  ```
  1. Corporate insider bets on company events
  2. Uses prediction market to profit from MNPI
  3. Violates securities laws
  ```
- **Mitigation:**
  - Terms of service prohibitions
  - Market rules against insider trading
  - Community reporting mechanisms
  - Collaboration with regulators on enforcement
- **Residual Risk:** Medium - Detection difficult with privacy

---

## 9. Mitigation Summary Matrix

| Threat Category | Risk Level | Primary Mitigation | Residual Risk | Monitoring Required |
|----------------|------------|-------------------|---------------|-------------------|
| **Privacy Threats** |
| Timing Analysis | Medium | Batched commitments | Low | Transaction pattern analysis |
| Amount Fingerprinting | High | Standard sizes, mixing | Medium | User education metrics |
| Cross-Market Correlation | Medium | Independent commitments | Medium | Statistical analysis |
| **Economic Threats** |
| Wash Trading | Low | AMM + fees | Low | Volume analysis |
| Liquidity Attacks | Medium | Min liquidity, incentives | Medium | Liquidity depth monitoring |
| Oracle Bribery | High | Multi-oracle, anonymity | Medium | Oracle behavior analysis |
| **Oracle Threats** |
| Oracle Non-Response | High | Backup oracles, timeouts | Low | Oracle uptime monitoring |
| Oracle Collusion | High | Anonymity, high bonds | Medium | Vote pattern analysis |
| Evidence Fabrication | Medium | Multiple sources | Medium | Community verification |
| **Smart Contract Threats** |
| State Transition Bugs | Critical | Formal verification, audit | Low | State monitoring |
| Arithmetic Errors | High | SafeMath, bounds checking | Low | Anomaly detection |
| ZK Circuit Bugs | Critical | Expert audit, formal verification | Low | Proof verification metrics |
| **Infrastructure Threats** |
| UTXO Spam | Medium | Min amounts, batching | Low | State growth monitoring |
| Network Flooding | Medium | Fees, rate limiting | Medium | Network congestion alerts |
| Oracle Centralization | High | Decentralization roadmap | Medium | Oracle distribution metrics |
| **Regulatory Threats** |
| Platform Shutdown | High | Decentralization | High | Legal monitoring |
| KYC Requirements | High | Selective disclosure | High | Regulatory tracking |

---

## 10. Security Roadmap & Future Improvements

### Phase 1: Launch Security (Current)
- ✅ Basic ZK privacy implementation
- ✅ Single oracle with challenge period
- ✅ Standard smart contract security
- ✅ Local proof generation
- ⚠️ Centralized oracle operators (Bodega team)

### Phase 2: Enhanced Privacy (3-6 months)
- 🚧 UTXO batching implementation
- 🚧 Multi-oracle consensus system
- 🚧 Improved timing attack resistance
- 🚧 Enhanced proof generation optimization
- 📋 External security audit

### Phase 3: Decentralization (6-12 months)
- 📋 Community oracle program
- 📋 Governance token launch (DUST)
- 📋 Decentralized front-end hosting
- 📋 Time-locked contract upgrades
- 📋 Insurance fund activation

### Phase 4: Advanced Security (12+ months)
- 📋 Recursive proof composition
- 📋 Cross-chain security bridges
- 📋 Advanced privacy features (stealth addresses)
- 📋 Formal verification of all contracts
- 📋 Bug bounty program expansion

---

## 11. Incident Response Plan

### Severity Classification

**Critical (P0):**
- Loss of user funds
- Complete privacy breach
- Contract exploit in progress

**High (P1):**
- Partial fund loss
- Oracle manipulation detected
- Significant privacy degradation

**Medium (P2):**
- Service disruption
- Minor privacy leakage
- Oracle delays

**Low (P3):**
- Performance degradation
- Cosmetic issues
- Documentation errors

### Response Procedures

**Critical Incidents:**
1. **Immediate (0-15 minutes):**
   - Activate emergency pause mechanism
   - Notify core team via emergency channels
   - Begin incident investigation

2. **Short-term (15 minutes - 2 hours):**
   - Assess scope of impact
   - Prepare emergency fix if applicable
   - Notify affected users
   - Deploy mitigations

3. **Medium-term (2-24 hours):**
   - Deploy permanent fix
   - Coordinate with auditors for verification
   - Prepare post-mortem
   - Compensate affected users (if applicable)

4. **Long-term (24+ hours):**
   - Publish detailed post-mortem
   - Implement prevention measures
   - Update threat model
   - Enhance monitoring

**Communication Channels:**
- Emergency: Discord admin channel, PagerDuty
- User notification: Twitter, Discord, in-app alerts
- Technical coordination: GitHub security advisories
- Post-mortem: Blog, documentation

---

## 12. Monitoring & Detection

### Security Metrics

**Privacy Monitoring:**
- Transaction timing distribution analysis
- Bet amount uniqueness metrics
- Cross-market correlation detection
- Anomalous user behavior patterns

**Economic Monitoring:**
- Large position alerts (>10% of market)
- Rapid price movement detection
- Liquidity depth tracking
- Unusual trading patterns

**Oracle Monitoring:**
- Oracle response times
- Vote divergence metrics
- Evidence submission patterns
- Challenge rate statistics

**Contract Monitoring:**
- State transition anomalies
- Unexpected fund movements
- Gas usage patterns
- Proof verification failure rates

### Automated Alerts

**Critical Alerts (Immediate Response):**
- Potential exploit detected
- Oracle collusion pattern
- Unexpected fund withdrawal
- Proof verification failures >5%

**High Priority Alerts (1-hour response):**
- Liquidity below threshold
- Oracle non-response >24 hours
- Unusual transaction volume spike
- State growth exceeding limits

**Medium Priority Alerts (24-hour response):**
- Gradual liquidity decline
- Increasing dispute rate
- Performance degradation
- User error rate increase

---

## 13. Auditing & Testing Strategy

### Security Audits

**Smart Contract Audit:**
- [ ] External audit by tier-1 firm (planned Q2 2024)
- [ ] Focus areas: Access control, arithmetic, state transitions
- [ ] Gas optimization review
- [ ] Upgradability security

**ZK Circuit Audit:**
- [ ] Specialized ZK security firm (planned Q2 2024)
- [ ] Constraint completeness verification
- [ ] Trusted setup review (if applicable)
- [ ] Proof soundness analysis

**Economic Model Review:**
- [ ] Game theory analysis by economists
- [ ] Mechanism design verification
- [ ] Bond sizing optimization
- [ ] Fee structure analysis

### Continuous Testing

**Automated Testing:**
- Unit tests: 100% coverage target
- Integration tests: All state transitions
- Fuzzing: Arithmetic and input validation
- Property-based testing: Invariant verification

**Manual Testing:**
- Penetration testing: Quarterly
- Oracle manipulation scenarios
- Privacy attack simulations
- Social engineering tests

---

## 14. Conclusion

The Bodega Market protocol faces a complex threat landscape spanning privacy, economic, technical, and regulatory domains. This threat model identifies key risks and mitigation strategies across all categories.

**Key Takeaways:**

1. **Privacy is foundational**: Local proof generation and ZK circuits provide strong privacy guarantees, but operational security (timing, amounts, behavior) requires user awareness.

2. **Economic security relies on incentives**: Bonds, multi-oracle consensus, and challenge periods align incentives for honest behavior.

3. **Technical security requires defense in depth**: Smart contract audits, ZK circuit verification, and blockchain-level protections create multiple security layers.

4. **Decentralization reduces single points of failure**: Progressive decentralization roadmap addresses centralization risks over time.

5. **Regulatory uncertainty is highest risk**: Privacy-first design may conflict with emerging regulations; selective disclosure capabilities provide flexibility.

**Ongoing Security Commitment:**

- Regular security audits and penetration testing
- Bug bounty program for responsible disclosure
- Continuous monitoring and incident response
- Transparent communication of vulnerabilities and fixes
- Progressive decentralization to reduce trust assumptions

This threat model is a living document and will be updated as new threats emerge, mitigations are implemented, and the protocol evolves.
