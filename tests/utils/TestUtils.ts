// Test Utilities
// Helper functions and utilities for testing Bodega Market contracts

import { BodegaMarketSDK } from '../../sdk/BodegaMarketSDK';
import { MockMidnightProvider } from '../mocks/MockMidnightProvider';

export class TestUtils {
  
  // Encryption key generation for testing
  async generateTestEncryptionKey(): Promise<CryptoKey> {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      // Fallback for test environments without Web Crypto API
      return {} as CryptoKey;
    }

    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  // Setup mock contracts with common responses
  async setupMockContracts(mockProvider: MockMidnightProvider): Promise<void> {
    // Default successful responses for common operations
    mockProvider.mockContractCall('createMarket', {
      marketId: 'test_market_123',
      success: true
    });

    mockProvider.mockContractCall('activateMarket', {
      success: true
    });

    mockProvider.mockContractCall('addPositionToBatch', {
      positionId: 'position_123',
      batchId: 'batch_456',
      success: true
    });

    mockProvider.mockContractCall('processBatch', {
      batchId: 'batch_456',
      processedCount: '10',
      success: true
    });

    // Default market data
    mockProvider.setupMarketData('test_market_123');
    mockProvider.setupMarketState('test_market_123');
  }

  // Generate test market parameters
  generateMarketParams(overrides: any = {}): any {
    const defaultParams = {
      question: 'Will the test pass?',
      description: 'A test market for unit tests',
      resolutionCriteria: 'Resolved based on test results',
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      bondAmount: BigInt('100000000000000000000') // 100 NIGHT
    };

    return { ...defaultParams, ...overrides };
  }

  // Generate test position data
  generatePositionData(overrides: any = {}): any {
    const defaultPosition = {
      userId: 'test_user_123',
      amount: BigInt('10000000000000000000'), // 10 NIGHT
      outcome: 0, // YES
      nonce: BigInt(Math.floor(Math.random() * 1000000)),
      marketId: 'test_market_123',
      timestamp: new Date()
    };

    return { ...defaultPosition, ...overrides };
  }

