# Social Features Implementation Guide

This guide shows you how to integrate social features into existing STRAT components and how to use the new APIs.

## Quick Start

The social features have been fully implemented and are ready to use. All files are in place:

- **Models**: `models/Post.js`, `models/Achievement.js`, `models/Referral.js`
- **Controller**: `controllers/socialController.js`
- **Routes**: `routes/social.routes.js`
- **Middleware**: Updated `middleware/validation.js` with social schemas
- **Server**: Updated `server.js` to include social routes at `/api/social`

## File Structure

```
STRAT/
├── models/
│   ├── Post.js          [NEW] Social feed posts
│   ├── Achievement.js   [NEW] User achievements and badges
│   ├── Referral.js      [NEW] Referral program
│   └── ... (existing models)
├── controllers/
│   ├── socialController.js [NEW] All social business logic
│   └── ... (existing controllers)
├── routes/
│   ├── social.routes.js [NEW] Social API endpoints
│   └── ... (existing routes)
├── middleware/
│   └── validation.js    [UPDATED] Added social schemas
├── server.js            [UPDATED] Registered social routes
└── SOCIAL_FEATURES.md   [NEW] Complete documentation
```

## API Overview

All endpoints are prefixed with `/api/social`:

### Posts (Social Feed)
- `POST /posts` - Create post (auth required)
- `GET /posts` - Get global feed
- `GET /posts/feed` - Get user's feed (auth required)
- `GET /posts/trending` - Get trending posts
- `POST /posts/:postId/like` - Like post (auth required)
- `POST /posts/:postId/unlike` - Unlike post (auth required)
- `POST /posts/:postId/comments` - Add comment (auth required)

### Profiles
- `GET /profile` - Get own profile (auth required)
- `GET /profile/:userId` - Get user profile
- `PUT /profile` - Update profile (auth required)

### Achievements
- `GET /achievements` - Get own achievements (auth required)
- `GET /achievements/:userId` - Get user's achievements

### Referrals
- `GET /referrals/code` - Get or create referral code (auth required)
- `POST /referrals/track` - Activate referral code (auth required)
- `GET /referrals/stats` - Get referral statistics (auth required)

### Leaderboards
- `GET /leaderboard?type=achievements&limit=10` - Get achievements leaderboard
- `GET /leaderboard?type=referrals&limit=10` - Get referrals leaderboard

## Integration Examples

### 1. Recording a Post After Transaction

In `controllers/transactionController.js`:

```javascript
const Post = require('../models/Post');

const sendTransaction = async (req, res) => {
  try {
    // ... existing transaction logic ...

    const transaction = await saveTransaction(req.body);

    // Create social post
    const post = new Post({
      user: req.user._id,
      content: `Successfully sent ${amount} STRAT! 🚀`,
      type: 'transaction',
      visibility: 'public',
      relatedTransaction: transaction._id,
      metadata: {
        amount: transaction.amount,
        currency: 'STRAT',
        description: `Transfer to ${transaction.toAddress.substring(0, 10)}...`
      }
    });

    await post.save();

    // ... rest of response ...
  } catch (error) {
    // ... error handling ...
  }
};
```

### 2. Awarding Achievements

In `controllers/stakingController.js`:

```javascript
const Achievement = require('../models/Achievement');
const Stake = require('../models/Stake');

const createStake = async (req, res) => {
  try {
    // ... existing stake logic ...

    const stake = new Stake({ /* ... */ });
    await stake.save();

    // Check if first stake
    const existingStakes = await Stake.countDocuments({
      user: req.user._id,
      status: { $in: ['active', 'completed'] }
    });

    if (existingStakes === 1) {
      // Award achievement
      await Achievement.create({
        user: req.user._id,
        type: 'first_stake',
        title: 'Staker',
        description: 'Complete your first staking transaction',
        badge: {
          name: 'Staker Badge',
          color: '#FFD700',
          rarity: 'uncommon'
        },
        criteria: 'Lock tokens for staking rewards',
        points: 25,
        rewards: {
          type: 'points',
          amount: 25
        }
      });
    }

    // ... rest of response ...
  } catch (error) {
    // ... error handling ...
  }
};
```

### 3. Claiming Referral Rewards

In `controllers/authController.js` (on user registration):

