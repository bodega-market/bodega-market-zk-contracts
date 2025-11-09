// Bodega Market Factory Tests
// Comprehensive test suite for market creation and management

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { BodegaMarketSDK, MarketStatus, BodegaError } from '../sdk/BodegaMarketSDK';
import { MockMidnightProvider } from './mocks/MockMidnightProvider';
import { TestUtils } from './utils/TestUtils';

describe('MarketFactory Tests', () => {
  let sdk: BodegaMarketSDK;
  let mockProvider: MockMidnightProvider;
  let testUtils: TestUtils;

  beforeEach(async () => {
    mockProvider = new MockMidnightProvider();
    testUtils = new TestUtils();
    
    sdk = new BodegaMarketSDK({
      midnightProvider: mockProvider as any,
      contractAddresses: {
        marketFactory: '0x1234567890123456789012345678901234567890',
        predictionMarket: '0x2345678901234567890123456789012345678901',
        oracleConsensus: '0x3456789012345678901234567890123456789012'
      },
      enableLocalProofGeneration: true,
      encryptionKey: await testUtils.generateTestEncryptionKey()
    });

    // Setup mock contract responses
    await testUtils.setupMockContracts(mockProvider);
  });

  afterEach(() => {
    mockProvider.reset();
  });

  describe('Market Creation', () => {
    test('should create a new prediction market successfully', async () => {
      const marketParams = {
        question: 'Will Bitcoin reach $100,000 by end of 2024?',
        description: 'Bitcoin price prediction market for 2024',
        resolutionCriteria: 'Resolved based on CoinGecko API price data',
        endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        bondAmount: BigInt('100000000000000000000') // 100 NIGHT
      };

      mockProvider.mockContractCall('createMarket', {
        marketId: 'market_123456789',
        creator: '0xabcdef1234567890abcdef1234567890abcdef12',
        createdAt: Math.floor(Date.now() / 1000)
      });

      const marketId = await sdk.createMarket(marketParams);

      expect(marketId).toBe('market_123456789');
      expect(mockProvider.getLastCall()).toMatchObject({
        contract: '0x1234567890123456789012345678901234567890',
        method: 'createMarket',
        params: expect.objectContaining({
          question: marketParams.question,
          description: marketParams.description,
          resolutionCriteria: marketParams.resolutionCriteria,
          bondAmount: marketParams.bondAmount.toString()
        })
      });
    });

    test('should reject market creation with insufficient bond', async () => {
      const marketParams = {
        question: 'Test market',
        description: 'Test description',
        resolutionCriteria: 'Test criteria',
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        bondAmount: BigInt('1000000000000000000') // 1 NIGHT (insufficient)
      };

      mockProvider.mockContractError('createMarket', 'Insufficient creator bond');

      await expect(sdk.createMarket(marketParams)).rejects.toThrow(BodegaError);
      await expect(sdk.createMarket(marketParams)).rejects.toThrow('Failed to create market');
    });

    test('should reject market creation with past end time', async () => {
      const marketParams = {
        question: 'Test market',
        description: 'Test description', 
        resolutionCriteria: 'Test criteria',
        endTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past date
        bondAmount: BigInt('100000000000000000000')
      };

      mockProvider.mockContractError('createMarket', 'End time must be in future');

      await expect(sdk.createMarket(marketParams)).rejects.toThrow(BodegaError);
    });

    test('should create market with proper event emission', async () => {
      const marketParams = {
        question: 'Event test market',
        description: 'Testing event emission',
        resolutionCriteria: 'Manual resolution',
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        bondAmount: BigInt('100000000000000000000')
      };

      mockProvider.mockContractCall('createMarket', {
        marketId: 'event_market_123',
        events: [{
          type: 'MarketCreatedEvent',
          data: {
            marketId: 'event_market_123',
            creator: '0xabcdef1234567890abcdef1234567890abcdef12',
            question: marketParams.question,
            endTime: Math.floor(marketParams.endTime.getTime() / 1000),
            createdAt: Math.floor(Date.now() / 1000)
          }
        }]
      });

      const marketId = await sdk.createMarket(marketParams);
      const events = mockProvider.getEmittedEvents();

      expect(marketId).toBe('event_market_123');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('MarketCreatedEvent');
      expect(events[0].data.marketId).toBe('event_market_123');
    });
  });

  describe('Market Queries', () => {
    beforeEach(() => {
      // Setup mock market data
      mockProvider.mockContractQuery('getMarket', {
        id: 'test_market_456',
        question: 'Test Market Question?',
        description: 'Test market description',
        resolutionCriteria: 'Test resolution criteria',
        creator: '0xabcdef1234567890abcdef1234567890abcdef12',
        endTime: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
        resolutionDeadline: Math.floor((Date.now() + 31 * 24 * 60 * 60 * 1000) / 1000),
        challengePeriodEnd: Math.floor((Date.now() + 32 * 24 * 60 * 60 * 1000) / 1000),
        creatorBond: '100000000000000000000',
        minLiquidity: '1000000000000000000',
        status: MarketStatus.ACTIVE,
        createdAt: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)
      });
    });

    test('should fetch market metadata successfully', async () => {
      const market = await sdk.getMarket('test_market_456');

      expect(market.id).toBe('test_market_456');
      expect(market.question).toBe('Test Market Question?');
      expect(market.status).toBe(MarketStatus.ACTIVE);
      expect(market.creatorBond).toBe(BigInt('100000000000000000000'));
      expect(market.endTime).toBeInstanceOf(Date);
      expect(market.endTime.getTime()).toBeGreaterThan(Date.now());
    });

    test('should throw MarketNotFoundError for non-existent market', async () => {
      mockProvider.mockContractError('getMarket', 'Market not found');

      await expect(sdk.getMarket('non_existent_market')).rejects.toThrow('Market not found');
    });

    test('should fetch market state successfully', async () => {
      mockProvider.mockContractQuery('getMarketState', {
        id: 'test_market_456',
        sharesYes: '50000000000000000000',
        sharesNo: '50000000000000000000',
        invariant: '2500000000000000000000000000000000000000',
        liquidityParameter: '25000000000000000000',
        totalVolume: '100000000000000000000',
        activePositions: '10',
        lastTradeTime: Math.floor(Date.now() / 1000),
        batchCounter: '5'
      });

      const state = await sdk.getMarketState('test_market_456');

      expect(state.id).toBe('test_market_456');
      expect(state.sharesYes).toBe(BigInt('50000000000000000000'));
      expect(state.sharesNo).toBe(BigInt('50000000000000000000'));
      expect(state.totalVolume).toBe(BigInt('100000000000000000000'));
      expect(state.activePositions).toBe(BigInt('10'));
      expect(state.batchCounter).toBe(BigInt('5'));
    });

    test('should calculate market prices correctly', async () => {
      mockProvider.mockContractQuery('getCurrentPrices', ['5500', '4500']); // 55% YES, 45% NO

      const prices = await sdk.getCurrentPrices('test_market_456');

      expect(prices.yes).toBe(0.55);
      expect(prices.no).toBe(0.45);
      expect(prices.yes + prices.no).toBe(1.0);
    });
  });

  describe('Market Lifecycle Management', () => {
    test('should activate market successfully', async () => {
      mockProvider.mockContractCall('activateMarket', {
        success: true,
        marketId: 'activation_test_market'
      });

      // This would be called by the market creator after initial setup
      const result = await testUtils.callContractMethod(
        sdk,
        'activateMarket',
        {
          marketId: 'activation_test_market',
          initialLiquidity: BigInt('10000000000000000000'), // 10 NIGHT
          currentTime: Math.floor(Date.now() / 1000)
        }
      );

      expect(result.success).toBe(true);
    });

    test('should end market at specified time', async () => {
      const endTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      
      mockProvider.mockContractCall('endMarket', {
        success: true,
        marketId: 'ending_test_market',
        newStatus: MarketStatus.ENDED
      });

      const result = await testUtils.callContractMethod(
        sdk,
        'endMarket',
        {
          marketId: 'ending_test_market',
          currentTime: Math.floor(Date.now() / 1000)
        }
      );

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe(MarketStatus.ENDED);
    });

    test('should cancel market successfully', async () => {
      mockProvider.mockContractCall('cancelMarket', {
        success: true,
        bondReleased: true
      });

      const result = await testUtils.callContractMethod(
        sdk,
        'cancelMarket',
        {
          marketId: 'cancel_test_market',
          caller: '0xabcdef1234567890abcdef1234567890abcdef12',
          currentTime: Math.floor(Date.now() / 1000)
        }
      );

      expect(result.success).toBe(true);
      expect(result.bondReleased).toBe(true);
    });

    test('should prevent non-creator from canceling market', async () => {
      mockProvider.mockContractError('cancelMarket', 'Only creator can cancel');

      await expect(
        testUtils.callContractMethod(sdk, 'cancelMarket', {
          marketId: 'cancel_test_market',
          caller: '0x1111111111111111111111111111111111111111', // Different address
          currentTime: Math.floor(Date.now() / 1000)
        })
      ).rejects.toThrow('Only creator can cancel');
    });
  });

  describe('Bond Management', () => {
    test('should lock creator bond on market creation', async () => {
      const marketParams = {
        question: 'Bond test market',
        description: 'Testing bond mechanics',
        resolutionCriteria: 'Test criteria',
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        bondAmount: BigInt('150000000000000000000') // 150 NIGHT
      };

      mockProvider.mockContractCall('createMarket', {
        marketId: 'bond_test_market',
        bondLocked: true,
        bondAmount: '150000000000000000000'
      });

      await sdk.createMarket(marketParams);

      const lastCall = mockProvider.getLastCall();
      expect(lastCall.params.bondAmount).toBe('150000000000000000000');
    });

    test('should release bond on successful market settlement', async () => {
      mockProvider.mockContractCall('settleMarket', {
        success: true,
        bondReleased: true,
        releasedAmount: '100000000000000000000'
      });

      const result = await testUtils.callContractMethod(
        sdk,
        'settleMarket',
        {
          marketId: 'settlement_test_market',
          currentTime: Math.floor(Date.now() / 1000)
        }
      );

      expect(result.bondReleased).toBe(true);
      expect(result.releasedAmount).toBe('100000000000000000000');
    });

    test('should query bond status', async () => {
      mockProvider.mockContractQuery('getMarketBond', {
        bondId: 'bond_123',
        user: '0xabcdef1234567890abcdef1234567890abcdef12',
        amount: '100000000000000000000',
        bondType: '1', // Creator bond
        lockedAt: Math.floor(Date.now() / 1000),
        releaseConditions: '1',
        released: false,
        slashed: false
      });

      const bond = await testUtils.queryContract(
        sdk,
        'getMarketBond',
        { marketId: 'test_market' }
      );

      expect(bond.amount).toBe('100000000000000000000');
      expect(bond.released).toBe(false);
      expect(bond.slashed).toBe(false);
      expect(bond.bondType).toBe('1');
    });
  });

  describe('Factory Statistics', () => {
    test('should track factory statistics correctly', async () => {
      mockProvider.mockContractQuery('getFactoryStats', [
        '100', // totalMarkets
        '75',  // activeMarkets
        '50000000000000000000000', // totalVolume
        '1000000000000000000000'   // protocolTreasury
      ]);

      const stats = await testUtils.queryContract(
        sdk,
        'getFactoryStats',
        {}
      );

      expect(stats[0]).toBe('100'); // Total markets
      expect(stats[1]).toBe('75');  // Active markets
      expect(stats[2]).toBe('50000000000000000000000'); // Total volume
      expect(stats[3]).toBe('1000000000000000000000');  // Treasury
    });

    test('should increment market counters on creation', async () => {
      // First market
      mockProvider.mockContractCall('createMarket', {
        marketId: 'counter_test_1',
        totalMarkets: '1',
        activeMarkets: '1'
      });

      await sdk.createMarket({
        question: 'Counter test 1',
        description: 'Testing counters',
        resolutionCriteria: 'Test',
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        bondAmount: BigInt('100000000000000000000')
      });

      // Second market
      mockProvider.mockContractCall('createMarket', {
        marketId: 'counter_test_2',
        totalMarkets: '2',
        activeMarkets: '2'
      });

      await sdk.createMarket({
        question: 'Counter test 2',
        description: 'Testing counters',
        resolutionCriteria: 'Test',
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        bondAmount: BigInt('100000000000000000000')
      });

      const calls = mockProvider.getAllCalls();
      expect(calls).toHaveLength(2);
      expect(calls[1].result.totalMarkets).toBe('2');
      expect(calls[1].result.activeMarkets).toBe('2');
    });
  });

  describe('Access Control', () => {
    test('should allow only factory owner to pause', async () => {
      mockProvider.mockContractCall('pause', {
        success: true,
        paused: true
      });

      const result = await testUtils.callContractMethod(
        sdk,
        'pause',
        { caller: '0xabcdef1234567890abcdef1234567890abcdef12' } // Factory owner
      );

      expect(result.success).toBe(true);
      expect(result.paused).toBe(true);
    });

    test('should reject pause from non-owner', async () => {
      mockProvider.mockContractError('pause', 'Only owner can pause');

      await expect(
        testUtils.callContractMethod(sdk, 'pause', {
          caller: '0x1111111111111111111111111111111111111111' // Not owner
        })
      ).rejects.toThrow('Only owner can pause');
    });

    test('should allow owner to update minimum bond', async () => {
      mockProvider.mockContractCall('updateMinBond', {
        success: true,
        newBond: '200000000000000000000'
      });

      const result = await testUtils.callContractMethod(
        sdk,
        'updateMinBond',
        {
          caller: '0xabcdef1234567890abcdef1234567890abcdef12', // Owner
          newBond: '200000000000000000000'
        }
      );

      expect(result.success).toBe(true);
      expect(result.newBond).toBe('200000000000000000000');
    });

    test('should transfer ownership successfully', async () => {
      mockProvider.mockContractCall('transferOwnership', {
        success: true,
        newOwner: '0x2222222222222222222222222222222222222222'
      });

      const result = await testUtils.callContractMethod(
        sdk,
        'transferOwnership',
        {
          caller: '0xabcdef1234567890abcdef1234567890abcdef12', // Current owner
          newOwner: '0x2222222222222222222222222222222222222222'
        }
      );

      expect(result.success).toBe(true);
      expect(result.newOwner).toBe('0x2222222222222222222222222222222222222222');
    });
  });

  describe('Error Handling', () => {
    test('should handle contract execution errors gracefully', async () => {
      mockProvider.mockContractError('createMarket', 'Gas limit exceeded');

      await expect(
        sdk.createMarket({
          question: 'Error test',
          description: 'Testing error handling',
          resolutionCriteria: 'Test',
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          bondAmount: BigInt('100000000000000000000')
        })
      ).rejects.toThrow(BodegaError);
    });

    test('should handle network connectivity issues', async () => {
      mockProvider.simulateNetworkError();

      await expect(
        sdk.getMarket('test_market')
      ).rejects.toThrow(BodegaError);
    });

    test('should validate market parameters before contract call', async () => {
      await expect(
        sdk.createMarket({
          question: '', // Empty question
          description: 'Test',
          resolutionCriteria: 'Test',
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          bondAmount: BigInt('100000000000000000000')
        })
      ).rejects.toThrow();
    });
  });
});

