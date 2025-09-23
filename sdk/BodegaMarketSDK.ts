// Bodega Market TypeScript SDK
// Privacy-preserving prediction market client library

import { 
  MidnightProvider, 
  MidnightSDK, 
  ZKProof, 
  ContractAPI,
  Witness,
  PublicInputs,
  PrivateInputs 
} from './mocks/midnight-sdk';

// Core types
export interface MarketId extends String {}
export interface PositionId extends String {}
export interface OracleId extends String {}
export interface UserId extends String {}

export enum Outcome {
  YES = 0,
  NO = 1
}

export enum MarketStatus {
  CREATED = 'CREATED',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  RESOLVED = 'RESOLVED',
  SETTLED = 'SETTLED',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export interface MarketMetadata {
  id: MarketId;
  question: string;
  description: string;
  resolutionCriteria: string;
  creator: string;
  endTime: Date;
  resolutionDeadline: Date;
  challengePeriodEnd: Date;
  creatorBond: bigint;
  minLiquidity: bigint;
  status: MarketStatus;
  createdAt: Date;
}

export interface MarketState {
  id: MarketId;
  sharesYes: bigint;
  sharesNo: bigint;
  invariant: bigint;
  liquidityParameter: bigint;
  totalVolume: bigint;
  activePositions: bigint;
  lastTradeTime: Date;
  batchCounter: bigint;
}

export interface PrivatePosition {
  userId: UserId;
  amount: bigint;
  outcome: Outcome;
  nonce: bigint;
  marketId: MarketId;
  timestamp: Date;
}

export interface BatchedPositionUTXO {
  batchId: string;
  merkleRoot: string;
  totalValue: bigint;
  positionCount: bigint;
  batchTimestamp: Date;
  marketId: MarketId;
  processed: boolean;
}

export interface ConsensusResult {
  outcome: Outcome;
  confidence: bigint;
  participatingOracles: bigint;
  consensusReached: boolean;
  disputeThreshold: bigint;
}

// SDK Configuration
export interface BodegaSDKConfig {
  midnightProvider: MidnightProvider;
  contractAddresses: {
    marketFactory: string;
    predictionMarket: string;
    oracleConsensus: string;
  };
  enableLocalProofGeneration: boolean;
  encryptionKey?: CryptoKey;
  storagePrefix?: string;
}

// Error types
export class BodegaError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BodegaError';
  }
}

export class ProofGenerationError extends BodegaError {
  constructor(message: string, details?: any) {
    super(message, 'PROOF_GENERATION_ERROR', details);
  }
}

export class MarketNotFoundError extends BodegaError {
  constructor(marketId: MarketId) {
    super(`Market not found: ${marketId}`, 'MARKET_NOT_FOUND', { marketId });
  }
}

export class InvalidPositionError extends BodegaError {
  constructor(message: string, details?: any) {
    super(message, 'INVALID_POSITION', details);
  }
}

// Private state management
export class PrivateStateManager {
  private positions: Map<PositionId, PrivatePosition> = new Map();
  private encryptionKey: CryptoKey | null = null;
  private storagePrefix: string;

  constructor(encryptionKey?: CryptoKey, storagePrefix = 'bodega_') {
    this.encryptionKey = encryptionKey;
    this.storagePrefix = storagePrefix;
  }

  async storePosition(positionId: PositionId, position: PrivatePosition): Promise<void> {
    // Store in memory
    this.positions.set(positionId, position);

    // Persist to encrypted storage if encryption key available
    if (this.encryptionKey && typeof localStorage !== 'undefined') {
      try {
        const serialized = JSON.stringify(position, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        );
        
        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) },
          this.encryptionKey,
          new TextEncoder().encode(serialized)
        );

        localStorage.setItem(
          `${this.storagePrefix}position_${positionId}`,
          JSON.stringify({
            encrypted: Array.from(new Uint8Array(encrypted)),
            timestamp: Date.now()
          })
        );
      } catch (error) {
        console.warn('Failed to persist position to storage:', error);
      }
    }
  }

  async getPosition(positionId: PositionId): Promise<PrivatePosition | null> {
    // Check memory first
    if (this.positions.has(positionId)) {
      return this.positions.get(positionId)!;
    }

    // Try to load from encrypted storage
    if (this.encryptionKey && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(`${this.storagePrefix}position_${positionId}`);
        if (stored) {
          const { encrypted } = JSON.parse(stored);
          const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(12) }, // Note: IV should be stored with data
            this.encryptionKey,
            new Uint8Array(encrypted)
          );

          const position = JSON.parse(new TextDecoder().decode(decrypted), (key, value) => {
            if (key === 'amount' || key === 'nonce') return BigInt(value);
            if (key === 'timestamp' || key === 'endTime' || key === 'resolutionDeadline') return new Date(value);
            return value;
          });

          this.positions.set(positionId, position);
          return position;
        }
      } catch (error) {
        console.warn('Failed to load position from storage:', error);
      }
    }

    return null;
  }

  getAllPositions(): PrivatePosition[] {
    return Array.from(this.positions.values());
  }

  getPositionsByMarket(marketId: MarketId): PrivatePosition[] {
    return this.getAllPositions().filter(pos => pos.marketId === marketId);
  }

  calculateTotalExposure(): bigint {
    return this.getAllPositions().reduce((total, pos) => total + pos.amount, 0n);
  }

  calculateMarketExposure(marketId: MarketId): bigint {
    return this.getPositionsByMarket(marketId).reduce((total, pos) => total + pos.amount, 0n);
  }
}

