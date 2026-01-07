export interface MiningConfig {
  mode: 'solo' | 'pool';
  poolUrl: string;
  walletAddress: string;
  miningType: 'cpu' | 'gpu' | 'both';
  threads: number;
  intensity: number;
  algorithm: 'sha256' | 'scrypt';
  autoStart: boolean;
  difficulty: number;
}

export interface MiningStats {
  hashrate: number;
  shares: number;
  accepted: number;
  rejected: number;
  uptime: number;
  lastShareTime?: number;
  estimatedEarnings: number;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
  hostname: string;
  cpuUsage?: number;
  memoryUsage?: number;
  temperature?: number;
  power?: number;
}

export interface Pool {
  name: string;
  url: string;
  fee: number;
  minPayout: number;
  difficulty: string;
  miners: number;
  hashrate: string;
}

export interface Payout {
  id: string;
  date: number;
  amount: number;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface HistoryEntry {
  timestamp: number;
  hashrate: number;
  shares: number;
  accepted: number;
  rejected: number;
  earnings: number;
  temperature?: number;
  power?: number;
}

export interface ChartData {
  time: string;
  hashrate: number;
  temperature?: number;
  power?: number;
  earnings: number;
}
