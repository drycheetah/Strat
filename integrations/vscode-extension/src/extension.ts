/**
 * STRAT VS Code Extension
 * Smart contract development tools for STRAT blockchain
 */

import * as vscode from 'vscode';
import { ethers } from 'ethers';
import axios from 'axios';

let provider: ethers.JsonRpcProvider | null = null;
let signer: ethers.Wallet | null = null;

export function activate(context: vscode.ExtensionContext) {
  console.log('STRAT extension activated');

  // Initialize provider
  initializeProvider();

  // Register commands
  registerCommands(context);

  // Register tree data providers
  registerTreeProviders(context);

  // Status bar
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = '$(pulse) STRAT';
  statusBarItem.tooltip = 'STRAT Network Status';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Update network status
  updateNetworkStatus(statusBarItem);
  setInterval(() => updateNetworkStatus(statusBarItem), 30000);
}

function initializeProvider() {
  const config = vscode.workspace.getConfiguration('strat');
  const rpcUrl = config.get<string>('rpcUrl', 'http://localhost:8545');

  provider = new ethers.JsonRpcProvider(rpcUrl);
}

function registerCommands(context: vscode.ExtensionContext) {
  // Compile contract
  context.subscriptions.push(
    vscode.commands.registerCommand('strat.compile', async () => {
      await compileContract();
    })
  );

  // Deploy contract
  context.subscriptions.push(
    vscode.commands.registerCommand('strat.deploy', async () => {
      await deployContract();
    })
  );

  // Run tests
  context.subscriptions.push(
    vscode.commands.registerCommand('strat.test', async () => {
      await runTests();
    })
  );

  // Connect wallet
  context.subscriptions.push(
    vscode.commands.registerCommand('strat.connectWallet', async () => {
      await connectWallet();
    })
  );

  // Get balance
  context.subscriptions.push(
    vscode.commands.registerCommand('strat.getBalance', async () => {
      await getBalance();
    })
  );

  // Send transaction
  context.subscriptions.push(
    vscode.commands.registerCommand('strat.sendTransaction', async () => {
      await sendTransaction();
    })
  );

  // View block
  context.subscriptions.push(
    vscode.commands.registerCommand('strat.viewBlock', async () => {
      await viewBlock();
    })
  );

  // New project
  context.subscriptions.push(
    vscode.commands.registerCommand('strat.newProject', async () => {
      await createNewProject();
    })
  );
}

function registerTreeProviders(context: vscode.ExtensionContext) {
  const contractsProvider = new ContractsTreeProvider();
  vscode.window.registerTreeDataProvider('stratContracts', contractsProvider);

  const accountsProvider = new AccountsTreeProvider();
  vscode.window.registerTreeDataProvider('stratAccounts', accountsProvider);

  const networkProvider = new NetworkTreeProvider();
  vscode.window.registerTreeDataProvider('stratNetwork', networkProvider);
}

async function compileContract() {
  const terminal = vscode.window.createTerminal('STRAT Compile');
  terminal.show();
  terminal.sendText('npx hardhat compile');

  vscode.window.showInformationMessage('Compiling smart contracts...');
}

async function deployContract() {
  const network = await vscode.window.showQuickPick(
    ['testnet', 'mainnet', 'local'],
    { placeHolder: 'Select network to deploy to' }
  );

  if (!network) return;

  const terminal = vscode.window.createTerminal('STRAT Deploy');
  terminal.show();
  terminal.sendText(`npx hardhat deploy --network ${network}`);

  vscode.window.showInformationMessage(`Deploying to ${network}...`);
}

async function runTests() {
  const terminal = vscode.window.createTerminal('STRAT Tests');
  terminal.show();
  terminal.sendText('npx hardhat test');

  vscode.window.showInformationMessage('Running tests...');
}

async function connectWallet() {
  const privateKey = await vscode.window.showInputBox({
    prompt: 'Enter private key',
    password: true,
    placeHolder: '0x...',
  });

  if (!privateKey || !provider) return;

  try {
    signer = new ethers.Wallet(privateKey, provider);
    const address = await signer.getAddress();

    vscode.window.showInformationMessage(`Connected: ${address}`);
  } catch (error) {
    vscode.window.showErrorMessage('Failed to connect wallet');
  }
}

async function getBalance() {
  const address = await vscode.window.showInputBox({
    prompt: 'Enter address',
    placeHolder: '0x...',
  });

  if (!address || !provider) return;

  try {
    const balance = await provider.getBalance(address);
    const balanceInStrat = ethers.formatEther(balance);

    vscode.window.showInformationMessage(
      `Balance: ${balanceInStrat} STRAT`
    );
  } catch (error) {
    vscode.window.showErrorMessage('Failed to get balance');
  }
}

