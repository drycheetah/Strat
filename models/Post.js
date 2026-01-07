const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  type: {
    type: String,
    enum: ['transaction', 'achievement', 'general', 'milestone'],
    default: 'general',
    index: true
  },
  // Optional transaction reference
  relatedTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  // Optional achievement reference
  relatedAchievement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement'
  },
  metadata: {
    amount: Number,
    currency: String,
    description: String,
    tags: [String]
  },
  likes: {
    count: {
      type: Number,
      default: 0,
      min: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    likes: {
      type: Number,
      default: 0,
      min: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  visibility: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for feed queries
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ type: 1, createdAt: -1 });
postSchema.index({ 'likes.users': 1 });
postSchema.index({ visibility: 1, createdAt: -1 });

/**
 * Add like to post
 */
postSchema.methods.addLike = async function(userId) {
  if (!this.likes.users.includes(userId)) {
    this.likes.users.push(userId);
    this.likes.count += 1;
    await this.save();
  }
  return this.likes.count;
};

/**
 * Remove like from post
 */
postSchema.methods.removeLike = async function(userId) {
  const index = this.likes.users.indexOf(userId);
  if (index > -1) {
    this.likes.users.splice(index, 1);
    this.likes.count = Math.max(0, this.likes.count - 1);
    await this.save();
  }
  return this.likes.count;
};

/**
 * Add comment to post
 */
postSchema.methods.addComment = async function(userId, content) {
  const comment = {
    user: userId,
    content,
    createdAt: new Date()
  };
  this.comments.push(comment);
  await this.save();
  return comment;
};

/**
 * Remove comment from post
 */
postSchema.methods.removeComment = async function(commentId) {
  this.comments = this.comments.filter(c => c._id.toString() !== commentId.toString());
  await this.save();
  return this.comments;
};

/**
 * Get post with populated user info
 */
postSchema.statics.getPostWithDetails = async function(postId) {
  return await this.findById(postId)
    .populate('user', 'username email')
    .populate('comments.user', 'username')
    .populate('relatedAchievement')
    .lean();
};

/**
 * Get user feed
 */
postSchema.statics.getUserFeed = async function(userId, limit = 20, skip = 0) {
  return await this.find({ user: userId, visibility: { $in: ['public', 'friends'] } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'username email')
    .populate('comments.user', 'username')
    .lean();
};

/**
 * Get global feed
 */
postSchema.statics.getGlobalFeed = async function(limit = 20, skip = 0, filter = {}) {
  const query = { visibility: 'public', ...filter };
  return await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'username email')
    .populate('comments.user', 'username')
    .lean();
};

/**
 * Get trending posts
 */
postSchema.statics.getTrendingPosts = async function(days = 7, limit = 10) {
  const dateFilter = new Date();
  dateFilter.setDate(dateFilter.getDate() - days);

  return await this.find({
    visibility: 'public',
    createdAt: { $gte: dateFilter }
  })
    .sort({ 'likes.count': -1, createdAt: -1 })
    .limit(limit)
    .populate('user', 'username email')
    .lean();
};

module.exports = mongoose.model('Post', postSchema);
