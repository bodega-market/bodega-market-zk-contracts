// Example: Create a prediction market
// This script demonstrates how to create a new prediction market

import { BodegaMarketSDK, createBodegaSDK } from '../sdk/BodegaMarketSDK';
import { MockMidnightProvider } from '../tests/mocks/MockMidnightProvider';
import * as dotenv from 'dotenv';

dotenv.config();

async function createPredictionMarket() {
  console.log('🚀 Creating a new prediction market...\n');

  try {
    // For demonstration, we'll use the mock provider
    // In production, use the real MidnightProvider
    const provider = new MockMidnightProvider();
    
    // Setup mock responses
    provider.mockContractCall('createMarket', {
      marketId: `market_${Date.now()}`,
      success: true,
      events: [{
        type: 'MarketCreatedEvent',
        data: {
          marketId: `market_${Date.now()}`,
          creator: await provider.getAddress(),
          timestamp: Math.floor(Date.now() / 1000)
        }
      }]
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

    // Market parameters
    const marketParams = {
      question: 'Will Ethereum reach $5,000 by end of 2024?',
      description: 'This market will resolve YES if the price of Ethereum (ETH) reaches or exceeds $5,000 USD on any major exchange before December 31, 2024.',
      resolutionCriteria: 'Resolution will be based on the daily high price of ETH/USD on CoinGecko, CoinMarketCap, or Binance. The market will resolve YES if any of these sources shows a price >= $5,000 at any point before the end date.',
      endTime: new Date('2024-12-31T23:59:59Z'),
      bondAmount: BigInt('100000000000000000000') // 100 NIGHT
    };

    console.log('📋 Market parameters:');
    console.log(`   Question: ${marketParams.question}`);
    console.log(`   End Time: ${marketParams.endTime.toISOString()}`);
    console.log(`   Bond Amount: ${marketParams.bondAmount.toString()} wei (100 NIGHT)\n`);

    // Create the market
    console.log('⏳ Creating market on chain...');
    const marketId = await sdk.createMarket(marketParams);

    console.log('✅ Market created successfully!');
    console.log(`   Market ID: ${marketId}\n`);

    // Get market details
    provider.setupMarketData(marketId, {
      ...marketParams,
      id: marketId,
      creator: await provider.getAddress(),
      status: 'CREATED',
      createdAt: Math.floor(Date.now() / 1000)
    });

    const marketInfo = await sdk.getMarket(marketId);
    console.log('📊 Market information:');
    console.log(`   Status: ${marketInfo.status}`);
    console.log(`   Creator: ${marketInfo.creator}`);
    console.log(`   Created At: ${marketInfo.createdAt.toISOString()}`);
    console.log(`   Resolution Deadline: ${marketInfo.resolutionDeadline.toISOString()}`);
    console.log(`   Challenge Period End: ${marketInfo.challengePeriodEnd.toISOString()}`);

    // Next steps
    console.log('\n🎯 Next steps:');
    console.log('   1. Activate the market by adding initial liquidity');
    console.log('   2. Users can start placing bets');
    console.log('   3. After end time, submit oracle resolution');
    console.log('   4. Users can claim winnings after settlement');

    return marketId;

  } catch (error) {
    console.error('❌ Error creating market:', error);
    throw error;
  }
}

// Run the example
if (require.main === module) {
  createPredictionMarket()
    .then(() => {
      console.log('\n✅ Example completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Example failed:', error);
      process.exit(1);
    });
}

export { createPredictionMarket };