  // Time manipulation helpers
  addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setTime(result.getTime() + (hours * 60 * 60 * 1000));
    return result;
  }

  subtractDays(date: Date, days: number): Date {
    return this.addDays(date, -days);
  }

  // Contract interaction helpers
  async callContractMethod(
    sdk: BodegaMarketSDK,
    method: string,
    params: any
  ): Promise<any> {
    // This is a helper to simulate direct contract calls
    // In practice, you'd use the SDK methods, but this is useful for testing edge cases
    const mockProvider = (sdk as any).provider as MockMidnightProvider;
    
    return await mockProvider.callContract(
      '0x1234567890123456789012345678901234567890',
      method,
      params
    );
  }

  async queryContract(
    sdk: BodegaMarketSDK,
    method: string,
    params: any
  ): Promise<any> {
    const mockProvider = (sdk as any).provider as MockMidnightProvider;
    
    return await mockProvider.queryContract(
      '0x1234567890123456789012345678901234567890',
      method,
      params
    );
  }

  // Assertion helpers
  expectBigIntEquals(actual: bigint, expected: bigint, message?: string): void {
    if (actual !== expected) {
      throw new Error(
        message || `Expected ${expected.toString()}, got ${actual.toString()}`
      );
    }
  }

  expectDateApproximately(actual: Date, expected: Date, toleranceMs = 1000): void {
    const diff = Math.abs(actual.getTime() - expected.getTime());
    if (diff > toleranceMs) {
      throw new Error(
        `Dates differ by ${diff}ms, expected within ${toleranceMs}ms. ` +
        `Actual: ${actual.toISOString()}, Expected: ${expected.toISOString()}`
      );
    }
  }

  // Mock data generators
  generateMockMarketId(): string {
    return `market_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateMockPositionId(): string {
    return `position_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateMockBatchId(): string {
    return `batch_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateMockUserId(): string {
    return `user_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateMockAddress(): string {
    const hex = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
      address += hex[Math.floor(Math.random() * 16)];
    }
    return address;
  }

  // Validation helpers
  isValidMarketId(marketId: string): boolean {
    return typeof marketId === 'string' && marketId.length > 0;
  }

  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  isValidAmount(amount: bigint): boolean {
    return amount > 0n;
  }

  isValidTimestamp(timestamp: Date): boolean {
    return timestamp instanceof Date && !isNaN(timestamp.getTime());
  }

  // Market state helpers
  calculateExpectedPrice(sharesYes: bigint, sharesNo: bigint): { yes: number; no: number } {
    const total = sharesYes + sharesNo;
    if (total === 0n) {
      return { yes: 0.5, no: 0.5 };
    }
    
    const yes = Number(sharesYes) / Number(total);
    const no = Number(sharesNo) / Number(total);
    
    return { yes, no };
  }

  calculatePayoutRatio(winningShares: bigint, losingShares: bigint): bigint {
    if (winningShares === 0n) {
      return 100n; // 100% (just return principal)
    }
    
    return ((losingShares * 100n) / winningShares) + 100n;
  }

  calculateWinnings(betAmount: bigint, payoutRatio: bigint): bigint {
    return (betAmount * payoutRatio) / 100n;
  }

  // Batch testing helpers
  createMockBatch(positionCount: number, marketId: string = 'test_market'): any {
    const positions = [];
    let totalValue = 0n;

    for (let i = 0; i < positionCount; i++) {
      const amount = BigInt(Math.floor(Math.random() * 100) + 1) * BigInt('1000000000000000000'); // 1-100 NIGHT
      totalValue += amount;
      
      positions.push({
        commitment: `0x${Math.random().toString(16).substr(2, 64)}`,
        amount: amount.toString(),
        outcome: Math.floor(Math.random() * 2), // 0 or 1
        timestamp: Math.floor(Date.now() / 1000),
        batchId: 'test_batch_123',
        leafIndex: i
      });
    }

    return {
      batchId: 'test_batch_123',
      merkleRoot: `0x${Math.random().toString(16).substr(2, 64)}`,
      totalValue: totalValue.toString(),
      positionCount: positionCount.toString(),
      batchTimestamp: Math.floor(Date.now() / 1000),
      marketId,
      processed: true,
      positions
    };
  }

  // Event testing helpers
  waitForEvent(
    mockProvider: MockMidnightProvider,
    eventType: string,
    timeout = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkForEvent = () => {
        const events = mockProvider.getEmittedEvents();
        const matchingEvent = events.find(event => event.type === eventType);
        
        if (matchingEvent) {
          resolve(matchingEvent);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Event ${eventType} not emitted within ${timeout}ms`));
        } else {
          setTimeout(checkForEvent, 100);
        }
      };
      
      checkForEvent();
    });
  }

  // Performance testing helpers
  async measureExecutionTime<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    
    return {
      result,
      executionTime: endTime - startTime
    };
  }

  // Error simulation helpers
  simulateRandomError(probability = 0.1): void {
    if (Math.random() < probability) {
      throw new Error('Simulated random error for testing');
    }
  }

  async simulateNetworkDelay(minMs = 100, maxMs = 500): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Cleanup helpers
  cleanupTestData(): void {
    // Clean up any persistent test data
    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('bodega_test_') || key.startsWith('test_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  // Snapshot testing helpers
  createSnapshot(data: any): string {
    // Simple JSON snapshot for testing
    // In a real implementation, you might use a more sophisticated snapshot library
    return JSON.stringify(data, null, 2);
  }

  compareSnapshots(snapshot1: string, snapshot2: string): boolean {
    return snapshot1 === snapshot2;
  }

  // Load testing helpers
  async runLoadTest(
    operation: () => Promise<any>,
    iterations = 100,
    concurrency = 10
  ): Promise<{ 
    totalTime: number; 
    averageTime: number; 
    successCount: number; 
    errorCount: number;
    errors: Error[];
  }> {
    const startTime = performance.now();
    const results: Array<{ success: boolean; error?: Error; time: number }> = [];
    
    const executeOperation = async () => {
      const opStartTime = performance.now();
      try {
        await operation();
        const opEndTime = performance.now();
        return { success: true, time: opEndTime - opStartTime };
      } catch (error) {
        const opEndTime = performance.now();
        return { success: false, error: error as Error, time: opEndTime - opStartTime };
      }
    };

    // Execute operations with controlled concurrency
    for (let i = 0; i < iterations; i += concurrency) {
      const batch = [];
      const batchSize = Math.min(concurrency, iterations - i);
      
      for (let j = 0; j < batchSize; j++) {
        batch.push(executeOperation());
      }
      
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    const errors = results.filter(r => !r.success).map(r => r.error!);
    const averageTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;

    return {
      totalTime,
      averageTime,
      successCount,
      errorCount,
      errors
    };
  }
}