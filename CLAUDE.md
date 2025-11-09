# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a zero-knowledge prediction market project built for the Midnight blockchain called "bodega-market-zk-contracts". Midnight is a privacy-first blockchain that uses zero-knowledge proofs to protect sensitive data while maintaining transparency through selective disclosure.

## Midnight Development Environment

**Technology Stack:**
- **Compact**: Midnight's smart contract language (TypeScript-like syntax)
- **Midnight.js SDK**: Official TypeScript client library (v1.0.0+)
- **Zero-Knowledge Proofs**: zk-SNARKs for privacy-preserving computation
- **TypeScript**: For DApp frontend and tooling

**Key Concepts:**
- **Public State**: Shared, on-chain data visible to all
- **Private State**: Individual, off-chain data protected by zk-proofs  
- **Circuits**: Compact functions that generate zero-knowledge proofs
- **Witnesses**: Private state JavaScript functions

## Development Commands

```bash
# Install dependencies
npm install

# Compile Compact contracts
compact compile contracts/

# Run tests
npm test

# Deploy to testnet
npm run deploy:testnet

# Start development server
npm run dev
```

## Project Structure

```
contracts/          # Compact smart contracts (.compact files)
circuits/           # Zero-knowledge circuits  
sdk/               # TypeScript client library
tests/             # Unit and integration tests
scripts/           # Deployment and utility scripts
```

## Compact Language Patterns

**Basic Contract Structure:**
```compact
include "std";

ledger {
    // Public state visible on-chain
    publicField: Type;
}

// Private circuit function
export circuit privateFunction(): Void {
    // zk-proof logic here
}
```

**Privacy Patterns:**
- Use `@private` for sensitive data
- Generate commitments for position tracking
- Implement ring signatures for anonymity
- Separate public metadata from private positions

## Architecture Notes

**Privacy Model:**
- Individual betting positions remain private
- Market metadata (question, end time) is public
- Total volume visible, individual amounts hidden
- Settlement uses zk-proofs for winner verification

**Smart Contract Design:**
- MarketFactory: Creates new prediction markets
- PredictionMarket: Individual market logic
- PositionManager: Handles private betting positions  
- Oracle: Market resolution system

## Testing Strategy

- Unit tests for individual contract functions
- Integration tests for full market lifecycle
- Privacy tests to ensure data protection
- Gas optimization tests for scalability

## Deployment Notes

- Use Midnight testnet for development
- Requires NIGHT tokens for gas fees
- Oracle setup needed for market resolution
- Privacy proofs generated locally, only commitments on-chain