```javascript
const Referral = require('../models/Referral');

const register = async (req, res) => {
  try {
    const { email, username, password, referralCode } = req.body;

    // ... existing registration logic ...

    const user = new User({ email, username, password });
    await user.save();

    // If referral code provided, activate it
    if (referralCode) {
      const referral = await Referral.findOne({
        referralCode,
        status: 'pending'
      });

      if (referral) {
        await referral.activate(user._id);

        // Log referral event
        console.log(`User ${user.email} signed up via referral code: ${referralCode}`);
      }
    }

    // ... rest of response ...
  } catch (error) {
    // ... error handling ...
  }
};
```

### 4. Completing Referral on First Purchase

In `controllers/transactionController.js`:

```javascript
const Referral = require('../models/Referral');

const sendTransaction = async (req, res) => {
  try {
    // ... existing transaction logic ...

    const transaction = await saveTransaction(req.body);

    // Check if this is referred user's first transaction
    const txCount = await Transaction.countDocuments({
      user: req.user._id
    });

    if (txCount === 1) {
      // Find and complete referral
      const referral = await Referral.findOne({
        referred: req.user._id,
        status: 'active'
      });

      if (referral) {
        await referral.complete();

        // Award referrer tokens
        const referrer = await User.findById(referral.referrer);
        // Add token reward here

        console.log(`Referral completed for code: ${referral.referralCode}`);
      }
    }

    // ... rest of response ...
  } catch (error) {
    // ... error handling ...
  }
};
```

### 5. Creating Milestone Achievement

In `controllers/walletController.js`:

```javascript
const Achievement = require('../models/Achievement');
const Transaction = require('../models/Transaction');

const getWalletStats = async (req, res) => {
  try {
    const wallet = await Wallet.findById(req.params.id);

    // ... existing wallet logic ...

    // Check transaction milestone
    const txCount = await Transaction.countDocuments({
      user: req.user._id
    });

    // Award achievement every 10 transactions
    if (txCount % 10 === 0 && txCount > 0) {
      const hasAchievement = await Achievement.hasUserAchievement(
        req.user._id,
        `transaction_count_${txCount}`
      );

      if (!hasAchievement) {
        await Achievement.create({
          user: req.user._id,
          type: 'transaction_count',
          title: `${txCount} Transactions`,
          description: `You've completed ${txCount} transactions on STRAT!`,
          badge: {
            name: `${txCount} Transactions Badge`,
            color: '#00AA00',
            rarity: txCount > 50 ? 'epic' : 'rare'
          },
          criteria: `Complete ${txCount} transactions`,
          points: txCount / 10
        });
      }
    }

    // ... rest of response ...
  } catch (error) {
    // ... error handling ...
  }
};
```

## Client Integration Examples

### Creating a Post

```javascript
// POST /api/social/posts
const response = await fetch('/api/social/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    content: 'Just staked 1000 STRAT tokens! 🎯',
    type: 'achievement',
    visibility: 'public',
    metadata: {
      amount: 1000,
      currency: 'STRAT',
      tags: ['staking', 'rewards']
    }
  })
});

