const mongoose = require('mongoose');

const likeSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Post',
    },
  },
  {
    timestamps: true,
  }
);
likeSchema.index({ user: 1, post: 1 }, { unique: true });

const Like = mongoose.model('Like', likeSchema);

module.exports = Like;
