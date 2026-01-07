# STRAT Social & Community Features Documentation

This document describes the comprehensive social and community features implemented for the STRAT blockchain platform.

## Overview

The social features enable users to engage with the STRAT community through posts, achievements, referrals, and leaderboards. These features encourage user engagement and create a vibrant ecosystem around the blockchain.

## Architecture

### Models

#### 1. Post Model (`models/Post.js`)

The Post model represents user-generated content in the social feed.

**Fields:**
- `user` - Reference to User document (required, indexed)
- `content` - Post text content (required, max 5000 chars)
- `type` - Post type enum: `transaction`, `achievement`, `general`, `milestone` (indexed)
- `relatedTransaction` - Optional reference to Transaction model
- `relatedAchievement` - Optional reference to Achievement model
- `metadata` - Additional data (amount, currency, description, tags)
- `likes` - Object containing:
  - `count` - Number of likes (indexed, min 0)
  - `users` - Array of user IDs who liked (indexed)
- `comments` - Array of comment objects:
  - `user` - Comment author reference
  - `content` - Comment text (max 1000 chars)
  - `likes` - Comment like count
  - `createdAt` - Timestamp
- `visibility` - Enum: `public`, `friends`, `private` (default: public, indexed)
- `createdAt` - Timestamp (indexed)
- `updatedAt` - Timestamp

**Indexes:**
- `{ user: 1, createdAt: -1 }` - User feed queries
- `{ type: 1, createdAt: -1 }` - Type-based filtering
- `{ 'likes.users': 1 }` - Like queries
- `{ visibility: 1, createdAt: -1 }` - Public feed queries

**Methods:**
- `addLike(userId)` - Add like to post, returns updated like count
- `removeLike(userId)` - Remove like from post
- `addComment(userId, content)` - Add comment to post
- `removeComment(commentId)` - Remove comment from post

**Static Methods:**
- `getPostWithDetails(postId)` - Get post with populated references
- `getUserFeed(userId, limit, skip)` - Get user's personal feed
- `getGlobalFeed(limit, skip, filter)` - Get public global feed
- `getTrendingPosts(days, limit)` - Get trending posts by likes

---

#### 2. Achievement Model (`models/Achievement.js`)

The Achievement model tracks user accomplishments and badges.

**Fields:**
- `user` - Reference to User document (required, indexed)
- `type` - Achievement type enum (required, indexed):
  - `first_transaction`
  - `first_stake`
  - `first_mining`
  - `portfolio_milestone`
  - `wallet_creator`
  - `transaction_count`
  - `staking_milestone`
  - `trading_volume`
  - `referral_milestone`
  - `community_contributor`
- `title` - Achievement name (required)
- `description` - Achievement description (max 500 chars)
- `icon` - URL to badge image
- `badge` - Badge object:
  - `name` - Badge name
  - `color` - Badge color
  - `rarity` - Enum: `common`, `uncommon`, `rare`, `epic`, `legendary` (default: common)
- `criteria` - How achievement was earned
- `points` - Points value (default: 10, min: 0)
- `rewards` - Reward object:
  - `type` - Enum: `tokens`, `experience`, `badge`, `multiple`
  - `amount` - Reward amount
  - `rewardAmount` - Specific reward tokens/points (default: 100)
  - `referredRewardAmount` - Referred user reward (default: 50)
  - `claimed` - Whether claimed (default: false)
  - `claimedAt` - Claim timestamp
- `earnedAt` - Timestamp achievement was earned (indexed)
- `visibility` - Show on profile (default: true)
- `metadata` - Additional data (transaction hash, block number, etc.)

**Indexes:**
- `{ user: 1, earnedAt: -1 }` - User achievements
- `{ user: 1, type: 1 }` - User achievement by type
- `{ type: 1, earnedAt: -1 }` - Global achievement timeline

**Static Methods:**
- `getUserAchievements(userId)` - Get all user achievements
- `getByType(type)` - Get achievement template by type
- `getUserAchievementCount(userId)` - Count user achievements
- `getUserTotalPoints(userId)` - Sum user achievement points
- `getPointsLeaderboard(limit)` - Get top users by points
- `hasUserAchievement(userId, type)` - Check if user has achievement
- `getUserAchievementBreakdown(userId)` - Get rarity distribution