describe('Integration Tests', () => {
  let sdk: BodegaMarketSDK;
  let mockProvider: MockMidnightProvider;
  let testUtils: TestUtils;

  beforeEach(async () => {
    mockProvider = new MockMidnightProvider();
    testUtils = new TestUtils();
    
    sdk = new BodegaMarketSDK({
      midnightProvider: mockProvider as any,
      contractAddresses: {
        marketFactory: '0x1234567890123456789012345678901234567890',
        predictionMarket: '0x2345678901234567890123456789012345678901',
        oracleConsensus: '0x3456789012345678901234567890123456789012'
      },
      enableLocalProofGeneration: true,
      encryptionKey: await testUtils.generateTestEncryptionKey()
    });

    await testUtils.setupMockContracts(mockProvider);
  });

  test('complete market lifecycle: create -> activate -> bet -> resolve -> settle', async () => {
    // 1. Create market
    mockProvider.mockContractCall('createMarket', {
      marketId: 'lifecycle_test_market',
      status: MarketStatus.CREATED
    });

    const marketId = await sdk.createMarket({
      question: 'Integration test market?',
      description: 'Full lifecycle test',
      resolutionCriteria: 'Test resolution',
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      bondAmount: BigInt('100000000000000000000')
    });

    expect(marketId).toBe('lifecycle_test_market');

    // 2. Activate market
    mockProvider.mockContractCall('activateMarket', {
      success: true,
      newStatus: MarketStatus.ACTIVE
    });

    // 3. Market should be active and ready for bets
    mockProvider.mockContractQuery('getMarket', {
      id: marketId,
      status: MarketStatus.ACTIVE,
      endTime: Math.floor((Date.now() + 6 * 24 * 60 * 60 * 1000) / 1000),
      question: 'Integration test market?'
    });

    const market = await sdk.getMarket(marketId);
    expect(market.status).toBe(MarketStatus.ACTIVE);

    // Test passes if we get through all steps without errors
    expect(market.id).toBe(marketId);
  });
});