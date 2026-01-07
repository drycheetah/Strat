# Social Features - Quick Reference Card

## API Base URL
```
/api/social
```

## Authentication
```
Authorization: Bearer <JWT_TOKEN>
```

---

## POSTS API

### Create Post
```
POST /posts
Auth: Required
Body: {
  "content": "string (1-5000 chars)",
  "type": "transaction|achievement|general|milestone",
  "visibility": "public|friends|private",
  "metadata": { optional }
}
```

### Get Global Feed
```
GET /posts?page=1&limit=20&type=general
```

### Get User Feed
```
GET /posts/feed?page=1&limit=20
Auth: Required
```

### Get Trending Posts
```
GET /posts/trending?days=7&limit=10
```

### Like Post
```
POST /posts/{postId}/like
Auth: Required
```

### Unlike Post
```
POST /posts/{postId}/unlike
Auth: Required
```

### Add Comment
```
POST /posts/{postId}/comments
Auth: Required
Body: { "content": "string (1-1000 chars)" }
```

---

## PROFILE API

### Get Own Profile
```
GET /profile
Auth: Required
```

### Get User Profile
```
GET /profile/{userId}
```

### Update Profile
```
PUT /profile
Auth: Required
Body: {
  "username": "string (3-30 chars, optional)",
  "email": "string (valid email, optional)"
}
```

---

## ACHIEVEMENTS API

### Get Own Achievements
```
GET /achievements
Auth: Required
Response: {
  achievements: [{type, title, points, earnedAt, ...}],
  summary: {total, totalPoints, rarityBreakdown}
}
```

### Get User Achievements
```
GET /achievements/{userId}
```

---

## REFERRAL API

### Get Referral Code
```
GET /referrals/code
Auth: Required
Response: {
  code: "ABC123XYZ456",
  link: "https://strat.io/?ref=ABC123XYZ456",
  createdAt: "2026-01-06T..."
}
```

### Track Referral (Activate)
```
POST /referrals/track
Auth: Required
Body: { "code": "ABC123XYZ456" }
```

### Get Referral Stats
```
GET /referrals/stats
Auth: Required
Response: {
  stats: {
    totalReferrals: 10,
    activeReferrals: 8,
    completedReferrals: 2,
    totalRewardsEarned: 2000
  },
  referralCode: "ABC123XYZ456",
  referralLink: "https://..."
}
```

---

## LEADERBOARD API

### Get Achievements Leaderboard
```
GET /leaderboard?type=achievements&limit=10
Response: [{username, email, totalPoints, achievementCount}]
```

### Get Referrals Leaderboard
```
GET /leaderboard?type=referrals&limit=10
Response: [{username, email, totalReferrals, completedReferrals}]
```

---

## DATA MODELS

### Post
```
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  content: String,
  type: 'transaction'|'achievement'|'general'|'milestone',
  likes: { count: Number, users: [ObjectId] },
  comments: [{ user: ObjectId, content: String, likes: Number }],
  visibility: 'public'|'friends'|'private',
  metadata: Mixed,
  createdAt: Date,
  updatedAt: Date
}
```

### Achievement
```
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  type: 'first_transaction'|...,
  title: String,
  description: String,
  badge: { name, color, rarity },
  points: Number,
  earnedAt: Date,
  visibility: Boolean,
  createdAt: Date
}
```

### Referral
```
{
  _id: ObjectId,
  referrer: ObjectId (ref: User),
  referred: ObjectId (ref: User),
  referralCode: String (unique),
  referralLink: String,
  status: 'pending'|'active'|'completed'|'cancelled',
  rewards: { referrerReward, referredReward, claimed },
  stats: { clicks, signups, conversions },
  createdAt: Date
}
```

---

## COMMON PATTERNS

### Check if User Liked Post
```javascript
const hasLiked = post.likes.users.includes(userId);
```

### Get User's Public Posts
```javascript
const posts = await Post.find({
  user: userId,
  visibility: 'public'
}).sort({ createdAt: -1 });
```

### Get User Total Points
```javascript
const points = await Achievement.getUserTotalPoints(userId);
```

