#!/bin/bash

# Bodega Market - Quick Start Script
# This script sets up and runs the Bodega Market system

set -e

echo "🚀 Bodega Market - Quick Start"
echo "============================="
echo ""

# Check Node.js version
echo "📋 Checking prerequisites..."
node_version=$(node -v)
echo "   Node.js version: $node_version"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
else
    echo "   Dependencies already installed ✓"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "🔧 Creating .env file..."
    cp .env.example .env
    echo "   ⚠️  Please edit .env file and add your MIDNIGHT_PRIVATE_KEY"
fi

# Build TypeScript
echo ""
echo "🔨 Building TypeScript SDK..."
npm run build

# Compile contracts (mock for now)
echo ""
echo "📝 Compiling Compact contracts..."
npm run compile:all

# Run tests
echo ""
echo "🧪 Running tests..."
npm test

# Success!
echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo ""
echo "1. Deploy contracts to testnet:"
echo "   npm run deploy:testnet"
echo ""
echo "2. Run example - Create market:"
echo "   npm run example:create"
echo ""
echo "3. Run example - Place bet:"
echo "   npm run example:bet"
echo ""
echo "4. Start CLI interactive mode:"
echo "   npm run cli interactive"
echo ""
echo "5. View all available commands:"
echo "   npm run"
echo ""
echo "📚 Documentation: ./PROTOCOL_SPEC.md"
echo "💬 Need help? Check the README.md"
echo ""