---

#### 3. Referral Model (`models/Referral.js`)

The Referral model manages the referral program.

**Fields:**
- `referrer` - Reference to referring User (required, indexed)
- `referred` - Reference to referred User
- `referralCode` - Unique code (required, unique, indexed)
- `referralLink` - Full referral URL (required)
- `status` - Enum: `pending`, `active`, `completed`, `cancelled` (indexed)
- `createdAt` - Creation timestamp (indexed)
- `completedAt` - When referral completed
- `activatedAt` - When referred user signed up
- `rewards` - Reward object:
  - `referrerReward` - Reward for referrer
  - `referredReward` - Reward for referred user
  - `rewardType` - Enum: `tokens`, `discount`, `points`, `both`
  - `rewardAmount` - Default reward (default: 100)
  - `referredRewardAmount` - Referred user reward (default: 50)
  - `claimed` - Whether claimed
  - `claimedAt` - Claim timestamp
- `stats` - Statistics:
  - `conversions` - Number of conversions
  - `clicks` - Link clicks
  - `signups` - Signups from this referral
  - `firstPurchase` - Whether referred user made first purchase
- `metadata` - IP address, user agent, UTM parameters
- `expiresAt` - Expiration date (default: 1 year)

**Indexes:**
- `{ referrer: 1, status: 1 }` - Referrer's referrals
- `{ referred: 1, status: 1 }` - Referred user lookups
- `{ referrer: 1, createdAt: -1 }` - Referrer timeline
- `{ status: 1, createdAt: -1 }` - Global status queries
- `{ expiresAt: 1 }` - Expiration queries

**Static Methods:**
- `generateReferralCode(userId)` - Generate unique code
- `createReferralCode(userId, baseUrl)` - Create new referral for user
- `getReferralByCode(code)` - Look up referral by code

**Instance Methods:**
- `activate(referredUserId)` - Activate referral for new user
- `complete()` - Mark referral as completed
- `claimRewards()` - Claim rewards for referral
- `trackClick(ipAddress, userAgent)` - Track link click
- `getStats()` - Get referral statistics

---

## API Endpoints

### Posts API

#### Create Post
```
POST /api/social/posts
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "Just completed my first transaction!",
  "type": "transaction",
  "visibility": "public",
  "metadata": {
    "amount": 100,
    "currency": "STRAT",
    "description": "Transfer"
  }
}

Response: 201 Created
{
  "success": true,
  "message": "Post created successfully",
  "post": { ... }
}
```

#### Get Global Feed
```
GET /api/social/posts?page=1&limit=20&type=general

Response: 200 OK
{
  "success": true,
  "posts": [ ... ],
  "pagination": {
    "current": 1,
    "pageSize": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### Get User Feed
```
GET /api/social/posts/feed?page=1&limit=20
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "posts": [ ... ],
  "pagination": { ... }
}
```

#### Get Trending Posts
```
GET /api/social/posts/trending?days=7&limit=10

Response: 200 OK
{
  "success": true,
  "posts": [ ... ],
  "metadata": {
    "trendingPeriod": "7 days",
    "count": 10
  }
}
```

#### Like Post
```
POST /api/social/posts/{postId}/like
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Post liked successfully",
  "likeCount": 42
}
```

#### Unlike Post
```
POST /api/social/posts/{postId}/unlike
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Post unliked successfully",
  "likeCount": 41
}
```

#### Add Comment
```
POST /api/social/posts/{postId}/comments
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "Great post!"
}

Response: 200 OK
{
  "success": true,
  "message": "Comment added successfully",
  "comment": { ... }
}
```

### Profile API

#### Get User Profile
```
GET /api/social/profile/{userId}

Response: 200 OK
{
  "success": true,
  "profile": {
    "id": "user_id",
    "username": "john_doe",
    "email": "john@example.com",
    "stats": {
      "postCount": 15,
      "achievementCount": 5,
      "totalPoints": 150,
      "referrals": { ... }
    }
  }
}
```

#### Get Own Profile
```
GET /api/social/profile
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "profile": { ... }
}
```

#### Update Profile
```
PUT /api/social/profile
Content-Type: application/json
Authorization: Bearer <token>

