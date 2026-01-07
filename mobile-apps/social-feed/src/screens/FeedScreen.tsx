import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'timeago.js';
import { useNavigation } from '@react-navigation/native';

interface Post {
  id: string;
  author: string;
  authorAvatar: string;
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  shares: number;
  timestamp: Date;
  liked: boolean;
  verified: boolean;
}

export default function FeedScreen() {
  const navigation = useNavigation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    // Mock social feed data
    const mockPosts: Post[] = [
      {
        id: '1',
        author: 'CryptoWhale',
        authorAvatar: 'https://via.placeholder.com/50',
        content: 'Just staked 10,000 STRAT! The future of DeFi is here! 🚀',
        likes: 245,
        comments: 32,
        shares: 15,
        timestamp: new Date(Date.now() - 3600000),
        liked: false,
        verified: true
      },
      {
        id: '2',
        author: 'BlockchainDev',
        authorAvatar: 'https://via.placeholder.com/50',
        content: 'New smart contract just deployed! Check out the latest DeFi features on STRAT.',
        images: ['https://via.placeholder.com/400x200'],
        likes: 189,
        comments: 24,
        shares: 8,
        timestamp: new Date(Date.now() - 7200000),
        liked: true,
        verified: true
      },
      {
        id: '3',
        author: 'STRATminer',
        authorAvatar: 'https://via.placeholder.com/50',
        content: 'Mining efficiency is through the roof today! Anyone else seeing great hash rates?',
        likes: 156,
        comments: 45,
        shares: 6,
        timestamp: new Date(Date.now() - 10800000),
        liked: false,
        verified: false
      },
      {
        id: '4',
        author: 'NFTCollector',
        authorAvatar: 'https://via.placeholder.com/50',
        content: 'Check out my new STRAT NFT! Genesis collection is fire! 🔥',
        images: ['https://via.placeholder.com/400x400'],
        likes: 312,
        comments: 67,
        shares: 23,
        timestamp: new Date(Date.now() - 14400000),
        liked: false,
        verified: true
      }
    ];

    setPosts(mockPosts);
  };

  const handleLike = (postId: string) => {
    setPosts(
      posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? post.likes - 1 : post.likes + 1
            }
          : post
      )
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <Image
          source={{ uri: item.authorAvatar }}
          style={styles.avatar}
        />
        <View style={styles.authorInfo}>
          <View style={styles.authorNameContainer}>
            <Text style={styles.authorName}>{item.author}</Text>
            {item.verified && (
              <Icon name="check-decagram" size={16} color="#4CAF50" />
            )}
          </View>
          <Text style={styles.timestamp}>{format(item.timestamp)}</Text>
        </View>
        <TouchableOpacity>
          <Icon name="dots-vertical" size={24} color="#aaa" />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <Text style={styles.postContent}>{item.content}</Text>

      {/* Post Images */}
      {item.images && item.images.length > 0 && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.images[0] }}
            style={styles.postImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Post Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>{item.likes} likes</Text>
        <Text style={styles.statsText}>
          {item.comments} comments · {item.shares} shares
        </Text>
      </View>

      {/* Post Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLike(item.id)}
        >
          <Icon
            name={item.liked ? 'heart' : 'heart-outline'}
            size={24}
            color={item.liked ? '#F44336' : '#aaa'}
          />
          <Text
            style={[
              styles.actionText,
              item.liked && { color: '#F44336' }
            ]}
          >
            Like
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Comments' as never, { postId: item.id } as never)}
        >
          <Icon name="comment-outline" size={24} color="#aaa" />
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Icon name="share-outline" size={24} color="#aaa" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Icon name="send-outline" size={24} color="#aaa" />
          <Text style={styles.actionText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>STRAT Social</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity>
            <Icon name="magnify" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={{ marginLeft: 16 }}>
            <Icon name="bell-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Story/Status Bar */}
      <View style={styles.storiesContainer}>
        <TouchableOpacity style={styles.addStoryButton}>
          <View style={styles.addStoryIcon}>
            <Icon name="plus" size={24} color="#fff" />
          </View>
          <Text style={styles.storyText}>Your Story</Text>
        </TouchableOpacity>

        <FlatList
          horizontal
          data={[1, 2, 3, 4, 5]}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.storyItem}>
              <View style={styles.storyBorder}>
                <Image
                  source={{ uri: 'https://via.placeholder.com/60' }}
                  style={styles.storyAvatar}
                />
              </View>
              <Text style={styles.storyText}>User {item}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.toString()}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Create Post */}
      <TouchableOpacity
        style={styles.createPostContainer}
        onPress={() => navigation.navigate('CreatePost' as never)}
      >
        <Image
          source={{ uri: 'https://via.placeholder.com/40' }}
          style={styles.createPostAvatar}
        />
        <Text style={styles.createPostText}>What's on your mind?</Text>
        <Icon name="image" size={24} color="#4CAF50" />
      </TouchableOpacity>

      {/* Feed */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />
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
    paddingTop: 48,
    backgroundColor: '#1a1a2e'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  headerActions: {
    flexDirection: 'row'
  },
  storiesContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  addStoryButton: {
    alignItems: 'center',
    marginRight: 16
  },
  addStoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 16
  },
  storyBorder: {
    padding: 2,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginBottom: 4
  },
  storyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  storyText: {
    color: '#fff',
    fontSize: 12
  },
  createPostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 8,
    borderBottomColor: '#0a0a0a'
  },
  createPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12
  },
  createPostText: {
    flex: 1,
    color: '#aaa',
    fontSize: 16
  },
  postCard: {
    backgroundColor: '#1a1a1a',
    marginBottom: 8,
    paddingVertical: 12
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12
  },
  authorInfo: {
    flex: 1
  },
  authorNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  authorName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  timestamp: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2
  },
  postContent: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 12
  },
  imageContainer: {
    marginBottom: 12
  },
  postImage: {
    width: '100%',
    height: 300
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  statsText: {
    color: '#aaa',
    fontSize: 13
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 8
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 4
  },
  actionText: {
    color: '#aaa',
    fontSize: 14
  }
});
