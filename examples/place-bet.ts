// Example: Place a bet on a prediction market
// This script demonstrates how to place a private bet

import { BodegaMarketSDK, createBodegaSDK, Outcome } from '../sdk/BodegaMarketSDK';
import { MockMidnightProvider } from '../tests/mocks/MockMidnightProvider';
import * as dotenv from 'dotenv';

dotenv.config();

async function placeBet(marketId?: string) {
  console.log('🎲 Placing a private bet on prediction market...\n');

  try {
    // For demonstration, we'll use the mock provider
    const provider = new MockMidnightProvider();
    
    // Use provided marketId or default test market
    const targetMarketId = marketId || 'test_market_eth_5000';

    // Setup market data
    provider.setupMarketData(targetMarketId, {
      id: targetMarketId,
      question: 'Will Ethereum reach $5,000 by end of 2024?',
      status: 'ACTIVE',
      endTime: Math.floor(new Date('2024-12-31').getTime() / 1000)
    });

    provider.setupMarketState(targetMarketId, {
      sharesYes: '45000000000000000000000', // 45,000 shares
      sharesNo: '55000000000000000000000',   // 55,000 shares
      totalVolume: '100000000000000000000000',
      activePositions: '150'
    });

    // Mock successful bet placement
    provider.mockContractCall('addPositionToBatch', {
      positionId: `position_${Date.now()}`,
      batchId: `batch_${Date.now()}`,
      success: true
    });

    // Create SDK instance
    const sdk = new BodegaMarketSDK({
      midnightProvider: provider as any,
      contractAddresses: {
        marketFactory: process.env.MARKET_FACTORY_ADDRESS || '0x1234567890123456789012345678901234567890',
        predictionMarket: process.env.PREDICTION_MARKET_ADDRESS || '0x2345678901234567890123456789012345678901',
        oracleConsensus: process.env.ORACLE_CONSENSUS_ADDRESS || '0x3456789012345678901234567890123456789012'
      },
      enableLocalProofGeneration: true
    });

    // Get current market state
    console.log('📊 Current market state:');
    const marketInfo = await sdk.getMarket(targetMarketId);
    const prices = await sdk.getCurrentPrices(targetMarketId);
    
    console.log(`   Market: ${marketInfo.question}`);
    console.log(`   Status: ${marketInfo.status}`);
    console.log(`   Current Prices - YES: ${(prices.yes * 100).toFixed(1)}%, NO: ${(prices.no * 100).toFixed(1)}%\n`);

    // Bet parameters
    const betAmount = BigInt('25000000000000000000'); // 25 NIGHT
    const outcome = Outcome.YES; // Betting on YES
    
    console.log('💰 Bet details:');
    console.log(`   Amount: ${betAmount.toString()} wei (25 NIGHT)`);
    console.log(`   Outcome: ${outcome === Outcome.YES ? 'YES' : 'NO'}`);
    console.log(`   Expected Price Impact: ~${calculatePriceImpact(prices.yes, 0.02).toFixed(1)}%\n`);

    // Place the bet
    console.log('🔐 Generating zero-knowledge proof for private position...');
    console.log('   ⏳ Creating position commitment...');
    console.log('   ⏳ Generating ZK proof...');
    
    const positionId = await sdk.placeBet({
      marketId: targetMarketId,
      amount: betAmount,
      outcome: outcome
    });

    console.log('✅ Bet placed successfully!');
    console.log(`   Position ID: ${positionId}`);
    console.log('   🔒 Your position is completely private');
    console.log('   📝 Position data stored locally with encryption\n');

    // Show updated prices (simulated)
    const newPrices = {
      yes: prices.yes + 0.02, // Simulated price impact
      no: prices.no - 0.02
    };
    
    console.log('📈 Updated market prices:');
    console.log(`   YES: ${(prices.yes * 100).toFixed(1)}% → ${(newPrices.yes * 100).toFixed(1)}%`);
    console.log(`   NO: ${(prices.no * 100).toFixed(1)}% → ${(newPrices.no * 100).toFixed(1)}%`);

    // Calculate potential winnings
    const potentialWinnings = calculateWinnings(betAmount, newPrices.yes);
    console.log('\n💸 Potential outcomes:');
    console.log(`   If YES wins: ${potentialWinnings.toString()} wei (${formatNight(potentialWinnings)} NIGHT)`);
    console.log(`   If NO wins: 0 NIGHT (lose bet)`);
    console.log(`   ROI if correct: ${((Number(potentialWinnings) / Number(betAmount) - 1) * 100).toFixed(1)}%`);

    // Show user's positions
    const userPositions = await sdk.getUserPositions();
    console.log(`\n📊 Your positions: ${userPositions.length} total`);
    console.log(`   Market exposure: ${formatNight(await sdk.getUserExposure())} NIGHT`);

    return positionId;

  } catch (error) {
    console.error('❌ Error placing bet:', error);
    throw error;
  }
}

// Helper functions
function calculatePriceImpact(currentPrice: number, impact: number): number {
  return impact * 100;
}

function calculateWinnings(betAmount: bigint, winProbability: number): bigint {
  // Simplified calculation: winnings = bet / probability
  const winnings = (betAmount * BigInt(100)) / BigInt(Math.floor(winProbability * 100));
  return winnings;
}

function formatNight(wei: bigint): string {
  // Convert wei to NIGHT (18 decimals)
  const night = Number(wei) / 1e18;
  return night.toFixed(2);
}

// Run the example
if (require.main === module) {
  const marketId = process.argv[2]; // Optional market ID from command line
  
  placeBet(marketId)
    .then(() => {
      console.log('\n✅ Example completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Example failed:', error);
      process.exit(1);
    });
}

export { placeBet };