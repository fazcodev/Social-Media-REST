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
    // Fetch the list of userIds that the current user is following
    const followings = await Follow.find(
      { follower: req.user._id },
      'following'
    );
    const userIds = followings.map((following) => following.following);

    // Determine the query to fetch posts
    const postQuery =
      userIds.length === 0
        ? { owner: { $ne: req.user._id } } // If not following anyone, show all posts except user's own
        : { owner: { $in: userIds } }; // Otherwise, show posts from followed users

    // Fetch posts with pagination
    const posts = await Post.find(postQuery)
      .populate('owner', ['name', 'username', 'avatarURL', 'avatarKey'])
      .sort({ createdAt: -1 })
      .skip(parseInt(req.query.skip))
      .limit(parseInt(req.query.limit));

    // Enhance posts with signed URLs and like/save status
    const enhancedPosts = await Promise.all(
      posts.map(async (post) => {
        if (post.imageName) {
          post.imageUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({
              Bucket: process.env.BUCKET_NAME,
              Key: post.imageName,
            }),
            { expiresIn: 60 }
          );
        }
        if (post.owner.avatarKey) {
          post.owner.avatarURL = await getSignedUrl(
            s3,
            new GetObjectCommand({
              Bucket: process.env.BUCKET_NAME,
              Key: post.owner.avatarKey,
            }),
            { expiresIn: 60 * 60 * 24 * 7 }
          );
        }
        post.save();
        const [like, saved] = await Promise.all([
          Like.findOne({ post: post._id, user: req.user._id }),
          Saved.findOne({ post: post._id, user: req.user._id }),
        ]);

        post.isLiked = !!like;
        post.isSaved = !!saved;
        return post;
      })
    );

    res.status(200).json(enhancedPosts);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
