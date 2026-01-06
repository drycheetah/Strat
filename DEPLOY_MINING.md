# 🚀 Deploy Mining Features to Railway

You need to deploy the new mining endpoints to your Railway server so the standalone miner can connect.

## 📋 Files to Deploy

The following new files need to be pushed to Railway:

1. **routes/mining.routes.js** - Mining API routes
2. **controllers/miningController.js** - Mining controller logic
3. **server.js** - Updated to include mining routes
4. **strat-miner.js** - Standalone miner (optional, for users to download)
5. **MINING.md** - Mining documentation

## 🔧 Deployment Steps

### Option 1: Git Push (Recommended)

```bash
# Stage all new files
git add routes/mining.routes.js
git add controllers/miningController.js
git add server.js
git add strat-miner.js
git add MINING.md

# Commit the changes
git commit -m "Add standalone mining support with external miner API endpoints"

# Push to your Railway-connected branch
git push origin main
```

Railway will automatically detect the push and redeploy your application.

### Option 2: Railway CLI

```bash
# Install Railway CLI if you haven't
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project (if not already linked)
railway link

# Deploy
railway up
```

## ✅ Verify Deployment

After deployment, test that the mining endpoints are working:

```bash
# Test mining work endpoint
curl "https://strat-production.up.railway.app/api/mining/work?address=STRAT54c3ca56ddf3ea43d6b0ffb5b4f8ee524ceb"

# Expected response:
# {
#   "success": true,
#   "block": { ... },
#   "difficulty": 4,
#   "reward": 1,
#   ...
# }
```

```bash
# Test mining stats
curl "https://strat-production.up.railway.app/api/mining/stats"

# Expected response:
# {
#   "success": true,
#   "stats": {
#     "difficulty": 4,
#     "blockHeight": 75,
#     ...
#   }
# }
```

## 🎮 Test the Miner

Once deployed, users can start mining:

```bash
node strat-miner.js --address STRAT54c3ca56ddf3ea43d6b0ffb5b4f8ee524ceb
```

Or with multiple threads for better performance:

```bash
node strat-miner.js --address STRAT54c3ca56ddf3ea43d6b0ffb5b4f8ee524ceb --threads 4
```

## 📦 Distributing the Miner

To let users download and run the miner:

### 1. Host the miner file on your website

Add to your public folder or create a download link:

```bash
# Copy miner to public downloads folder
cp strat-miner.js public/downloads/strat-miner.js
cp MINING.md public/downloads/MINING.md
```

### 2. Add download link to your website

```html
<a href="/downloads/strat-miner.js" download>
  Download STRAT Miner
</a>
```

### 3. Create a GitHub repository (Optional)

Create a separate repo for the miner so users can clone it:

```bash
# Create new directory for miner distribution
mkdir strat-miner-standalone
cd strat-miner-standalone

# Copy files
cp ../strat-miner.js .
cp ../MINING.md README.md
cp ../miner-package.json package.json

# Initialize git
git init
git add .
git commit -m "Initial release of STRAT standalone miner"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/strat-miner.git
git push -u origin main
```

Then users can clone and run:

```bash
git clone https://github.com/YOUR_USERNAME/strat-miner.git
cd strat-miner
node strat-miner.js --address THEIR_ADDRESS
```

## 🔍 Troubleshooting

### Mining endpoints return 404

- Make sure you pushed the new code to Railway
- Check Railway logs: `railway logs`
- Verify server.js includes the mining routes

### Miner can't connect

- Check the API_URL in strat-miner.js matches your Railway URL
- Test endpoints manually with curl
- Check CORS settings if running from browser

### No blocks being found

- This is normal! Mining is competitive
- Lower difficulty = easier to find blocks
- Try running with more threads: `--threads 8`

## 📊 Monitor Mining Activity

Check who's mining and how much they've earned:

```bash
# Get earnings for a wallet
curl "https://strat-production.up.railway.app/api/mining/earnings/STRAT54c3ca56ddf3ea43d6b0ffb5b4f8ee524ceb"

# Get network mining stats
curl "https://strat-production.up.railway.app/api/mining/stats"
```

## 🎯 Next Steps

After deployment:

1. ✅ Test mining endpoints
2. ✅ Run the miner yourself to verify it works
3. ✅ Add mining documentation to your website
4. ✅ Share the miner with your community
5. ✅ Monitor mining activity in Railway logs

---

**Ready to deploy? Run these commands:**

```bash
git add .
git commit -m "Add standalone mining support"
git push origin main
```

Then wait 2-3 minutes for Railway to redeploy, and test with:

```bash
node strat-miner.js --address STRAT54c3ca56ddf3ea43d6b0ffb5b4f8ee524ceb
```