const data = await response.json();
console.log(data.post);
```

### Getting User Feed

```javascript
// GET /api/social/posts/feed
const response = await fetch('/api/social/posts/feed?page=1&limit=20', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { posts, pagination } = await response.json();
console.log(posts);
console.log(`Page ${pagination.current} of ${pagination.pages}`);
```

### Getting User Profile with Stats

```javascript
// GET /api/social/profile/:userId
const response = await fetch(`/api/social/profile/${userId}`);
const { profile } = await response.json();

console.log(`${profile.username} has ${profile.stats.totalPoints} achievement points`);
console.log(`${profile.stats.achievementCount} achievements`);
console.log(`${profile.stats.postCount} posts`);
```

### Getting Referral Code

```javascript
// GET /api/social/referrals/code
const response = await fetch('/api/social/referrals/code', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { referral } = await response.json();
console.log('Share this link:', referral.link);
```

### Getting Leaderboard

```javascript
// GET /api/social/leaderboard?type=achievements&limit=10
const response = await fetch('/api/social/leaderboard?type=achievements&limit=10');
const { leaderboard } = await response.json();

leaderboard.forEach((user, index) => {
  console.log(`${index + 1}. ${user.username} - ${user.totalPoints} points`);
});
```

## Data Flow Diagrams

### Post Creation Flow
```
User Action
    ↓
POST /api/social/posts
    ↓
Validate request (middleware)
    ↓
Create Post document
    ↓
Populate user reference
    ↓
Return created post
```

### Achievement Award Flow
```
User completes action (transaction, stake, etc.)
    ↓
Controller checks achievement conditions
    ↓
Check if user already has achievement
    ↓
If new, create Achievement document
    ↓
Create celebratory post (optional)
    ↓
Update user stats
```

### Referral Flow
```
User A generates referral code
    ↓
GET /api/social/referrals/code
    ↓
Create Referral with status='pending'
    ↓
Return referral code and link
    ↓
User B signs up with code
    ↓
POST /api/social/referrals/track
    ↓
Activate referral (status='active')
    ↓
User B makes first transaction
    ↓
Complete referral (status='completed')
    ↓
Award rewards to User A
```

## Testing the Social Features

### 1. Test Post Creation

```bash
curl -X POST http://localhost:3000/api/social/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "Testing social features!",
    "type": "general",
    "visibility": "public"
  }'
```

### 2. Test Global Feed

```bash
curl http://localhost:3000/api/social/posts?page=1&limit=10
```

### 3. Test Liking a Post

```bash
curl -X POST http://localhost:3000/api/social/posts/POST_ID/like \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Test Referral

```bash
# Get code
curl http://localhost:3000/api/social/referrals/code \
  -H "Authorization: Bearer YOUR_TOKEN"

# Activate referral
curl -X POST http://localhost:3000/api/social/referrals/track \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"code": "ABC123XYZ456"}'
```

### 5. Test Leaderboard

```bash
curl http://localhost:3000/api/social/leaderboard?type=achievements&limit=10
```

## Database Queries

### Get User's Achievements

```javascript
const Achievement = require('./models/Achievement');

const achievements = await Achievement.find({
  user: userId,
  visibility: true
}).sort({ earnedAt: -1 });
```

### Get Posts by Type

```javascript
const Post = require('./models/Post');

const transactionPosts = await Post.find({
  type: 'transaction',
  visibility: 'public'
}).sort({ createdAt: -1 }).limit(20);
```

### Get Top Referrers

```javascript
const Referral = require('./models/Referral');

const topReferrers = await Referral.getReferralLeaderboard(10);
```

### Get User's Total Points

```javascript
const Achievement = require('./models/Achievement');

const totalPoints = await Achievement.getUserTotalPoints(userId);
```

## Common Use Cases

### Use Case 1: Post After Every Transaction
Automatically create a post whenever user completes a transaction

### Use Case 2: Achievement Unlocked Notifications
Send notification when user earns new achievement

### Use Case 3: Viral Referral Program
Track referral metrics and surface top referrers

### Use Case 4: Gamification Leaderboard
Display achievement leaderboard on dashboard

### Use Case 5: Community Feed
Show trending posts in real-time on homepage

## Troubleshooting

### Issue: Posts not showing up
- Check visibility is 'public'
- Verify user is authenticated for user feed
- Check user reference exists

### Issue: Achievements not awarded
- Verify achievement type matches existing types
- Check user doesn't already have achievement
- Ensure Points calculation is correct

### Issue: Referral not activating
- Verify referral code exists and is pending
- Check user is not already referred
- Ensure code matches exactly

### Issue: Leaderboard empty
- Check achievements/referrals exist
- Verify visibility=true for achievements
- Check status values in referrals

## Performance Tips

1. **Index Optimization**: All models have optimal indexes
2. **Pagination**: Always use pagination for feeds (limit 20-50)
3. **Caching**: Cache leaderboards, update every 1-2 hours
4. **Aggregation**: Use aggregation pipeline for complex queries
5. **Archival**: Archive posts older than 1 year

## Next Steps

1. **Integrate with Transaction Controller** - Auto-create posts
2. **Add Achievement Triggers** - Award achievements based on actions
3. **Setup Referral Automation** - Integrate with signup flow
4. **Create Admin Dashboard** - Manage social content
5. **Add Notifications** - Real-time achievement/like alerts
6. **Implement Moderation** - Report/remove inappropriate content
7. **Add NFT Support** - Mint achievements as NFTs

## Support

For detailed API documentation, see `SOCIAL_FEATURES.md`.

For issues or questions, check the implementation in:
- `controllers/socialController.js` - Business logic
- `models/Post.js`, `Achievement.js`, `Referral.js` - Data models
- `routes/social.routes.js` - Endpoint definitions
