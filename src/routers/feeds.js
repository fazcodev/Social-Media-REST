const express = require('express');
const router = new express.Router();
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const Like = require('../models/Like');
const Saved = require('../models/Saved');
const auth = require('../middleware/auth');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand, S3Client } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
  region: process.env.BUCKET_REGION,
});

router.get('/feeds', auth, async (req, res) => {
  try {
    const followings = await Follow.find(
      { follower: req.user._id },
      'following'
    );
    const userIds = followings.map((following) => following.following);

    let posts;
    if (userIds.length === 0) {
      // If user is not following anyone then show all posts except user's own posts
      posts = await Post.find({ owner: { $ne: req.user._id } })
        .populate('owner', ['name', 'username', 'avatarURL'])
        .sort({ createdAt: -1 })
        .skip(parseInt(req.query.skip))
        .limit(parseInt(req.query.limit));
    } else {
      posts = await Post.find({ owner: { $in: userIds } })
        .populate('owner', ['name', 'username', 'avatarURL'])
        .sort({ createdAt: -1 })
        .skip(parseInt(req.query.skip))
        .limit(parseInt(req.query.limit));
    }
    for (const index in posts) {
      if (posts[index].imageName) {
        posts[index].imageUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: posts[index].imageName,
          }),
          { expiresIn: 60 }
        );
        const like = await Like.findOne({
          post: posts[index]._id,
          user: req.user._id,
        });
        const saved = await Saved.findOne({
          post: posts[index]._id,
          user: req.user._id,
        });
        posts[index].isLiked = like ? true : false;
        posts[index].isSaved = saved ? true : false;
      }
    }
    res.status(200).json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
