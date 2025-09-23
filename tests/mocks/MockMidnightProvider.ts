// Mock Midnight Provider for Testing
// Simulates Midnight blockchain interactions for unit tests

export interface ContractCall {
  contract: string;
  method: string;
  params: any;
  result?: any;
  error?: string;
  timestamp: number;
}

export interface EventSubscription {
  address: string;
  filter: any;
  callback: (event: any) => void;
  id: string;
}

export class MockMidnightProvider {
  private contractCalls: ContractCall[] = [];
  private contractQueries: Map<string, any> = new Map();
  private contractCallMocks: Map<string, any> = new Map();
  private contractErrorMocks: Map<string, string> = new Map();
  private emittedEvents: any[] = [];
  private subscriptions: Map<string, EventSubscription> = new Map();
  private networkError = false;
  private address = '0xabcdef1234567890abcdef1234567890abcdef12';

  // Mock contract call responses
  mockContractCall(method: string, result: any): void {
    this.contractCallMocks.set(method, result);
  }

  mockContractQuery(method: string, result: any): void {
    this.contractQueries.set(method, result);
  }

  mockContractError(method: string, error: string): void {
    this.contractErrorMocks.set(method, error);
  }

  // Simulate network error
  simulateNetworkError(): void {
    this.networkError = true;
  }

  // Reset all mocks
  reset(): void {
    this.contractCalls = [];
    this.contractQueries.clear();
    this.contractCallMocks.clear();
    this.contractErrorMocks.clear();
    this.emittedEvents = [];
    this.subscriptions.clear();
    this.networkError = false;
  }

  // Mock implementation of MidnightProvider interface
  async getAddress(): Promise<string> {
    if (this.networkError) {
      throw new Error('Network error');
    }
    return this.address;
  }

  async getBalance(): Promise<bigint> {
    if (this.networkError) {
      throw new Error('Network error');
    }
    return BigInt('1000000000000000000000'); // 1000 NIGHT
  }

  async getBlockNumber(): Promise<number> {
    if (this.networkError) {
      throw new Error('Network error');
    }
    return 1234567;
  }

  async getBlockTimestamp(): Promise<number> {
    if (this.networkError) {
      throw new Error('Network error');
    }
    return Math.floor(Date.now() / 1000);
  }

  // Contract interaction mocks
  async callContract(
    address: string,
    method: string,
    params: any
  ): Promise<any> {
    if (this.networkError) {
      throw new Error('Network connection failed');
    }

    const call: ContractCall = {
      contract: address,
      method,
      params,
      timestamp: Date.now()
    };

    // Check for mocked error
    if (this.contractErrorMocks.has(method)) {
      const error = this.contractErrorMocks.get(method)!;
      call.error = error;
      this.contractCalls.push(call);
      throw new Error(error);
    }

    // Return mocked result
    if (this.contractCallMocks.has(method)) {
      const result = this.contractCallMocks.get(method);
      call.result = result;
      this.contractCalls.push(call);

      // Emit events if they're part of the result
      if (result.events) {
        this.emittedEvents.push(...result.events);
      }

      return result;
    }

    // Default successful response
    const defaultResult = { success: true };
    call.result = defaultResult;
    this.contractCalls.push(call);
    return defaultResult;
  }

  async queryContract(
    address: string,
    method: string,
    params: any
  ): Promise<any> {
    if (this.networkError) {
      throw new Error('Network connection failed');
    }

    // Check for mocked error
    if (this.contractErrorMocks.has(method)) {
      throw new Error(this.contractErrorMocks.get(method)!);
    }

    // Return mocked query result
    if (this.contractQueries.has(method)) {
      return this.contractQueries.get(method);
    }

    throw new Error(`No mock data for query method: ${method}`);
  }

