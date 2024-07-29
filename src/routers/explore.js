const express = require('express');
const router = new express.Router();
const Follow = require('../models/Follow');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
  region: process.env.BUCKET_REGION,
});
router.get('/explore', auth, async (req, res) => {
  try {
    await req.user.populate({ path: 'followings' });
    const followings = req.user.followings;
    const userIds = followings.map((following) => following.following);
    let suggestedUsers = await Follow.aggregate([
      {
        $match: {
          follower: { $in: userIds },
          following: { $nin: userIds.concat(req.user._id) },
        },
      },
      { $group: { _id: '$following', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    if (suggestedUsers.length === 0) {
      suggestedUsers = await User.find({
        _id: { $nin: userIds.concat(req.user._id) },
      });
    }
    const suggestedUserIds = suggestedUsers.map((user) => user._id);
    const posts = await Post.aggregate([
      { $match: { owner: { $in: suggestedUserIds } } },
      {
        $addFields: {
          rank: { $indexOfArray: [suggestedUserIds, '$owner'] },
        },
      },
      { $sort: { rank: 1, createdAt: -1 } },
      { $skip: req.query.skip ? parseInt(req.query.skip) : 0 },
      { $limit: req.query.limit ? parseInt(req.query.limit) : 10 },
    ]);
    const ownerIds = posts.map((post) => post.owner);
    const owners = await User.find(
      { _id: { $in: ownerIds } },
      'name username avatarURL'
    );

    const populatedPosts = posts.map((post) => {
      const owner = owners.find((owner) => owner._id.equals(post.owner));
      return { ...post, owner };
    });
    for (const index in populatedPosts) {
      if (populatedPosts[index].imageName) {
        populatedPosts[index].imageUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: populatedPosts[index].imageName,
          }),
          { expiresIn: 60 }
        );
      }
    }
    // console.log(populatedPosts)
    res.status(200).json(populatedPosts);
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
