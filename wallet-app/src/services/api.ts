import axios from 'axios';

export interface Transaction {
  txid: string;
  blockHash?: string;
  blockHeight?: number;
  confirmations: number;
  time: number;
  inputs: Array<{
    address: string;
    value: number;
  }>;
  outputs: Array<{
    address: string;
    value: number;
  }>;
  fee: number;
  type: 'send' | 'receive';
  amount: number;
}

export interface Balance {
  confirmed: number;
  unconfirmed: number;
  total: number;
}

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  confirmations: number;
  scriptPubKey: string;
}

export class StratisAPI {
  private baseUrl: string;
  private isTestnet: boolean;

  constructor(isTestnet: boolean = false) {
    this.isTestnet = isTestnet;
    // Use the appropriate API endpoint
    this.baseUrl = isTestnet
      ? 'https://testnet-api.stratisplatform.com/api'
      : 'https://api.stratisplatform.com/api';
  }

  async getBalance(address: string): Promise<Balance> {
    try {
      const response = await axios.get(`${this.baseUrl}/address/${address}/balance`);
      const data = response.data;

      return {
        confirmed: data.confirmed || 0,
        unconfirmed: data.unconfirmed || 0,
        total: (data.confirmed || 0) + (data.unconfirmed || 0),
      };
    } catch (error) {
      console.error('Error fetching balance:', error);
      // Return zero balance on error
      return { confirmed: 0, unconfirmed: 0, total: 0 };
    }
  }

  async getTransactions(address: string, limit: number = 50): Promise<Transaction[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/address/${address}/transactions`, {
        params: { limit },
      });

      const transactions: Transaction[] = response.data.map((tx: any) => {
        const isSend = tx.inputs.some((input: any) => input.address === address);
        const amount = isSend
          ? tx.outputs
              .filter((output: any) => output.address !== address)
              .reduce((sum: number, output: any) => sum + output.value, 0)
          : tx.outputs
              .filter((output: any) => output.address === address)
              .reduce((sum: number, output: any) => sum + output.value, 0);

        return {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          confirmations: tx.confirmations || 0,
          time: tx.time || Date.now() / 1000,
          inputs: tx.inputs || [],
          outputs: tx.outputs || [],
          fee: tx.fee || 0,
          type: isSend ? 'send' : 'receive',
          amount: amount / 100000000, // Convert satoshis to STRAT
        };
      });

      return transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  async getUTXOs(address: string): Promise<UTXO[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/address/${address}/utxo`);

      return response.data.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value,
        confirmations: utxo.confirmations || 0,
        scriptPubKey: utxo.scriptPubKey,
      }));
    } catch (error) {
      console.error('Error fetching UTXOs:', error);
      return [];
    }
  }

  async broadcastTransaction(txHex: string): Promise<{ success: boolean; txid?: string; error?: string }> {
    try {
      const response = await axios.post(`${this.baseUrl}/transaction/broadcast`, {
        txHex,
      });

      return {
        success: true,
        txid: response.data.txid,
      };
    } catch (error: any) {
      console.error('Error broadcasting transaction:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to broadcast transaction',
      };
    }
  }

  async getNetworkInfo(): Promise<{
    blockHeight: number;
    difficulty: number;
    hashRate: number;
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/network/info`);

      return {
        blockHeight: response.data.blockHeight || 0,
        difficulty: response.data.difficulty || 0,
        hashRate: response.data.hashRate || 0,
      };
    } catch (error) {
      console.error('Error fetching network info:', error);
      return {
        blockHeight: 0,
        difficulty: 0,
        hashRate: 0,
      };
    }
  }

  async estimateFee(blocks: number = 6): Promise<number> {
    try {
      const response = await axios.get(`${this.baseUrl}/fee/estimate`, {
        params: { blocks },
      });

      return response.data.feePerKb || 10000; // Default 0.0001 STRAT per kB
    } catch (error) {
      console.error('Error estimating fee:', error);
      return 10000; // Default fallback
    }
  }

  async getPrice(): Promise<{ usd: number; btc: number }> {
    try {
      // Try to fetch price from CoinGecko or similar API
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: 'stratis',
          vs_currencies: 'usd,btc',
        },
      });

      return {
        usd: response.data.stratis?.usd || 0,
        btc: response.data.stratis?.btc || 0,
      };
    } catch (error) {
      console.error('Error fetching price:', error);
      return { usd: 0, btc: 0 };
    }
  }
}

// Export a default instance
export const apiMainnet = new StratisAPI(false);
export const apiTestnet = new StratisAPI(true);