async function sendTransaction() {
  if (!signer) {
    vscode.window.showWarningMessage('Please connect wallet first');
    return;
  }

  const to = await vscode.window.showInputBox({
    prompt: 'Recipient address',
    placeHolder: '0x...',
  });

  if (!to) return;

  const amount = await vscode.window.showInputBox({
    prompt: 'Amount in STRAT',
    placeHolder: '0.1',
  });

  if (!amount) return;

  try {
    const tx = await signer.sendTransaction({
      to,
      value: ethers.parseEther(amount),
    });

    vscode.window.showInformationMessage(
      `Transaction sent: ${tx.hash}`
    );

    await tx.wait();

    vscode.window.showInformationMessage('Transaction confirmed!');
  } catch (error) {
    vscode.window.showErrorMessage('Transaction failed');
  }
}

async function viewBlock() {
  const blockNumber = await vscode.window.showInputBox({
    prompt: 'Enter block number (or "latest")',
    placeHolder: 'latest',
  });

  if (!blockNumber || !provider) return;

  try {
    const block =
      blockNumber === 'latest'
        ? await provider.getBlock('latest')
        : await provider.getBlock(parseInt(blockNumber));

    if (!block) {
      vscode.window.showErrorMessage('Block not found');
      return;
    }

    const info = `
Block #${block.number}
Hash: ${block.hash}
Timestamp: ${new Date(block.timestamp * 1000).toLocaleString()}
Transactions: ${block.transactions.length}
Miner: ${block.miner}
    `.trim();

    vscode.window.showInformationMessage(info, { modal: true });
  } catch (error) {
    vscode.window.showErrorMessage('Failed to get block');
  }
}

async function createNewProject() {
  const projectName = await vscode.window.showInputBox({
    prompt: 'Enter project name',
    placeHolder: 'my-strat-project',
  });

  if (!projectName) return;

  const template = await vscode.window.showQuickPick(
    ['Basic', 'ERC20 Token', 'NFT Collection', 'DeFi Protocol'],
    { placeHolder: 'Select project template' }
  );

  if (!template) return;

  const terminal = vscode.window.createTerminal('STRAT New Project');
  terminal.show();
  terminal.sendText(
    `npx create-strat-app ${projectName} --template ${template.toLowerCase()}`
  );

  vscode.window.showInformationMessage(
    `Creating new STRAT project: ${projectName}`
  );
}

async function updateNetworkStatus(statusBarItem: vscode.StatusBarItem) {
  if (!provider) return;

  try {
    const blockNumber = await provider.getBlockNumber();
    const network = await provider.getNetwork();

    statusBarItem.text = `$(pulse) STRAT #${blockNumber}`;
    statusBarItem.tooltip = `Network: ${network.name}\nBlock: ${blockNumber}`;
  } catch (error) {
    statusBarItem.text = '$(error) STRAT Disconnected';
    statusBarItem.tooltip = 'Failed to connect to STRAT network';
  }
}

class ContractsTreeProvider implements vscode.TreeDataProvider<ContractItem> {
  getTreeItem(element: ContractItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ContractItem): Promise<ContractItem[]> {
    if (!vscode.workspace.workspaceFolders) {
      return [];
    }

    const contracts: ContractItem[] = [];
    const pattern = new vscode.RelativePattern(
      vscode.workspace.workspaceFolders[0],
      'contracts/**/*.sol'
    );
    const files = await vscode.workspace.findFiles(pattern);

    for (const file of files) {
      const name = file.path.split('/').pop() || '';
      contracts.push(new ContractItem(name, file));
    }

    return contracts;
  }
}

class ContractItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly resourceUri: vscode.Uri
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.command = {
      command: 'vscode.open',
      title: 'Open Contract',
      arguments: [resourceUri],
    };
  }
}

class AccountsTreeProvider implements vscode.TreeDataProvider<AccountItem> {
  getTreeItem(element: AccountItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: AccountItem): AccountItem[] {
    // Return connected accounts
    if (signer) {
      return [new AccountItem('Connected Account')];
    }
    return [];
  }
}

class AccountItem extends vscode.TreeItem {
  constructor(public readonly label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
  }
}

class NetworkTreeProvider implements vscode.TreeDataProvider<NetworkItem> {
  getTreeItem(element: NetworkItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: NetworkItem): Promise<NetworkItem[]> {
    if (!provider) return [];

    try {
      const [blockNumber, gasPrice] = await Promise.all([
        provider.getBlockNumber(),
        provider.getFeeData(),
      ]);

      return [
        new NetworkItem(`Block Height: ${blockNumber}`),
        new NetworkItem(`Gas Price: ${ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei')} gwei`),
      ];
    } catch (error) {
      return [new NetworkItem('Network Offline')];
    }
  }
}

class NetworkItem extends vscode.TreeItem {
  constructor(public readonly label: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
  }
}

export function deactivate() {}