### Create Post After Transaction
```javascript
const post = new Post({
  user: userId,
  content: `Sent ${amount} STRAT!`,
  type: 'transaction',
  visibility: 'public',
  metadata: { amount, currency: 'STRAT' }
});
await post.save();
```

### Award Achievement
```javascript
const achievement = await Achievement.create({
  user: userId,
  type: 'first_transaction',
  title: 'First Transaction',
  points: 10
});
```

### Get Referral by Code
```javascript
const referral = await Referral.getReferralByCode(code);
```

---

## HTTP STATUS CODES

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Server Error |

---

## ACHIEVEMENT TYPES

- `first_transaction` - Complete first transaction
- `first_stake` - Complete first stake
- `first_mining` - Complete first mining reward
- `portfolio_milestone` - Reach portfolio value milestone
- `wallet_creator` - Create first wallet
- `transaction_count` - Complete X transactions
- `staking_milestone` - Stake X tokens
- `trading_volume` - Trade X volume
- `referral_milestone` - Refer X users
- `community_contributor` - Community activity

---

## BADGE RARITIES

```
common      (1-3 stars)  🌟
uncommon    (3-5 stars)  🌟🌟
rare        (5-8 stars)  🌟🌟🌟
epic        (8-12 stars) 🌟🌟🌟🌟
legendary   (12+ stars)  🌟🌟🌟🌟🌟
```

---

## ERROR RESPONSE FORMAT

```json
{
  "error": "Error type",
  "message": "Detailed message"
}
```

Or for validation errors:

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "content", "message": "required" }
  ]
}
```

---

## TESTING ENDPOINTS

### Create Post (curl)
```bash
curl -X POST http://localhost:3000/api/social/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"content":"Test post","type":"general"}'
```

### Get Feed (curl)
```bash
curl http://localhost:3000/api/social/posts?page=1&limit=10
```

### Get Leaderboard (curl)
```bash
curl http://localhost:3000/api/social/leaderboard?type=achievements&limit=10
```

### Like Post (curl)
```bash
curl -X POST http://localhost:3000/api/social/posts/POST_ID/like \
  -H "Authorization: Bearer TOKEN"
```

---

## PAGINATION

All list endpoints support pagination:

```
page: Current page (default: 1)
limit: Items per page (default: 20, max: 100)
```

Response includes:

```json
{
  "posts": [...],
  "pagination": {
    "current": 1,
    "pageSize": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## FILES CREATED

| File | Size | Purpose |
|------|------|---------|
| models/Post.js | 4.2K | Social feed posts |
| models/Achievement.js | 4.1K | User achievements |
| models/Referral.js | 6.3K | Referral program |
| controllers/socialController.js | 14K | Business logic |
| routes/social.routes.js | 1.7K | API endpoints |
| SOCIAL_FEATURES.md | 17K | Complete documentation |
| SOCIAL_IMPLEMENTATION_GUIDE.md | 15K | Integration guide |
| SOCIAL_FEATURES_SUMMARY.md | 12K | Summary |
| SOCIAL_QUICK_REFERENCE.md | This file | Quick reference |

---

## VALIDATION RULES

### Post Content
- Min: 1 character
- Max: 5000 characters

### Comment Content
- Min: 1 character
- Max: 1000 characters

### Username
- Pattern: Alphanumeric only
- Min: 3 characters
- Max: 30 characters

### Email
- Must be valid email format

### Referral Code
- Length: 12 characters
- Pattern: [A-Z0-9]{12}
- Must be unique

---

## INTEGRATION CHECKLIST

- [ ] Import models in controllers where needed
- [ ] Add achievement triggers to transaction/staking controllers
- [ ] Add auto-post creation after significant user actions
- [ ] Integrate referral tracking with signup flow
- [ ] Setup frontend components for social features
- [ ] Configure achievement reward amounts
- [ ] Setup notifications for achievements/posts
- [ ] Add admin tools for content moderation
- [ ] Monitor database performance with queries
- [ ] Setup caching for leaderboards

---

## VERSION INFO

**Social Features Version**: 1.0.0
**Release Date**: January 6, 2026
**Status**: Production Ready

---

**For detailed documentation, see:**
- SOCIAL_FEATURES.md - Complete API reference
- SOCIAL_IMPLEMENTATION_GUIDE.md - Integration examples
