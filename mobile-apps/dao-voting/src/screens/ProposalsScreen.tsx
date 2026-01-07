import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  status: 'active' | 'passed' | 'rejected' | 'pending';
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVotes: number;
  startDate: Date;
  endDate: Date;
  quorum: number;
  category: 'technical' | 'economic' | 'governance' | 'community';
}

export default function ProposalsScreen() {
  const navigation = useNavigation();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'passed' | 'rejected'>('all');
  const [votingPower, setVotingPower] = useState(1000);

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    // Mock proposal data
    const mockProposals: Proposal[] = [
      {
        id: '1',
        title: 'Reduce Block Time to 30 seconds',
        description: 'Proposal to reduce the block time from 60 seconds to 30 seconds to improve transaction throughput',
        proposer: 'STRAT123...456',
        status: 'active',
        votesFor: 15000,
        votesAgainst: 3000,
        votesAbstain: 500,
        totalVotes: 18500,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-15'),
        quorum: 10000,
        category: 'technical'
      },
      {
        id: '2',
        title: 'Increase Mining Rewards by 10%',
        description: 'Increase block rewards from 50 STRAT to 55 STRAT to incentivize more miners',
        proposer: 'STRAT789...012',
        status: 'active',
        votesFor: 8000,
        votesAgainst: 9000,
        votesAbstain: 1000,
        totalVotes: 18000,
        startDate: new Date('2024-01-05'),
        endDate: new Date('2024-01-20'),
        quorum: 10000,
        category: 'economic'
      },
      {
        id: '3',
        title: 'Community Grant Program',
        description: 'Allocate 100,000 STRAT for community development grants',
        proposer: 'STRAT345...678',
        status: 'passed',
        votesFor: 20000,
        votesAgainst: 2000,
        votesAbstain: 500,
        totalVotes: 22500,
        startDate: new Date('2023-12-01'),
        endDate: new Date('2023-12-15'),
        quorum: 10000,
        category: 'community'
      }
    ];

    setProposals(mockProposals);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'passed':
        return '#2196F3';
      case 'rejected':
        return '#F44336';
      default:
        return '#FF9800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical':
        return 'code-braces';
      case 'economic':
        return 'cash-multiple';
      case 'governance':
        return 'gavel';
      default:
        return 'account-group';
    }
  };

  const calculatePercentage = (votes: number, total: number) => {
    return total > 0 ? (votes / total) * 100 : 0;
  };

  const daysRemaining = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const renderProposal = ({ item }: { item: Proposal }) => {
    const forPercentage = calculatePercentage(item.votesFor, item.totalVotes);
    const againstPercentage = calculatePercentage(item.votesAgainst, item.totalVotes);
    const days = daysRemaining(item.endDate);

    return (
      <TouchableOpacity
        style={styles.proposalCard}
        onPress={() => navigation.navigate('ProposalDetail' as never, { proposal: item } as never)}
      >
        <View style={styles.proposalHeader}>
          <View style={styles.categoryBadge}>
            <Icon
              name={getCategoryIcon(item.category)}
              size={16}
              color="#fff"
            />
            <Text style={styles.categoryText}>
              {item.category.toUpperCase()}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) }
            ]}
          >
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.proposalTitle}>{item.title}</Text>
        <Text style={styles.proposalDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.proposerContainer}>
          <Icon name="account" size={16} color="#aaa" />
          <Text style={styles.proposerText}>by {item.proposer}</Text>
        </View>

        {/* Vote Progress */}
        <View style={styles.voteProgressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${forPercentage}%`, backgroundColor: '#4CAF50' }
              ]}
            />
            <View
              style={[
                styles.progressFill,
                {
                  width: `${againstPercentage}%`,
                  backgroundColor: '#F44336',
                  marginLeft: forPercentage > 0 ? 2 : 0
                }
              ]}
            />
          </View>

          <View style={styles.voteStats}>
            <View style={styles.voteStat}>
              <View style={[styles.voteIndicator, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.voteLabel}>For: {forPercentage.toFixed(1)}%</Text>
            </View>
            <View style={styles.voteStat}>
              <View style={[styles.voteIndicator, { backgroundColor: '#F44336' }]} />
              <Text style={styles.voteLabel}>Against: {againstPercentage.toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.proposalFooter}>
          <View style={styles.footerItem}>
            <Icon name="vote" size={16} color="#aaa" />
            <Text style={styles.footerText}>
              {item.totalVotes.toLocaleString()} votes
            </Text>
          </View>
          {item.status === 'active' && (
            <View style={styles.footerItem}>
              <Icon name="clock-outline" size={16} color="#FF9800" />
              <Text style={styles.footerText}>{days} days left</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filteredProposals = proposals.filter(
    (p) => filter === 'all' || p.status === filter
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>DAO Governance</Text>
        <View style={styles.votingPowerCard}>
          <Icon name="scale-balance" size={24} color="#4CAF50" />
          <View style={styles.votingPowerInfo}>
            <Text style={styles.votingPowerLabel}>Your Voting Power</Text>
            <Text style={styles.votingPowerValue}>
              {votingPower.toLocaleString()} STRAT
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['all', 'active', 'passed', 'rejected'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              filter === f && styles.filterTabActive
            ]}
            onPress={() => setFilter(f as any)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Proposals List */}
      <FlatList
        data={filteredProposals}
        renderItem={renderProposal}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Proposal FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateProposal' as never)}
      >
        <Icon name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a'
  },
  header: {
    padding: 16,
    paddingTop: 48
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16
  },
  votingPowerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12
  },
  votingPowerInfo: {
    marginLeft: 12
  },
  votingPowerLabel: {
    color: '#aaa',
    fontSize: 12
  },
  votingPowerValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center'
  },
  filterTabActive: {
    backgroundColor: '#4CAF50'
  },
  filterText: {
    color: '#aaa',
    fontSize: 14
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: 'bold'
  },
  listContainer: {
    padding: 16
  },
  proposalCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4
  },
  categoryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  proposalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  proposalDescription: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12
  },
  proposerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 4
  },
  proposerText: {
    color: '#aaa',
    fontSize: 12
  },
  voteProgressContainer: {
    marginBottom: 12
  },
  progressBar: {
    height: 8,
    backgroundColor: '#0a0a0a',
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 8
  },
  progressFill: {
    height: '100%'
  },
  voteStats: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  voteStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  voteIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  voteLabel: {
    color: '#aaa',
    fontSize: 12
  },
  proposalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)'
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  footerText: {
    color: '#aaa',
    fontSize: 12
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8
  }
});
