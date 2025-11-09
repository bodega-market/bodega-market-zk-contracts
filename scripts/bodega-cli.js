#!/usr/bin/env node

// Bodega Market CLI
// Command-line interface for interacting with Bodega Market contracts

const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');
require('dotenv').config();

// Import SDK (we'll need to compile it first)
let BodegaMarketSDK;
try {
  BodegaMarketSDK = require('../dist/sdk/BodegaMarketSDK').BodegaMarketSDK;
} catch (e) {
  console.log(chalk.yellow('SDK not compiled. Run "npm run build" first.'));
}

// Configure CLI
program
  .name('bodega')
  .description('CLI for Bodega Market prediction markets')
  .version('1.0.0');

// Create market command
program
  .command('create-market')
  .description('Create a new prediction market')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'question',
        message: 'Market question:',
        validate: (input) => input.length > 10 || 'Question must be at least 10 characters'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description (optional):',
        default: ''
      },
      {
        type: 'input',
        name: 'endDate',
        message: 'End date (YYYY-MM-DD):',
        validate: (input) => {
          const date = new Date(input);
          return date > new Date() || 'End date must be in the future';
        }
      },
      {
        type: 'number',
        name: 'bondAmount',
        message: 'Creator bond (NIGHT):',
        default: 100
      }
    ]);

    const spinner = ora('Creating market...').start();
    
    try {
      // Mock implementation for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      const marketId = `market_${Date.now()}`;
      
      spinner.succeed(chalk.green(`Market created successfully!`));
      console.log(chalk.cyan(`Market ID: ${marketId}`));
      console.log(chalk.gray(`Transaction hash: 0x${Math.random().toString(16).slice(2, 66)}`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to create market'));
      console.error(error.message);
    }
  });

// Place bet command
program
  .command('bet <marketId>')
  .description('Place a bet on a market')
  .action(async (marketId) => {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'outcome',
        message: 'Choose outcome:',
        choices: ['YES', 'NO']
      },
      {
        type: 'number',
        name: 'amount',
        message: 'Bet amount (NIGHT):',
        validate: (input) => input > 0 || 'Amount must be positive'
      }
    ]);

    const spinner = ora('Placing bet...').start();
    
    try {
      // Mock implementation
      spinner.text = 'Generating zero-knowledge proof...';
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      spinner.text = 'Submitting to blockchain...';
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const positionId = `position_${Date.now()}`;
      spinner.succeed(chalk.green(`Bet placed successfully!`));
      console.log(chalk.cyan(`Position ID: ${positionId}`));
      console.log(chalk.gray(`Your position is completely private 🔒`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to place bet'));
      console.error(error.message);
    }
  });

// List markets command
program
  .command('markets')
  .description('List all markets')
  .option('-s, --status <status>', 'filter by status', 'ACTIVE')
  .action(async (options) => {
    const spinner = ora('Fetching markets...').start();
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const markets = [
        {
          id: 'market_001',
          question: 'Will Bitcoin reach $100,000 by 2024?',
          status: 'ACTIVE',
          volume: '250,000 NIGHT',
          ends: '2024-12-31'
        },
        {
          id: 'market_002',
          question: 'Will Ethereum flip Bitcoin by market cap?',
          status: 'ACTIVE',
          volume: '180,000 NIGHT',
          ends: '2024-06-30'
        },
        {
          id: 'market_003',
          question: 'Will SpaceX land on Mars before 2030?',
          status: 'ACTIVE',
          volume: '420,000 NIGHT',
          ends: '2029-12-31'
        }
      ];

      spinner.stop();
      
      const table = new Table({
        head: ['ID', 'Question', 'Status', 'Volume', 'Ends'],
        style: { head: ['cyan'] }
      });

      markets.forEach(market => {
        table.push([
          market.id,
          market.question.substring(0, 40) + '...',
          chalk.green(market.status),
          market.volume,
          market.ends
        ]);
      });

      console.log(table.toString());
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch markets'));
      console.error(error.message);
    }
  });

// Market info command
program
  .command('info <marketId>')
  .description('Get detailed market information')
  .action(async (marketId) => {
    const spinner = ora('Fetching market info...').start();
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      spinner.stop();
      
      // Mock data
      console.log(chalk.cyan('\n📊 Market Information\n'));
      console.log(chalk.white('ID:'), marketId);
      console.log(chalk.white('Question:'), 'Will Bitcoin reach $100,000 by end of 2024?');
      console.log(chalk.white('Status:'), chalk.green('ACTIVE'));
      console.log(chalk.white('Created:'), '2024-01-15 10:30:00');
      console.log(chalk.white('Ends:'), '2024-12-31 23:59:59');
      console.log(chalk.white('Creator:'), '0xabcd...ef12');
      
      console.log(chalk.cyan('\n💰 Market Stats\n'));
      console.log(chalk.white('Total Volume:'), '250,000 NIGHT');
      console.log(chalk.white('Active Positions:'), '1,234');
      console.log(chalk.white('Liquidity:'), '50,000 NIGHT');
      
      console.log(chalk.cyan('\n📈 Current Prices\n'));
      console.log(chalk.white('YES:'), chalk.green('65.5%'));
      console.log(chalk.white('NO:'), chalk.red('34.5%'));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch market info'));
      console.error(error.message);
    }
  });

// Claim winnings command
program
  .command('claim <positionId>')
  .description('Claim winnings from a winning position')
  .action(async (positionId) => {
    const spinner = ora('Checking position...').start();
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      spinner.text = 'Generating settlement proof...';
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      spinner.text = 'Claiming winnings...';
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      spinner.succeed(chalk.green('Winnings claimed successfully!'));
      console.log(chalk.cyan('Amount:'), '150 NIGHT');
      console.log(chalk.gray('Transaction hash: 0x' + Math.random().toString(16).slice(2, 66)));
    } catch (error) {
      spinner.fail(chalk.red('Failed to claim winnings'));
      console.error(error.message);
    }
  });

// Interactive mode
program
  .command('interactive')
  .description('Start interactive mode')
  .action(async () => {
    console.log(chalk.cyan('\n🎲 Welcome to Bodega Market CLI!\n'));
    
    let running = true;
    while (running) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            'Create a market',
            'Browse markets',
            'Place a bet',
            'Check my positions',
            'Claim winnings',
            'Exit'
          ]
        }
      ]);

      switch (action) {
        case 'Exit':
          running = false;
          console.log(chalk.cyan('\nGoodbye! 👋\n'));
          break;
        default:
          console.log(chalk.yellow(`\n${action} - Coming soon!\n`));
      }
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}