{
  "username": "new_username",
  "email": "newemail@example.com"
}

Response: 200 OK
{
  "success": true,
  "message": "Profile updated successfully",
  "user": { ... }
}
```

### Achievement API

#### Get Achievements
```
GET /api/social/achievements
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "achievements": [ ... ],
  "summary": {
    "total": 5,
    "totalPoints": 150,
    "rarityBreakdown": [
      { "_id": "rare", "count": 2 },
      { "_id": "uncommon", "count": 3 }
    ]
  }
}
```

#### Get User Achievements
```
GET /api/social/achievements/{userId}

Response: 200 OK
{
  "success": true,
  "achievements": [ ... ],
  "summary": { ... }
}
```

### Referral API

#### Get Referral Code
```
GET /api/social/referrals/code
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "referral": {
    "code": "ABC123XYZ456",
    "link": "https://strat.io/?ref=ABC123XYZ456",
    "createdAt": "2026-01-06T21:44:00Z"
  }
}
```

#### Track Referral
```
POST /api/social/referrals/track
Content-Type: application/json
Authorization: Bearer <token>

{
  "code": "ABC123XYZ456"
}

Response: 200 OK
{
  "success": true,
  "message": "Referral activated successfully",
  "referral": {
    "code": "ABC123XYZ456",
    "referrer": "referrer_user_id",
    "activatedAt": "2026-01-06T21:45:00Z"
  }
}
```

#### Get Referral Stats
```
GET /api/social/referrals/stats
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "stats": {
    "totalReferrals": 10,
    "activeReferrals": 8,
    "completedReferrals": 2,
    "pendingReferrals": 0,
    "totalClicks": 150,
    "totalSignups": 10,
    "totalRewardsEarned": 2000,
    "unclaimed": 1
  },
  "referralCode": "ABC123XYZ456",
  "referralLink": "https://strat.io/?ref=ABC123XYZ456"
}
```

### Leaderboard API

#### Get Leaderboard
```
GET /api/social/leaderboard?type=achievements&limit=10

Response: 200 OK
{
  "success": true,
  "title": "Achievement Points Leaderboard",
  "type": "achievements",
  "leaderboard": [
    {
      "_id": "user_id",
      "username": "top_user",
      "email": "top@example.com",
      "totalPoints": 5000,
      "achievementCount": 45,
      "lastAchievement": "2026-01-06T20:00:00Z"
    }
  ],
  "count": 10
}
```

**Leaderboard Types:**
- `achievements` - Ranked by achievement points
- `referrals` - Ranked by completed referrals

---

## Integration with Existing Systems

### User Model Enhancement

The social features integrate with the existing User model. Consider adding to `models/User.js`:

```javascript
profileStats: {
  totalPosts: Number,
  totalAchievements: Number,
  totalPoints: Number,
  referralCode: String,
  joinedCommunity: Date
}
```

### Transaction Reference

Posts can reference transactions:
```javascript
const post = new Post({
  user: userId,
  content: 'Just sent 100 STRAT to my friend!',
  type: 'transaction',
  relatedTransaction: transactionId
});
```

### Achievement Triggers

Trigger achievements from other controllers:

```javascript
// In transactionController.js
const Achievement = require('../models/Achievement');

if (transactionCount === 1) {
  const achievement = new Achievement({
    user: userId,
    type: 'first_transaction',
    title: 'First Transaction',
    description: 'Send your first STRAT transaction'
  });
  await achievement.save();
}
```

---

## Usage Examples

### Creating a Post After Transaction

```javascript
// In transactionController.js
const Post = require('../models/Post');

async function recordTransaction(userId, txHash, amount) {
  // ... transaction logic ...

  // Create social post
  const post = new Post({
    user: userId,
    content: `Sent ${amount} STRAT! 🎉`,
    type: 'transaction',
    relatedTransaction: txHash,
    visibility: 'public',
    metadata: {
      amount,
      currency: 'STRAT',
      description: 'Transfer'
    }
  });
  await post.save();
}
```

### Awarding Achievement

```javascript
// In stakingController.js
const Achievement = require('../models/Achievement');

