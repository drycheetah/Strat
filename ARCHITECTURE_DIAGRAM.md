# STRAT Social Features - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT APPLICATIONS                         │
│                  (Web, Mobile, Desktop)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ HTTP/REST
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     EXPRESS.JS SERVER                            │
│                    (server.js:221-222)                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌────────────┐   ┌─────────────┐   ┌─────────────┐
   │   Auth     │   │  Social     │   │  Other APIs │
   │  Routes    │   │  Routes     │   │   Routes    │
   │            │   │ (NEW)       │   │             │
   └────────────┘   └──────┬──────┘   └─────────────┘
                           │
                           ▼ 16 endpoints
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌──────▼──────┐    ┌─────▼─────┐
   │ Posts   │      │Achievement │    │ Referral  │
   │Routes   │      │ Routes      │    │ Routes    │
   │(7)      │      │ (2)         │    │ (4)       │
   └────┬────┘      └──────┬──────┘    └─────┬─────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                ┌──────────▼──────────┐
                │ socialController.js │
                │   (13 functions)    │
                └──────────┬──────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌──────▼──────┐    ┌─────▼─────┐
   │  Post   │      │Achievement  │    │ Referral  │
   │ Model   │      │   Model     │    │  Model    │
   │ (196L)  │      │  (188L)     │    │ (276L)    │
   └────┬────┘      └──────┬──────┘    └─────┬─────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    MONGODB DATABASE                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Collections:                                             │  │
│  │  • posts (with likes, comments)                          │  │
│  │  • achievements (with badge data)                        │  │
│  │  • referrals (with reward tracking)                      │  │
│  │  • users (existing, linked via references)              │  │
│  │  • wallets (existing, linked via references)            │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Post Creation Flow

```
User Action (Frontend)
         │
         ▼
┌─────────────────────────┐
│ POST /api/social/posts  │
│ + Auth Token            │
│ + Content               │
│ + Type                  │
│ + Visibility            │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ socialController.js     │
│ createPost()            │
│ - Validate input        │
│ - Check auth            │
│ - Trim content          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Post.create()           │
│ - Insert to DB          │
│ - Save timestamps       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Populate refs & return  │
│ 201 Created             │
│ + Post data             │
└────────┬────────────────┘
         │
         ▼
Frontend (Display post)
```

### 2. Achievement Award Flow

```
User Completes Action
(Transaction, Stake, etc.)
         │
         ▼
Existing Controller
(Transaction, Staking, etc.)
         │
         ▼
┌──────────────────────────┐
│ Check Achievement Criteria│
│ COUNT transactions       │
│ CHECK amount staked      │
│ VERIFY volume threshold  │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Achievement.find()       │
│ Check if already awarded │
└────────┬─────────────────┘
         │
         ├─ Already exists? ─> Log & Return
         │
         └─ Not exists? ─────▶ CREATE
                              │
                              ▼
                        ┌──────────────────┐
                        │Achievement.create│
                        │- Set type        │
                        │- Set title       │
                        │- Set points      │
                        │- Set earnedAt    │
                        └──────┬───────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ Optional: Create │
                        │ celebratory post │
                        │ type:'achievement│
                        └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ Update user stats │
                        │ totalPoints += 10│
                        └──────────────────┘
```

### 3. Referral Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    REFERRAL LIFECYCLE                            │
└─────────────────────────────────────────────────────────────────┘

STEP 1: CODE GENERATION
┌─────────────────────────┐
│ User A: GET /code       │
│ Auth Required           │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ generateReferralCode()  │
│ Create 12-char code     │
│ Generate link           │
│ Status: PENDING         │
└────────┬────────────────┘
         │
         ▼
Return Code & Link to User A


STEP 2: CODE ACTIVATION
┌─────────────────────────┐
│ User B: Signup with code│
│ POST /referrals/track   │
│ { code: "..." }         │
│ Auth Required (new user)│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Referral.findOne({code})│
│ Check status == PENDING │
│ Check no referred user  │
└────────┬────────────────┘
         │
         ├─ Invalid? ─────────> 400 Error
         │
         └─ Valid? ────────────▶ activate()
                                │
                                ▼
                          ┌─────────────────┐
                          │ Status: ACTIVE  │
                          │ referred: UserB │
                          │ activatedAt: now│
                          │ signups++       │
                          └────────┬────────┘
                                   │
                                   ▼
                          Return Success


