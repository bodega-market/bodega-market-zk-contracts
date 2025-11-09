// Test setup file
// Configures the test environment for all tests

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Polyfill crypto for Node.js environments that don't have it
if (typeof globalThis.crypto === 'undefined') {
  // @ts-ignore
  globalThis.crypto = {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      generateKey: async () => ({ type: 'secret' } as CryptoKey),
      encrypt: async (algorithm: any, key: any, data: any) => new ArrayBuffer(0),
      decrypt: async (algorithm: any, key: any, data: any) => new ArrayBuffer(0),
    }
  };
}

// Global test setup
beforeAll(async () => {
  console.log('🚀 Starting Bodega Market test suite...');
});

// Global test teardown
afterAll(async () => {
  console.log('✅ Bodega Market test suite completed');
});

// Per-test setup
beforeEach(async () => {
  // Clear any localStorage if it exists
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
});

// Per-test teardown
afterEach(async () => {
  // Clean up any test data
  if (typeof localStorage !== 'undefined') {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('bodega_') || key.startsWith('test_')) {
        localStorage.removeItem(key);
      }
    });
  }
});

// Mock performance.now for environments that don't have it
if (typeof performance === 'undefined') {
  (global as any).performance = {
    now: () => Date.now()
  };
}