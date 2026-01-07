import { useState } from 'react';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { explorerApi, stakingApi } from '../lib/api';

type LeaderboardType = 'miners' | 'stakers' | 'holders';

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('miners');

  const { data: minersData, loading: minersLoading } = useAutoRefresh<any>({
    fetchFn: () => explorerApi.getMining(30),
    interval: 15000,
    wsEvents: ['block:new'],
    enabled: activeTab === 'miners',
  });

  const { data: stakersData, loading: stakersLoading } = useAutoRefresh<any>({
    fetchFn: () => stakingApi.getLeaderboard(10),
    interval: 15000,
    wsEvents: ['stake:created'],
    enabled: activeTab === 'stakers',
  });

  const { data: holdersData, loading: holdersLoading } = useAutoRefresh<any>({
    fetchFn: () => explorerApi.getRichList(10),
    interval: 30000,
    enabled: activeTab === 'holders',
  });

  const tabs = [
    { id: 'miners', label: 'Top Miners', icon: '⛏️' },
    { id: 'stakers', label: 'Top Stakers', icon: '💰' },
    { id: 'holders', label: 'Top Holders', icon: '💎' },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as LeaderboardType)}
            className={`flex-1 px-6 py-4 rounded-xl font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-green-400 to-purple-500 text-black'
                : 'glass hover:bg-white/5'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leaderboard Content */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          {tabs.find((t) => t.id === activeTab)?.label}
        </h3>

        {activeTab === 'miners' && <MinersList data={minersData} loading={minersLoading} />}
        {activeTab === 'stakers' && <StakersList data={stakersData} loading={stakersLoading} />}
        {activeTab === 'holders' && <HoldersList data={holdersData} loading={holdersLoading} />}
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center justify-center text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Leaderboard updates automatically</span>
        </div>
      </div>
    </div>
  );
}

function MinersList({ data, loading }: { data: any; loading: boolean }) {
  if (loading && !data) return <LoadingState />;

  const miners = data?.miners || [];
  if (miners.length === 0) {
    return <EmptyState message="No miners found. Start mining to appear on the leaderboard!" />;
  }

  return (
    <div className="space-y-3">
      {miners.map((miner: any, idx: number) => (
        <LeaderboardItem
          key={miner.address}
          rank={idx + 1}
          address={miner.address}
          stat1={{ label: `${miner.blocks} blocks mined`, value: miner.blocks }}
          stat2={{ label: 'Rewards', value: `${(miner.totalReward + miner.totalFees).toFixed(2)} STRAT` }}
        />
      ))}
    </div>
  );
}

function StakersList({ data, loading }: { data: any; loading: boolean }) {
  if (loading && !data) return <LoadingState />;

  const stakers = data?.stakers || [];
  if (stakers.length === 0) {
    return <EmptyState message="No stakers found. Create a stake to appear on the leaderboard!" />;
  }

  return (
    <div className="space-y-3">
      {stakers.map((staker: any, idx: number) => (
        <LeaderboardItem
          key={staker.address}
          rank={idx + 1}
          address={staker.address}
          stat1={{ label: `${staker.staked.toFixed(2)} STRAT staked`, value: staker.staked }}
          stat2={{ label: 'Rewards', value: `${staker.rewards.toFixed(2)} STRAT` }}
          color="purple"
        />
      ))}
    </div>
  );
}

function HoldersList({ data, loading }: { data: any; loading: boolean }) {
  if (loading && !data) return <LoadingState />;

  const holders = data?.richList || [];
  if (holders.length === 0) {
    return <EmptyState message="No holders found." />;
  }

  const totalSupply = data?.totalSupply || 1;

  return (
    <div className="space-y-3">
      {holders.map((holder: any, idx: number) => (
        <LeaderboardItem
          key={holder.address}
          rank={idx + 1}
          address={holder.address}
          stat1={{ label: `${((holder.balance / totalSupply) * 100).toFixed(2)}% of supply`, value: holder.balance }}
          stat2={{ label: 'Balance', value: `${holder.balance.toFixed(2)} STRAT` }}
          color="green"
        />
      ))}
    </div>
  );
}

interface LeaderboardItemProps {
  rank: number;
  address: string;
  stat1: { label: string; value: number };
  stat2: { label: string; value: string };
  color?: 'green' | 'purple';
}

function LeaderboardItem({ rank, address, stat1, stat2, color = 'green' }: LeaderboardItemProps) {
  const rankColor = rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-orange-400' : 'text-gray-500';

  return (
    <div className="bg-white/5 p-4 rounded-xl flex items-center gap-4 hover:bg-white/10 transition-colors">
      <div className={`text-3xl font-bold ${rankColor} min-w-[60px]`}>#{rank}</div>
      <div className="flex-1">
        <div className="font-mono text-sm">{address.substring(0, 16)}...</div>
        <div className="text-xs text-gray-400">{stat1.label}</div>
      </div>
      <div className="text-right">
        <div className={`text-lg font-bold ${color === 'purple' ? 'text-purple-400' : 'text-green-400'}`}>
          {stat2.value}
        </div>
        <div className="text-xs text-gray-500">{stat2.label}</div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center text-gray-400 py-12">
      {message}
    </div>
  );
}