async function completeStake(userId, stakeId) {
  const stakes = await Stake.find({ user: userId, status: 'completed' });

  // Check for milestone
  if (stakes.length === 1) {
    await Achievement.create({
      user: userId,
      type: 'first_stake',
      title: 'Staker',
      description: 'Complete your first stake',
      badge: {
        name: 'Staker Badge',
        color: '#FFD700',
        rarity: 'uncommon'
      },
      criteria: 'Complete a staking transaction',
      points: 25
    });
  }
}
```

### Processing Referral Reward

```javascript
// When referred user makes first transaction
async function claimReferralReward(referralCode) {
  const referral = await Referral.findOne({ referralCode });

  if (referral && referral.status === 'active') {
    await referral.complete();

    // Add tokens or points to referrer
    const referrer = await User.findById(referral.referrer);
    referrer.tokensEarned = (referrer.tokensEarned || 0) + 100;
    await referrer.save();
  }
}
```

---

## Database Considerations

### Indexes

All models include appropriate indexes for performance:
- User IDs and status fields are indexed
- Timestamps are indexed for sorting
- Unique fields like referral codes are indexed
- Array fields used in queries are indexed

### Data Cleanup

Consider periodic cleanup tasks:

```javascript
// Clean up expired referrals
async function cleanupExpiredReferrals() {
  await Referral.deleteMany({
    status: 'pending',
    expiresAt: { $lt: new Date() }
  });
}
```

### Scalability

For large-scale deployments:
1. Archive old posts monthly
2. Aggregate achievement data periodically
3. Cache leaderboard updates (update every hour)
4. Consider pagination limits for API responses

---

## Error Handling

All endpoints include proper error handling:
- 400: Bad Request (validation errors)
- 404: Not Found (missing resources)
- 409: Conflict (duplicate username/email)
- 500: Server Error

Example error response:
```json
{
  "error": "Post not found",
  "message": "The requested post does not exist"
}
```

---

## Security Considerations

1. **Authentication**: All write operations require authentication
2. **Authorization**: Users can only modify their own content
3. **Rate Limiting**: Apply rate limits to post/comment endpoints
4. **Input Validation**: All user input is validated and sanitized
5. **Visibility**: Private posts require proper access checks
6. **Unique Codes**: Referral codes are cryptographically generated

---

## Future Enhancements

1. **Comments on Comments**: Nested comment threads
2. **Notifications**: Real-time notifications for likes/comments
3. **Mentions**: @ mentions for tagging other users
4. **Hashtags**: Trending hashtag analytics
5. **Direct Messaging**: Private messaging between users
6. **Badges NFT**: Mint achievements as NFTs
7. **Reputation Score**: Dynamic user reputation system
8. **Content Moderation**: Admin tools for reporting/removing content

---

## Performance Tips

1. Use pagination: Limit feed queries to 20-50 items per page
2. Cache leaderboards: Update every 1-2 hours
3. Archive: Move old posts (>1 year) to archive collection
4. Indexing: Monitor slow queries with MongoDB profiler
5. Aggregation: Use aggregation pipeline for leaderboards

---

## Testing

Example test cases:

```javascript
describe('Social Features', () => {
  it('should create a post', async () => {
    const post = await Post.create({
      user: userId,
      content: 'Test post',
      type: 'general'
    });
    expect(post._id).toBeDefined();
  });

  it('should add like to post', async () => {
    const likeCount = await post.addLike(userId);
    expect(likeCount).toBe(1);
  });

  it('should create referral code', async () => {
    const referral = await Referral.createReferralCode(userId);
    expect(referral.referralCode).toMatch(/^[A-Z0-9]{12}$/);
  });

  it('should get user achievements', async () => {
    const achievements = await Achievement.getUserAchievements(userId);
    expect(Array.isArray(achievements)).toBe(true);
  });
});
```

---

## Version History

- **v1.0.0** - Initial social features release
  - Posts with comments and likes
  - Achievement system with points
  - Referral program
  - Leaderboards
  - User profiles

---

## Support & Documentation

For API reference and additional examples, see:
- `/routes/social.routes.js` - Route definitions
- `/controllers/socialController.js` - Controller implementations
- `/models/Post.js`, `/models/Achievement.js`, `/models/Referral.js` - Data models
