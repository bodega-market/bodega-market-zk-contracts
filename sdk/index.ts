// Bodega Market SDK Entry Point
// Main exports for the SDK

export {
  BodegaMarketSDK,
  createBodegaSDK,
  BodegaSDKConfig,
  BodegaError,
  ProofGenerationError,
  MarketNotFoundError,
  InvalidPositionError,
  PrivateStateManager,
  ProofGenerationManager
} from './BodegaMarketSDK';

// Re-export types
export {
  MarketId,
  PositionId,
  OracleId,
  UserId,
  Outcome,
  MarketStatus,
  MarketMetadata,
  MarketState,
  PrivatePosition,
  BatchedPositionUTXO,
  ConsensusResult
} from './BodegaMarketSDK';

// SDK version
export const SDK_VERSION = '1.0.0';

// Default configuration
export const DEFAULT_CONFIG = {
  enableLocalProofGeneration: true,
  proofTimeout: 300000, // 5 minutes
  maxProofRetries: 3,
  batchWindowSize: 30, // seconds
  maxBatchSize: 100,
};

// Export default
export { BodegaMarketSDK as default } from './BodegaMarketSDK';