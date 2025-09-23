# Bodega Market - Privacy-Preserving Prediction Markets

A zero-knowledge prediction market protocol built on the Midnight blockchain that enables private betting with public market outcomes.

## 🌟 Features

- **Privacy-First**: Individual positions remain completely private using zero-knowledge proofs
- **Scalable Batching**: UTXO batching with Merkle tree aggregation for efficient on-chain operations
- **Multi-Oracle Consensus**: Decentralized oracle system with automatic failover and dispute resolution
- **AMM Pricing**: Automated market maker with constant product formula for price discovery
- **Robust Architecture**: Built on Midnight's extended UTXO model with native timestamp support

## 🏗 Architecture

### Core Components

1. **MarketFactory**: Creates and manages prediction markets with bond mechanisms
2. **PredictionMarket**: Handles position batching, AMM pricing, and settlement
3. **OracleConsensus**: Multi-oracle voting system with privacy-preserving consensus
4. **Position Circuits**: Zero-knowledge circuits for private position management

### Privacy Model

- **Public Data**: Market questions, total volumes, current odds
- **Private Data**: Individual positions, bet amounts, user identities
- **Zero-Knowledge Proofs**: Prove position validity without revealing details
- **Local Proof Generation**: All private data processing happens on user devices

## 🚀 Quick Start

### Installation

```bash
npm install bodega-market-zk-contracts
```

### Basic Usage

```typescript
import { BodegaMarketSDK, createBodegaSDK } from 'bodega-market-zk-contracts';

// Initialize SDK
const sdk = await createBodegaSDK({
  midnightProvider: provider,
  contractAddresses: {
    marketFactory: '0x...',
    predictionMarket: '0x...',
    oracleConsensus: '0x...'
  },
  enableLocalProofGeneration: true
});

// Create a market
const marketId = await sdk.createMarket({
  question: 'Will Bitcoin reach $100,000 by end of 2024?',
  description: 'Bitcoin price prediction market',
  resolutionCriteria: 'Based on CoinGecko API data',
  endTime: new Date('2024-12-31'),
  bondAmount: BigInt('100000000000000000000') // 100 NIGHT
});

// Place a private bet
const positionId = await sdk.placeBet({
  marketId,
  amount: BigInt('10000000000000000000'), // 10 NIGHT
  outcome: Outcome.YES
});

// Claim winnings (if position won)
const winnings = await sdk.claimWinnings(positionId);
```

## 📋 Contract Specifications

### Market Lifecycle

```
CREATED → ACTIVE → ENDED → RESOLVED → SETTLED
    ↓        ↓       ↓        ↓         ↓
CANCELLED  PAUSED  EXPIRED DISPUTED  ARCHIVED
```

### Position Batching

- Positions are batched into 30-second windows
- Merkle tree aggregation reduces O(n) → O(1) UTXO operations
- Individual positions remain private within batches
- Batch roots are published on-chain for verification

### Oracle Consensus

- 3 primary + 2 backup oracles per market
- 66% consensus threshold required
- 24-hour challenge period for disputes
- Automatic failover for unresponsive oracles
- Insurance fund for oracle failures

## 🧪 Development

### Prerequisites

- Node.js 18+
- Midnight SDK 2.0+
- Compact 3.x compiler

### Setup

```bash
git clone https://github.com/bodega-market/bodega-market-zk-contracts
cd bodega-market-zk-contracts
npm install
```

### Compile Contracts

```bash
npm run compile:all
```

### Run Tests

```bash
npm test
npm run test:coverage
npm run test:ui
```

### Deploy to Testnet

```bash
npm run deploy:testnet
```

## 📖 Documentation

### Protocol Specification

See [PROTOCOL_SPEC.md](./PROTOCOL_SPEC.md) for detailed protocol documentation including:

- Market lifecycle and state transitions
- UTXO batching architecture
- Oracle consensus mechanisms
- Zero-knowledge circuit specifications
- Economic model and tokenomics

### API Reference

```typescript
// Market Factory Operations
createMarket(params: CreateMarketParams): Promise<MarketId>
getMarket(marketId: MarketId): Promise<MarketMetadata>
getMarketState(marketId: MarketId): Promise<MarketState>

// Position Management
placeBet(params: PlaceBetParams): Promise<PositionId>
claimWinnings(positionId: PositionId): Promise<bigint>
getUserPositions(): Promise<PrivatePosition[]>

// Oracle Operations
getConsensusResult(marketId: MarketId): Promise<ConsensusResult>
submitDispute(params: DisputeParams): Promise<DisputeId>

// Utility Functions
getCurrentPrices(marketId: MarketId): Promise<{yes: number, no: number}>
getUserExposure(marketId?: MarketId): Promise<bigint>
```