STEP 3: COMPLETION (First Purchase)
┌─────────────────────────┐
│ User B: First Transaction│
│ POST /api/transactions/ │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ transactionController   │
│ - Process transaction   │
│ - Find referral record  │
│ - Check if first tx     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ referral.complete()     │
│ Status: COMPLETED       │
│ completedAt: now        │
│ conversions++           │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Award rewards to User A │
│ + tokens or points      │
│ + reputation boost      │
└─────────────────────────┘


STEP 4: CLAIM REWARDS
┌─────────────────────────┐
│ User A: GET /stats      │
│ View completion status  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ referral.claimRewards() │
│ rewards.claimed = true  │
│ claimedAt: now          │
└────────┬────────────────┘
         │
         ▼
Transfer tokens to User A account
```

### 4. Data Relationships

```
┌──────────────┐
│    User      │
│   (_id)      │
└──────┬───────┘
       │
       │ references to
       │
   ┌───┼─────────────────┐
   │   │                 │
   ▼   ▼                 ▼
┌──────────┐    ┌──────────────┐    ┌───────────┐
│  Posts   │    │Achievements  │    │Referrals  │
│          │    │              │    │           │
│ user_id  │    │ user_id      │    │referrer_id│
│ comments │    │ type         │    │referred_id│
│ likes[]  │    │ points       │    │status     │
└──────────┘    │ earnedAt     │    │rewards    │
                └──────────────┘    └───────────┘
                      │
                      │ can link to
                      │
            ┌─────────┘
            │
            ▼
    ┌──────────────┐
    │Transactions  │
    │(existing)    │
    └──────────────┘
```

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOCIAL CONTROLLER                            │
│                (socialController.js - 574 lines)                │
└─────────────────────────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
    ┌─────────┐           ┌──────────────┐       ┌──────────┐
    │ Post    │           │Achievement   │       │Referral  │
    │Methods  │           │ Methods      │       │Methods   │
    ├─────────┤           ├──────────────┤       ├──────────┤
    │create   │           │create        │       │create    │
    │read     │           │read          │       │read      │
    │update   │           │update        │       │update    │
    │delete   │           │award         │       │activate  │
    │like     │           │leaderboard   │       │complete  │
    │comment  │           │track         │       │claim     │
    │trending │           │              │       │          │
    │feed     │           │              │       │          │
    └────┬────┘           └──────┬───────┘       └────┬─────┘
         │                      │                     │
         │ MongoDB Operations   │                     │
         │                      │                     │
         └──────────────────────┼─────────────────────┘
                                │
                 ┌──────────────▼──────────────┐
                 │     MONGODB COLLECTIONS    │
                 ├────────────────────────────┤
                 │ posts       (indexed)      │
                 │ achievements (indexed)     │
                 │ referrals    (indexed)     │
                 │ users        (existing)    │
                 └────────────────────────────┘
```

## API Gateway Flow

```
┌──────────────────────────────────────────────────────────────┐
│              REQUEST ARRIVES AT SERVER                        │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │  Middleware Checks     │
            ├────────────────────────┤
            │ 1. DDoS Protection    │
            │ 2. CORS Headers       │
            │ 3. Body Parser        │
            │ 4. Request Logger     │
            └────────┬───────────────┘
                     │
                     ▼
            ┌────────────────────────┐
            │  Route Matching        │
            │  /api/social/*         │
            └────────┬───────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
┌─────────┐    ┌──────────┐    ┌──────────────┐
│ /posts  │    │/profile  │    │/achievements │
│ /        │    │/         │    │/ /leaderboard│
└────┬────┘    └────┬─────┘    └───┬──────────┘
     │              │              │
     ▼              ▼              ▼
┌───────────────────────────────────────┐
│    AUTHENTICATION CHECK               │
│    (for protected routes)             │
├───────────────────────────────────────┤
│ 1. Verify JWT Token                  │
│ 2. Load req.user from DB             │
│ 3. Check user is verified            │
└──────┬────────────────────────────────┘
       │
       ▼
┌───────────────────────────────────────┐
│    VALIDATION CHECK                   │
│    (Joi Schemas)                      │
├───────────────────────────────────────┤
│ 1. Validate request body              │
│ 2. Check field types                  │
│ 3. Check field lengths                │
│ 4. Validate enum values               │
└──────┬────────────────────────────────┘
       │
       ├─ Validation fails? ──> 400 Error
       │
       └─ Valid? ─────────────▶ Controller
                              │
                              ▼
                    ┌─────────────────┐
                    │ socialController│
                    │ function call   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Model operation │
                    │ (MongoDB)       │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Format response │
                    │ + status code   │
                    │ + data/message  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Send to client  │
                    │ JSON response   │
                    └─────────────────┘
```

