import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const itemWidth = (width - 48) / 2;

interface NFT {
  id: string;
  name: string;
  image: string;
  collection: string;
  price: number;
  owner: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export default function GalleryScreen() {
  const navigation = useNavigation();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadNFTs();
  }, []);

  const loadNFTs = async () => {
    // Mock NFT data
    const mockNFTs: NFT[] = [
      {
        id: '1',
        name: 'STRAT Genesis #001',
        image: 'https://via.placeholder.com/300',
        collection: 'STRAT Genesis',
        price: 100,
        owner: 'You',
        rarity: 'legendary'
      },
      {
        id: '2',
        name: 'Crypto Punk #1234',
        image: 'https://via.placeholder.com/300',
        collection: 'STRAT Punks',
        price: 50,
        owner: 'You',
        rarity: 'epic'
      },
      {
        id: '3',
        name: 'Digital Art #567',
        image: 'https://via.placeholder.com/300',
        collection: 'STRAT Art',
        price: 25,
        owner: 'You',
        rarity: 'rare'
      },
      {
        id: '4',
        name: 'STRAT Avatar #890',
        image: 'https://via.placeholder.com/300',
        collection: 'STRAT Avatars',
        price: 10,
        owner: 'You',
        rarity: 'common'
      }
    ];

    setNfts(mockNFTs);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return '#FFD700';
      case 'epic':
        return '#9C27B0';
      case 'rare':
        return '#2196F3';
      default:
        return '#4CAF50';
    }
  };

  const renderNFTItem = ({ item }: { item: NFT }) => (
    <TouchableOpacity
      style={[
        styles.nftCard,
        viewMode === 'grid' ? styles.gridCard : styles.listCard
      ]}
      onPress={() => navigation.navigate('NFTDetail' as never, { nft: item } as never)}
    >
      <Image source={{ uri: item.image }} style={styles.nftImage} />
      <View
        style={[
          styles.rarityBadge,
          { backgroundColor: getRarityColor(item.rarity) }
        ]}
      >
        <Text style={styles.rarityText}>{item.rarity.toUpperCase()}</Text>
      </View>
      <View style={styles.nftInfo}>
        <Text style={styles.nftName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.nftCollection} numberOfLines={1}>
          {item.collection}
        </Text>
        <View style={styles.priceContainer}>
          <Icon name="currency-usd" size={16} color="#4CAF50" />
          <Text style={styles.nftPrice}>{item.price} STRAT</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>NFT Gallery</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            <Icon
              name={viewMode === 'grid' ? 'view-list' : 'view-grid'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="filter-variant" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{nfts.length}</Text>
          <Text style={styles.statLabel}>Owned NFTs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {nfts.reduce((sum, nft) => sum + nft.price, 0)}
          </Text>
          <Text style={styles.statLabel}>Total Value</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {new Set(nfts.map((nft) => nft.collection)).size}
          </Text>
          <Text style={styles.statLabel}>Collections</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['all', 'legendary', 'epic', 'rare', 'common'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              filter === f && styles.filterTabActive
            ]}
            onPress={() => setFilter(f)}
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

      {/* NFT Grid/List */}
      <FlatList
        data={
          filter === 'all'
            ? nfts
            : nfts.filter((nft) => nft.rarity === filter)
        }
        renderItem={renderNFTItem}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateNFT' as never)}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff'
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16
  },
  iconButton: {
    marginLeft: 16
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  statLabel: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a'
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
  nftCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16
  },
  gridCard: {
    width: itemWidth,
    marginHorizontal: 4
  },
  listCard: {
    width: '100%'
  },
  nftImage: {
    width: '100%',
    height: itemWidth,
    backgroundColor: '#333'
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  rarityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  nftInfo: {
    padding: 12
  },
  nftName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4
  },
  nftCollection: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 8
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  nftPrice: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  }
});