## 🔧 Configuration

### Network Configuration

```typescript
const config = {
  midnightProvider: provider,
  contractAddresses: {
    marketFactory: process.env.MARKET_FACTORY_ADDRESS,
    predictionMarket: process.env.PREDICTION_MARKET_ADDRESS,
    oracleConsensus: process.env.ORACLE_CONSENSUS_ADDRESS
  },
  enableLocalProofGeneration: true,
  encryptionKey: await generateEncryptionKey()
};
```

### Environment Variables

```bash
# Network Configuration
MIDNIGHT_RPC_URL=https://testnet.midnight.network
MIDNIGHT_CHAIN_ID=1001

# Contract Addresses
MARKET_FACTORY_ADDRESS=0x...
PREDICTION_MARKET_ADDRESS=0x...
ORACLE_CONSENSUS_ADDRESS=0x...

# Oracle Configuration  
ORACLE_PRIVATE_KEY=0x...
ORACLE_CONSENSUS_THRESHOLD=66
DISPUTE_BOND_AMOUNT=1000000000000000000000

# Security
ENCRYPTION_KEY=...
PROOF_TIMEOUT=300000
```

## 🔐 Security

### Privacy Guarantees

- **Zero-Knowledge Proofs**: Mathematical guarantee that proofs reveal no private information
- **Local Processing**: Private data never leaves user devices
- **Commitment Schemes**: Cryptographic commitments prevent position revelation
- **Encrypted Storage**: Local storage encrypted with user-controlled keys

### Audit Status

- [ ] Smart Contract Audit (Pending)
- [ ] Zero-Knowledge Circuit Audit (Pending)
- [ ] Economic Model Review (Pending)

### Security Best Practices

1. Always generate proofs locally on trusted devices
2. Use hardware wallets for transaction signing
3. Verify contract addresses before interacting
4. Keep private keys and encryption keys secure
5. Monitor positions for unexpected state changes

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Run the test suite (`npm test`)
5. Lint your code (`npm run lint`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Style

- Use TypeScript for all source code
- Follow Prettier formatting rules
- Maintain 100% test coverage for new features
- Document all public APIs with JSDoc comments

## 📊 Performance

### Benchmarks

- **Proof Generation**: ~1-2 seconds per position (browser)
- **Batch Processing**: 100 positions per batch
- **Storage**: ~100KB per 1000 positions (compressed + encrypted)
- **Network**: Only proofs and commitments transmitted

### Optimization Features

- Adaptive proof generation based on device capabilities
- Web Worker utilization for non-blocking proof generation
- Merkle tree batching for reduced on-chain operations
- Client-side caching of frequently accessed data

## 🌐 Ecosystem

### Supported Wallets

- Midnight Native Wallet
- MetaMask (with Midnight network)
- WalletConnect compatible wallets

### Integration Examples

- [React Frontend Template](https://github.com/bodega-market/react-template)
- [Vue.js Integration](https://github.com/bodega-market/vue-integration)
- [Node.js Bot Example](https://github.com/bodega-market/nodejs-bot)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.bodega.market](https://docs.bodega.market)
- **Discord**: [discord.gg/bodega-market](https://discord.gg/bodega-market)
- **GitHub Issues**: [Create an Issue](https://github.com/bodega-market/bodega-market-zk-contracts/issues)
- **Email**: dev@bodega.market

## 🎯 Roadmap

### Phase 1: Core Protocol ✅
- [x] Basic market creation and betting
- [x] Zero-knowledge position commitments
- [x] AMM pricing mechanism
- [x] Single oracle resolution

### Phase 2: Enhanced Privacy 🚧
- [x] UTXO batching system
- [x] Multi-oracle consensus
- [x] Dispute resolution mechanism
- [x] State cleanup and archival

### Phase 3: Advanced Features 📋
- [ ] Cross-chain liquidity bridges
- [ ] Recursive proof composition
- [ ] Mobile SDK
- [ ] Governance token (DUST)

### Phase 4: Ecosystem Growth 📋
- [ ] Market maker incentives
- [ ] Liquidity mining programs
- [ ] Partner integrations
- [ ] Regulatory compliance tools

## 🏆 Acknowledgments

- **Midnight Team**: For building the privacy-first blockchain platform
- **Zero-Knowledge Community**: For advancing ZK research and development
- **Prediction Market Pioneers**: Augur, Gnosis, and other early innovators
- **Open Source Contributors**: Everyone who helped make this project possible

---

**Built with 💜 by the Bodega Market Team**

*Making prediction markets private, one bet at a time.*