## Database Schema Relationships

```
MongoDB Collections:

USERS Collection
┌──────────────────────┐
│ _id: ObjectId        │
│ username: String     │
│ email: String        │
│ password: Hash       │
│ ... other fields     │
└──────────────────────┘
       ▲                ▲                    ▲
       │                │                    │
    1:many            1:many               1:many
       │                │                    │
       │                │                    │
POSTS Collection    ACHIEVEMENTS         REFERRALS
┌─────────────┐    Collection           Collection
│ _id: OId    │    ┌──────────────┐    ┌──────────┐
│ user: OId ──┼───>│ _id: OId    │    │ referrer │
│ content: S  │    │ user: OId ──┼───>│ _id: OId │
│ likes:      │    │ earnedAt: D  │    │ referred │
│  users: [BI]│    │ points: N   │    │ code: S  │
│ comments: [{│    └──────────────┘    └──────────┘
│  user: OId,│           │                   │
│  content   │           │                   │
│ }]         │           │ (optional)        │
│ createdAt  │           │                   │
└─────────────┘    ┌──────▼──────┐   ┌──────▼────┐
       │           │TRANSACTIONS │   │ WALLETS   │
       └───────────>│(existing)   │   │(existing) │
         (optional) └─────────────┘   └───────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                         │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                      LOAD BALANCER                              │
│                   (Optional for scale)                          │
└────────────────┬─────────────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────────┐┌────────────┐┌────────────┐
│   Node.js  ││   Node.js  ││   Node.js  │
│  Server 1  ││  Server 2  ││  Server N  │
│            ││            ││            │
│ Express.js ││ Express.js ││ Express.js │
│   Social   ││   Social   ││   Social   │
│  Routes    ││  Routes    ││  Routes    │
└────┬───────┘└────┬───────┘└────┬───────┘
     │             │             │
     └─────────────┼─────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │    MongoDB Cluster           │
    │  (Replica Set for HA)        │
    ├──────────────────────────────┤
    │ Primary (writes)             │
    │ Secondary 1 (reads)          │
    │ Secondary 2 (reads)          │
    │ Arbiter (voting)             │
    └──────────────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │    Data Backup Services      │
    │  (S3, backup replicas)       │
    └──────────────────────────────┘
```

## Security Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   SECURITY LAYERS                            │
└──────────────────────────────────────────────────────────────┘

Layer 1: Transport
┌─────────────────────────────────────────┐
│ HTTPS/TLS Encryption                    │
│ Certificate validation                  │
└──────────────────────────────────────────┘
           │
           ▼

Layer 2: API Gateway
┌──────────────────────────────────────────┐
│ Rate Limiting                            │
│ DDoS Protection                          │
│ IP Whitelisting (optional)               │
└──────────────────────────────────────────┘
           │
           ▼

Layer 3: Authentication
┌──────────────────────────────────────────┐
│ JWT Token Validation                     │
│ Signature verification                   │
│ Expiration checking                      │
└──────────────────────────────────────────┘
           │
           ▼

Layer 4: Authorization
┌──────────────────────────────────────────┐
│ Route protection (@authenticate)         │
│ User ownership verification              │
│ Role-based access control                │
└──────────────────────────────────────────┘
           │
           ▼

Layer 5: Input Validation
┌──────────────────────────────────────────┐
│ Joi schema validation                    │
│ Type checking                            │
│ Length limits                            │
│ Pattern matching                         │
└──────────────────────────────────────────┘
           │
           ▼

Layer 6: Database Security
┌──────────────────────────────────────────┐
│ Connection string encryption             │
│ Index optimizations                      │
│ Query parameter binding                  │
│ Least privilege accounts                 │
└──────────────────────────────────────────┘
```

---

This architecture provides a scalable, secure, and maintainable implementation of the STRAT social features.
