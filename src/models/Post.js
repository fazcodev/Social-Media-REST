const mongoose = require('mongoose');
const Like = require('./Like');
const User = require('./User');
const postSchema = mongoose.Schema(
  {
    description: {
      type: String,
      // required: true,
      trim: true,
    },
    imageName: {
      type: String,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    isLiked: {
      type: Boolean,
      default: false,
    },
    isSaved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

postSchema.virtual('likes', {
  ref: 'Like',
  localField: '_id',
  foreignField: 'post',
});

postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
});
postSchema.pre('save', async function (next) {
  const post = this;
  next();
});
postSchema.pre('remove', async function (next) {
  const post = this;
  await Like.deleteMany({ post: post._id });
  await Comment.deleteMany({ post: post._id });
  next();
});
const Post = mongoose.model('Post', postSchema);
module.exports = Post;