// Proof generation manager
export class ProofGenerationManager {
  private sdk: MidnightSDK;
  private attempts: Map<string, number> = new Map();
  private deviceCapabilities: any = null;

  constructor(sdk: MidnightSDK) {
    this.sdk = sdk;
    this.detectDeviceCapabilities();
  }

  private detectDeviceCapabilities() {
    // Detect device capabilities for adaptive proof generation
    this.deviceCapabilities = {
      cores: navigator.hardwareConcurrency || 4,
      memory: (navigator as any).deviceMemory || 4,
      webgl: !!document.createElement('canvas').getContext('webgl2'),
      webAssembly: typeof WebAssembly !== 'undefined',
      serviceWorker: 'serviceWorker' in navigator,
    };
  }

  async generatePositionCommitmentProof(
    position: PrivatePosition
  ): Promise<{ commitment: string; proof: ZKProof }> {
    const proofId = `position_${position.nonce}`;
    const attempts = this.attempts.get(proofId) || 0;

    try {
      // Generate commitment
      const commitment = await this.generateCommitment(position);

      // Generate ZK proof
      const privateInputs: PrivateInputs = {
        userId: position.userId,
        amount: position.amount.toString(),
        outcome: position.outcome,
        nonce: position.nonce.toString(),
        marketId: position.marketId,
        timestamp: Math.floor(position.timestamp.getTime() / 1000)
      };

      const publicInputs: PublicInputs = {
        commitment,
        marketId: position.marketId
      };

      const proof = await this.sdk.generateProof(
        'createPositionCommitment',
        privateInputs,
        publicInputs
      );

      this.attempts.delete(proofId);
      return { commitment, proof };

    } catch (error) {
      const newAttempts = attempts + 1;
      this.attempts.set(proofId, newAttempts);

      if (newAttempts >= 3) {
        this.attempts.delete(proofId);
        throw new ProofGenerationError(
          'Failed to generate proof after 3 attempts',
          { 
            position: { marketId: position.marketId, amount: position.amount.toString() },
            error: error.message,
            deviceCapabilities: this.deviceCapabilities
          }
        );
      }

      // Retry with adjusted parameters
      await this.delay(1000 * newAttempts);
      return this.generatePositionCommitmentProof(position);
    }
  }

  async generateSettlementProof(
    position: PrivatePosition,
    winningOutcome: Outcome,
    payoutRatio: bigint,
    nullifier: string
  ): Promise<ZKProof> {
    try {
      const privateInputs: PrivateInputs = {
        position: {
          userId: position.userId,
          amount: position.amount.toString(),
          outcome: position.outcome,
          nonce: position.nonce.toString(),
          marketId: position.marketId,
          timestamp: Math.floor(position.timestamp.getTime() / 1000)
        },
        winningOutcome,
        payoutRatio: payoutRatio.toString()
      };

      const publicInputs: PublicInputs = {
        winningsAmount: ((position.amount * payoutRatio) / 100n).toString(),
        nullifier
      };

      return await this.sdk.generateProof(
        'proveWinnings',
        privateInputs,
        publicInputs
      );

    } catch (error) {
      throw new ProofGenerationError(
        'Failed to generate settlement proof',
        { error: error.message, position: position.marketId }
      );
    }
  }