  // Event subscription
  subscribeToEvents(options: {
    address: string;
    filter: any;
    callback: (event: any) => void;
  }): () => void {
    const id = `sub_${Date.now()}_${Math.random()}`;
    const subscription: EventSubscription = {
      address: options.address,
      filter: options.filter,
      callback: options.callback,
      id
    };

    this.subscriptions.set(id, subscription);

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(id);
    };
  }

  // Simulate event emission
  emitEvent(address: string, event: any): void {
    this.emittedEvents.push(event);

    // Notify relevant subscriptions
    for (const subscription of this.subscriptions.values()) {
      if (subscription.address === address) {
        // Simple filter matching (in real implementation would be more sophisticated)
        const matchesFilter = !subscription.filter || 
          Object.keys(subscription.filter).every(key => 
            event.data && event.data[key] === subscription.filter[key]
          );

        if (matchesFilter) {
          subscription.callback(event);
        }
      }
    }
  }

  // Transaction simulation
  async sendTransaction(transaction: {
    to: string;
    data: string;
    value?: bigint;
    gasLimit?: bigint;
  }): Promise<{ hash: string; wait: () => Promise<any> }> {
    if (this.networkError) {
      throw new Error('Network connection failed');
    }

    const txHash = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;

    return {
      hash: txHash,
      wait: async () => ({
        blockHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
        blockNumber: await this.getBlockNumber() + 1,
        gasUsed: BigInt('21000'),
        status: 1
      })
    };
  }

  // Gas estimation
  async estimateGas(transaction: {
    to: string;
    data: string;
    value?: bigint;
  }): Promise<bigint> {
    if (this.networkError) {
      throw new Error('Network connection failed');
    }
    return BigInt('100000'); // Mock gas estimate
  }

  // ZK Proof generation simulation
  async generateProof(
    circuit: string,
    privateInputs: any,
    publicInputs: any
  ): Promise<any> {
    if (this.networkError) {
      throw new Error('Network connection failed');
    }

    // Simulate proof generation time
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      proof: `mock_proof_${Math.random().toString(16).slice(2)}`,
      publicInputs,
      circuit
    };
  }

  // Poseidon hash simulation
  async poseidonHash(inputs: string[]): Promise<string> {
    if (this.networkError) {
      throw new Error('Network connection failed');
    }

    // Simple mock hash (not cryptographically secure)
    const combined = inputs.join('');
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
  }

  // Storage simulation
  private storage: Map<string, string> = new Map();

  async getStorage(address: string, key: string): Promise<string> {
    if (this.networkError) {
      throw new Error('Network connection failed');
    }
    return this.storage.get(`${address}:${key}`) || '0x0';
  }

  setStorage(address: string, key: string, value: string): void {
    this.storage.set(`${address}:${key}`, value);
  }

  // Test utilities
  getLastCall(): ContractCall | undefined {
    return this.contractCalls[this.contractCalls.length - 1];
  }

  getAllCalls(): ContractCall[] {
    return [...this.contractCalls];
  }

  getCallsForMethod(method: string): ContractCall[] {
    return this.contractCalls.filter(call => call.method === method);
  }

  getCallsForContract(address: string): ContractCall[] {
    return this.contractCalls.filter(call => call.contract === address);
  }

  getEmittedEvents(): any[] {
    return [...this.emittedEvents];
  }

  getEventsForAddress(address: string): any[] {
    return this.emittedEvents.filter(event => event.address === address);
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  // Utility for setting up common test scenarios
  setupSuccessfulMarketCreation(marketId: string): void {
    this.mockContractCall('createMarket', {
      marketId,
      success: true,
      events: [{
        type: 'MarketCreatedEvent',
        address: '0x1234567890123456789012345678901234567890',
        data: {
          marketId,
          creator: this.address,
          timestamp: Math.floor(Date.now() / 1000)
        }
      }]
    });
  }

  setupMarketData(marketId: string, overrides: any = {}): void {
    const defaultMarketData = {
      id: marketId,
      question: 'Test Market Question?',
      description: 'Test market description',
      resolutionCriteria: 'Test resolution criteria',
      creator: this.address,
      endTime: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
      resolutionDeadline: Math.floor((Date.now() + 31 * 24 * 60 * 60 * 1000) / 1000),
      challengePeriodEnd: Math.floor((Date.now() + 32 * 24 * 60 * 60 * 1000) / 1000),
      creatorBond: '100000000000000000000',
      minLiquidity: '1000000000000000000',
      status: 'ACTIVE',
      createdAt: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)
    };

    this.mockContractQuery('getMarket', { ...defaultMarketData, ...overrides });
  }

  setupMarketState(marketId: string, overrides: any = {}): void {
    const defaultStateData = {
      id: marketId,
      sharesYes: '50000000000000000000',
      sharesNo: '50000000000000000000',
      invariant: '2500000000000000000000000000000000000000',
      liquidityParameter: '25000000000000000000',
      totalVolume: '100000000000000000000',
      activePositions: '0',
      lastTradeTime: Math.floor(Date.now() / 1000),
      batchCounter: '0'
    };

    this.mockContractQuery('getMarketState', { ...defaultStateData, ...overrides });
  }

  setupOracleConsensus(marketId: string, outcome: number = 0, confidence: number = 100): void {
    this.mockContractQuery('getConsensusResult', {
      outcome,
      confidence: confidence.toString(),
      participatingOracles: '3',
      consensusReached: true,
      disputeThreshold: '1000000000000000000000' // 1000 DUST
    });
  }

  // Simulate time passage
  private currentTime = Math.floor(Date.now() / 1000);

  setCurrentTime(timestamp: number): void {
    this.currentTime = timestamp;
  }

  advanceTime(seconds: number): void {
    this.currentTime += seconds;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }
}