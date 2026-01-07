import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io, { Socket } from 'socket.io-client';

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: number;
  fee: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  blockHeight?: number;
}

export interface Balance {
  address: string;
  balance: number;
  unconfirmedBalance: number;
  stakingBalance: number;
}

export interface DeFiPool {
  id: string;
  name: string;
  tvl: number;
  apy: number;
  token0: string;
  token1: string;
  userLiquidity?: number;
}

class ApiService {
  private api: AxiosInstance;
  private socket: Socket | null = null;
  private baseUrl: string;

  constructor() {
    this.baseUrl = __DEV__
      ? 'http://localhost:3000'
      : 'https://api.strat.io';

    this.api = axios.create({
      baseURL: this.baseUrl + '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors
   */
  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          await AsyncStorage.removeItem('auth_token');
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Connect to WebSocket
   */
  connectWebSocket(address: string) {
    if (this.socket?.connected) return;

    this.socket = io(this.baseUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.socket?.emit('subscribe_address', address);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket() {
    this.socket?.disconnect();
    this.socket = null;
  }

  /**
   * Subscribe to address updates
   */
  subscribeToAddress(
    address: string,
    callback: (data: any) => void
  ) {
    this.socket?.on('address_balance', callback);
    this.socket?.emit('subscribe_address', address);
  }

  /**
   * Get wallet balance
   */
  async getBalance(address: string): Promise<Balance> {
    const response = await this.api.get(`/wallets/${address}/balance`);
    return response.data;
  }

  /**
   * Get transaction history
   */
  async getTransactions(
    address: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Transaction[]> {
    const response = await this.api.get(`/wallets/${address}/transactions`, {
      params: { limit, offset }
    });
    return response.data;
  }

  /**
   * Send transaction
   */
  async sendTransaction(
    from: string,
    to: string,
    amount: number,
    privateKey: string
  ): Promise<{ hash: string; success: boolean }> {
    const response = await this.api.post('/transactions/send', {
      from,
      to,
      amount,
      privateKey
    });
    return response.data;
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(hash: string): Promise<Transaction> {
    const response = await this.api.get(`/transactions/${hash}`);
    return response.data;
  }

  /**
   * Get blockchain stats
   */
  async getBlockchainStats(): Promise<{
    blockHeight: number;
    difficulty: number;
    hashRate: number;
    totalSupply: number;
    circulatingSupply: number;
  }> {
    const response = await this.api.get('/blockchain/stats');
    return response.data;
  }

  /**
   * Get current price
   */
  async getPrice(): Promise<{
    usd: number;
    btc: number;
    change24h: number;
  }> {
    const response = await this.api.get('/price/current');
    return response.data;
  }

  /**
   * Get price history
   */
  async getPriceHistory(
    timeframe: string
  ): Promise<Array<{ timestamp: number; price: number }>> {
    const response = await this.api.get('/price/history', {
      params: { timeframe }
    });
    return response.data;
  }

  /**
   * Get DeFi pools
   */
  async getDeFiPools(): Promise<DeFiPool[]> {
    const response = await this.api.get('/liquidity/pools');
    return response.data;
  }

  /**
   * Add liquidity to pool
   */
  async addLiquidity(
    poolId: string,
    amount0: number,
    amount1: number,
    address: string
  ): Promise<{ success: boolean; txHash: string }> {
    const response = await this.api.post('/liquidity/add', {
      poolId,
      amount0,
      amount1,
      address
    });
    return response.data;
  }

  /**
   * Remove liquidity from pool
   */
  async removeLiquidity(
    poolId: string,
    liquidity: number,
    address: string
  ): Promise<{ success: boolean; txHash: string }> {
    const response = await this.api.post('/liquidity/remove', {
      poolId,
      liquidity,
      address
    });
    return response.data;
  }

  /**
   * Stake tokens
   */
  async stake(
    address: string,
    amount: number
  ): Promise<{ success: boolean; txHash: string }> {
    const response = await this.api.post('/staking/stake', {
      address,
      amount
    });
    return response.data;
  }

  /**
   * Unstake tokens
   */
  async unstake(
    address: string,
    amount: number
  ): Promise<{ success: boolean; txHash: string }> {
    const response = await this.api.post('/staking/unstake', {
      address,
      amount
    });
    return response.data;
  }

  /**
   * Get staking info
   */
  async getStakingInfo(address: string): Promise<{
    staked: number;
    rewards: number;
    apy: number;
    lockPeriod: number;
  }> {
    const response = await this.api.get(`/staking/${address}`);
    return response.data;
  }

  /**
   * Get NFTs owned by address
   */
  async getNFTs(address: string): Promise<any[]> {
    const response = await this.api.get(`/nft/owned/${address}`);
    return response.data;
  }

  /**
   * Get governance proposals
   */
  async getProposals(): Promise<any[]> {
    const response = await this.api.get('/governance/proposals');
    return response.data;
  }

  /**
   * Vote on proposal
   */
  async vote(
    proposalId: string,
    vote: 'for' | 'against' | 'abstain',
    address: string,
    amount: number
  ): Promise<{ success: boolean }> {
    const response = await this.api.post('/governance/vote', {
      proposalId,
      vote,
      address,
      amount
    });
    return response.data;
  }

  /**
   * Get news feed
   */
  async getNews(limit: number = 10): Promise<any[]> {
    const response = await this.api.get('/social/news', {
      params: { limit }
    });
    return response.data;
  }

  /**
   * Get social feed
   */
  async getSocialFeed(limit: number = 20): Promise<any[]> {
    const response = await this.api.get('/social/feed', {
      params: { limit }
    });
    return response.data;
  }

  /**
   * Create post
   */
  async createPost(
    address: string,
    content: string,
    images?: string[]
  ): Promise<{ success: boolean; postId: string }> {
    const response = await this.api.post('/social/posts', {
      address,
      content,
      images
    });
    return response.data;
  }
}

export default new ApiService();