  private async generateCommitment(position: PrivatePosition): Promise<string> {
    // Use Poseidon hash to generate commitment
    const inputs = [
      position.userId,
      position.amount.toString(),
      position.outcome.toString(),
      position.nonce.toString(),
      position.marketId,
      Math.floor(position.timestamp.getTime() / 1000).toString()
    ];

    // This would use the actual Poseidon implementation from Midnight SDK
    return await this.sdk.poseidonHash(inputs);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main SDK class
export class BodegaMarketSDK {
  private config: BodegaSDKConfig;
  private provider: MidnightProvider;
  private sdk: MidnightSDK;
  private privateState: PrivateStateManager;
  private proofManager: ProofGenerationManager;

  constructor(config: BodegaSDKConfig) {
    this.config = config;
    this.provider = config.midnightProvider;
    this.sdk = new MidnightSDK(config.midnightProvider);
    this.privateState = new PrivateStateManager(
      config.encryptionKey,
      config.storagePrefix
    );
    this.proofManager = new ProofGenerationManager(this.sdk);
  }

  // Market Factory Operations
  async createMarket(params: {
    question: string;
    description: string;
    resolutionCriteria: string;
    endTime: Date;
    bondAmount: bigint;
  }): Promise<MarketId> {
    try {
      const result = await this.sdk.callContract(
        this.config.contractAddresses.marketFactory,
        'createMarket',
        {
          creator: await this.provider.getAddress(),
          question: params.question,
          description: params.description,
          resolutionCriteria: params.resolutionCriteria,
          endTime: Math.floor(params.endTime.getTime() / 1000),
          currentTime: Math.floor(Date.now() / 1000),
          bondAmount: params.bondAmount.toString()
        }
      );

      return result.marketId as MarketId;
    } catch (error) {
      throw new BodegaError('Failed to create market', 'CREATE_MARKET_ERROR', error);
    }
  }

  async getMarket(marketId: MarketId): Promise<MarketMetadata> {
    try {
      const result = await this.sdk.queryContract(
        this.config.contractAddresses.marketFactory,
        'getMarket',
        { marketId }
      );

      return {
        id: result.id,
        question: result.question,
        description: result.description,
        resolutionCriteria: result.resolutionCriteria,
        creator: result.creator,
        endTime: new Date(Number(result.endTime) * 1000),
        resolutionDeadline: new Date(Number(result.resolutionDeadline) * 1000),
        challengePeriodEnd: new Date(Number(result.challengePeriodEnd) * 1000),
        creatorBond: BigInt(result.creatorBond),
        minLiquidity: BigInt(result.minLiquidity),
        status: result.status as MarketStatus,
        createdAt: new Date(Number(result.createdAt) * 1000)
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new MarketNotFoundError(marketId);
      }
      throw new BodegaError('Failed to fetch market', 'FETCH_MARKET_ERROR', error);
    }
  }

  async getMarketState(marketId: MarketId): Promise<MarketState> {
    try {
      const result = await this.sdk.queryContract(
        this.config.contractAddresses.predictionMarket,
        'getMarketState',
        { marketId }
      );

      return {
        id: result.id,
        sharesYes: BigInt(result.sharesYes),
        sharesNo: BigInt(result.sharesNo),
        invariant: BigInt(result.invariant),
        liquidityParameter: BigInt(result.liquidityParameter),
        totalVolume: BigInt(result.totalVolume),
        activePositions: BigInt(result.activePositions),
        lastTradeTime: new Date(Number(result.lastTradeTime) * 1000),
        batchCounter: BigInt(result.batchCounter)
      };
    } catch (error) {
      throw new BodegaError('Failed to fetch market state', 'FETCH_STATE_ERROR', error);
    }
  }

  // Position Management
  async placeBet(params: {
    marketId: MarketId;
    amount: bigint;
    outcome: Outcome;
    userId?: UserId;
  }): Promise<PositionId> {
    try {
      // Validate market is active
      const market = await this.getMarket(params.marketId);
      if (market.status !== MarketStatus.ACTIVE) {
        throw new BodegaError('Market is not active', 'MARKET_NOT_ACTIVE');
      }

      if (new Date() >= market.endTime) {
        throw new BodegaError('Market has ended', 'MARKET_ENDED');
      }

      // Create private position
      const userId = params.userId || await this.generateUserId();
      const position: PrivatePosition = {
        userId,
        amount: params.amount,
        outcome: params.outcome,
        nonce: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
        marketId: params.marketId,
        timestamp: new Date()
      };

      // Generate commitment and proof
      const { commitment, proof } = await this.proofManager.generatePositionCommitmentProof(position);

      // Submit to contract
      const result = await this.sdk.callContract(
        this.config.contractAddresses.predictionMarket,
        'addPositionToBatch',
        {
          commitment,
          amount: params.amount.toString(),
          outcome: params.outcome,
          currentTime: Math.floor(Date.now() / 1000),
          proof
        }
      );

      const positionId = result.positionId as PositionId;

      // Store position privately
      await this.privateState.storePosition(positionId, position);

      return positionId;

    } catch (error) {
      if (error instanceof BodegaError) {
        throw error;
      }
      throw new BodegaError('Failed to place bet', 'PLACE_BET_ERROR', error);
    }
  }

  async claimWinnings(positionId: PositionId): Promise<bigint> {
    try {
      // Get private position data
      const position = await this.privateState.getPosition(positionId);
      if (!position) {
        throw new InvalidPositionError('Position not found in private storage');
      }

      // Get market resolution
      const consensus = await this.getConsensusResult(position.marketId);
      if (!consensus.consensusReached) {
        throw new BodegaError('Market not resolved', 'MARKET_NOT_RESOLVED');
      }

      // Check if position won
      if (position.outcome !== consensus.outcome) {
        throw new BodegaError('Position did not win', 'POSITION_LOST');
      }

      // Calculate payout ratio
      const marketState = await this.getMarketState(position.marketId);
      const winningShares = consensus.outcome === Outcome.YES ? 
        marketState.sharesYes : marketState.sharesNo;
      const losingShares = consensus.outcome === Outcome.YES ? 
        marketState.sharesNo : marketState.sharesYes;
      
      const payoutRatio = ((losingShares * 100n) / winningShares) + 100n;

      // Generate nullifier
      const secretKey = await this.generateSecretKey(position.userId);
      const nullifier = await this.sdk.poseidonHash([
        position.userId,
        position.nonce.toString(),
        secretKey
      ]);

      // Generate settlement proof
      const settlementProof = await this.proofManager.generateSettlementProof(
        position,
        consensus.outcome,
        payoutRatio,
        nullifier
      );

      // Submit claim
      const result = await this.sdk.callContract(
        this.config.contractAddresses.predictionMarket,
        'claimWinnings',
        {
          positionId,
          proof: settlementProof,
          nullifier
        }
      );

      return BigInt(result.winnings);

    } catch (error) {
      if (error instanceof BodegaError) {
        throw error;
      }
      throw new BodegaError('Failed to claim winnings', 'CLAIM_WINNINGS_ERROR', error);
    }
  }

  // Oracle Operations
  async getConsensusResult(marketId: MarketId): Promise<ConsensusResult> {
    try {
      const result = await this.sdk.queryContract(
        this.config.contractAddresses.oracleConsensus,
        'getConsensusResult',
        { marketId }
      );

      return {
        outcome: result.outcome as Outcome,
        confidence: BigInt(result.confidence),
        participatingOracles: BigInt(result.participatingOracles),
        consensusReached: result.consensusReached,
        disputeThreshold: BigInt(result.disputeThreshold)
      };
    } catch (error) {
      throw new BodegaError('Failed to fetch consensus result', 'FETCH_CONSENSUS_ERROR', error);
    }
  }

  // Utility functions
  async getCurrentPrices(marketId: MarketId): Promise<{ yes: number; no: number }> {
    try {
      const result = await this.sdk.queryContract(
        this.config.contractAddresses.predictionMarket,
        'getCurrentPrices',
        { marketId }
      );

      return {
        yes: Number(result[0]) / 100, // Convert from percentage
        no: Number(result[1]) / 100
      };
    } catch (error) {
      throw new BodegaError('Failed to fetch prices', 'FETCH_PRICES_ERROR', error);
    }
  }

  async getUserPositions(userId?: UserId): Promise<PrivatePosition[]> {
    if (userId) {
      return this.privateState.getAllPositions().filter(pos => pos.userId === userId);
    }
    return this.privateState.getAllPositions();
  }

  async getUserExposure(marketId?: MarketId): Promise<bigint> {
    if (marketId) {
      return this.privateState.calculateMarketExposure(marketId);
    }
    return this.privateState.calculateTotalExposure();
  }

  // Private helper methods
  private async generateUserId(): Promise<UserId> {
    const address = await this.provider.getAddress();
    const nonce = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    return await this.sdk.poseidonHash([address, nonce.toString()]) as UserId;
  }

  private async generateSecretKey(userId: UserId): Promise<string> {
    const address = await this.provider.getAddress();
    return await this.sdk.poseidonHash([userId, address, 'secret']);
  }

  // Event subscription
  async subscribeToMarketEvents(
    marketId: MarketId,
    callback: (event: any) => void
  ): Promise<() => void> {
    return this.provider.subscribeToEvents({
      address: this.config.contractAddresses.predictionMarket,
      filter: { marketId },
      callback
    });
  }

  async subscribeToUserEvents(
    userId: UserId,
    callback: (event: any) => void
  ): Promise<() => void> {
    return this.provider.subscribeToEvents({
      address: this.config.contractAddresses.predictionMarket,
      filter: { userId },
      callback
    });
  }
}

// Factory function for easy initialization
export async function createBodegaSDK(config: BodegaSDKConfig): Promise<BodegaMarketSDK> {
  const sdk = new BodegaMarketSDK(config);
  return sdk;
}

export { BodegaMarketSDK as default };