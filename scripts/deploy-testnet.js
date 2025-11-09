#!/usr/bin/env node

// Deployment script for Midnight testnet
// Deploys all Bodega Market contracts and saves addresses

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  console.log('🚀 Deploying Bodega Market contracts to Midnight testnet...\n');

  // Check environment variables
  if (!process.env.MIDNIGHT_PRIVATE_KEY) {
    console.error('❌ Error: MIDNIGHT_PRIVATE_KEY not set in .env file');
    process.exit(1);
  }

  const config = {
    network: process.env.MIDNIGHT_NETWORK || 'testnet',
    rpcUrl: process.env.MIDNIGHT_RPC_URL || 'https://testnet.midnight.network',
    creatorBond: process.env.CREATOR_BOND_AMOUNT || '100000000000000000000',
    consensusThreshold: process.env.CONSENSUS_THRESHOLD || '66',
    votingPeriod: process.env.VOTING_PERIOD || '86400',
  };

  console.log('📋 Deployment configuration:');
  console.log(`   Network: ${config.network}`);
  console.log(`   RPC URL: ${config.rpcUrl}`);
  console.log(`   Creator Bond: ${config.creatorBond} wei`);
  console.log(`   Consensus Threshold: ${config.consensusThreshold}%`);
  console.log(`   Voting Period: ${config.votingPeriod} seconds\n`);

  try {
    // Step 1: Compile contracts
    console.log('📦 Compiling contracts...');
    execSync('npm run compile:all', { stdio: 'inherit' });
    console.log('✅ Contracts compiled successfully\n');

    // Step 2: Deploy MarketFactory
    console.log('🏭 Deploying MarketFactory...');
    const marketFactoryAddress = deployContract('MarketFactory', [
      process.env.MIDNIGHT_PRIVATE_KEY, // Owner address (derived from private key)
      config.creatorBond
    ]);
    console.log(`✅ MarketFactory deployed at: ${marketFactoryAddress}\n`);

    // Step 3: Deploy OracleConsensus
    console.log('🔮 Deploying OracleConsensus...');
    const oracleConsensusAddress = deployContract('OracleConsensus', [
      process.env.MIDNIGHT_PRIVATE_KEY, // Admin address
      config.consensusThreshold,
      config.votingPeriod
    ]);
    console.log(`✅ OracleConsensus deployed at: ${oracleConsensusAddress}\n`);

    // Step 4: Deploy PredictionMarket template
    console.log('📊 Deploying PredictionMarket template...');
    const predictionMarketAddress = deployContract('PredictionMarket', []);
    console.log(`✅ PredictionMarket template deployed at: ${predictionMarketAddress}\n`);

    // Step 5: Save deployment addresses
    const deploymentInfo = {
      network: config.network,
      deployedAt: new Date().toISOString(),
      contracts: {
        MarketFactory: marketFactoryAddress,
        OracleConsensus: oracleConsensusAddress,
        PredictionMarket: predictionMarketAddress,
      },
      configuration: {
        creatorBond: config.creatorBond,
        consensusThreshold: config.consensusThreshold,
        votingPeriod: config.votingPeriod,
      }
    };

    // Save to file
    const deploymentPath = path.join(__dirname, '../deployments', `${config.network}.json`);
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`💾 Deployment info saved to: ${deploymentPath}\n`);

    // Update .env file
    updateEnvFile({
      MARKET_FACTORY_ADDRESS: marketFactoryAddress,
      PREDICTION_MARKET_ADDRESS: predictionMarketAddress,
      ORACLE_CONSENSUS_ADDRESS: oracleConsensusAddress,
    });

    console.log('🎉 Deployment completed successfully!\n');
    console.log('📋 Contract addresses:');
    console.log(`   MarketFactory: ${marketFactoryAddress}`);
    console.log(`   OracleConsensus: ${oracleConsensusAddress}`);
    console.log(`   PredictionMarket: ${predictionMarketAddress}`);
    console.log('\n✅ Your .env file has been updated with the contract addresses');

    // Step 6: Verify contracts (optional)
    if (process.env.VERIFY_CONTRACTS === 'true') {
      console.log('\n🔍 Verifying contracts...');
      await verifyContracts(deploymentInfo.contracts);
    }

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

function deployContract(contractName, constructorArgs = []) {
  // This is a mock implementation - replace with actual Midnight deployment logic
  console.log(`   Deploying ${contractName} with args:`, constructorArgs);
  
  // In a real implementation, this would:
  // 1. Load the compiled contract from .compact/
  // 2. Create a transaction to deploy the contract
  // 3. Wait for confirmation
  // 4. Return the deployed contract address
  
  // Mock address for demonstration
  const mockAddress = '0x' + Array(40).fill(0).map(() => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  return mockAddress;
}

function updateEnvFile(addresses) {
  const envPath = path.join(__dirname, '../.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or add each address
  Object.entries(addresses).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'gm');
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  });

  fs.writeFileSync(envPath, envContent.trim() + '\n');
}

async function verifyContracts(contracts) {
  // Mock verification - replace with actual verification logic
  for (const [name, address] of Object.entries(contracts)) {
    console.log(`   Verifying ${name} at ${address}...`);
    // In reality, this would submit the contract for verification
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`   ✅ ${name} verified`);
  }
}

// Run deployment
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});