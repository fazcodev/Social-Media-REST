const express = require('express');
const auth = require('../middleware/auth');
const uploadImage = require('../middleware/uploadImage');
const Post = require('../models/Post');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Saved = require('../models/Saved');
const router = new express.Router();
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

router.post('/posts', uploadImage.single('image'), auth, async (req, res) => {
  const post = new Post({
    ...req.body,
    owner: req.user._id,
  });
  if (req.file) {
    post.imageName = req.file.key;
    post.imageUrl = req.file.location;
  }
  try {
    await post.save();
    await User.findOneAndUpdate(
      { _id: req.user._id },
      { $inc: { postsCnt: 1 } }
    );
    res.status(201).json(post);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/:username/posts', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    // populate posts with user info only name and username and avatarURL
    await user.populate({
      path: 'posts',
      populate: { path: 'owner', select: 'name username avatarKey' },
      sort: { createdAt: -1 },
      skip: req.query.skip ? parseInt(req.query.skip, 10) : 0,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 3,
    });
    const posts = [];
    // eslint-disable-next-line guard-for-in
    for (const index in user.posts) {
      const post = user.posts[index].toObject();
      if (post.imageName) {
        post.imageUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: post.imageName,
          }),
          { expiresIn: 60 * 10 }
        );
        const [like, saved] = await Promise.all([
          Like.findOne({
            post: post._id,
            user: user._id, // Revert to user._id as route is public (no auth)
          }),
          Saved.findOne({
            post: post._id,
            user: user._id,
          }),
        ]);
        post.isLiked = !!like;
        post.isSaved = !!saved;
      }
      posts.push(post);
    }
    res.status(200).json(posts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/posts/:id', auth, async (req, res) => {
  const _id = req.params.id;
  try {
    const postdoc = await Post.findById(_id);
    if (!postdoc) {
      return res.status(404).json({ error: 'Post not found' });
    }
    // if found populate post with user info only name and username
    await postdoc.populate({
      path: 'owner',
      select: 'name username avatarKey',
    });
    const post = postdoc.toObject();
    if (post.imageName) {
      post.imageUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: post.imageName,
        }),
        { expiresIn: 3600 }
      );
    }
    const [like, saved] = await Promise.all([
      Like.findOne({
        post: post._id,
        user: req.user._id,
      }),
      Saved.findOne({
        post: post._id,
        user: req.user._id,
      }),
    ]);
    post.isLiked = !!like;
    post.isSaved = !!saved;
    res.status(200).json(post);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/posts/:id', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedupdates = ['description'];
  const isValidOperation = updates.every((update) =>
    allowedupdates.includes(update)
  );
  if (!isValidOperation) {
    return res.status(400).json({ error: 'Invalid updates!' });
  }
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
    }
    updates.forEach((update) => (post[update] = req.body[update]));
    await post.save();
    // populate post with user info only name and username
    await post.populate({ path: 'owner', select: 'name username avatarKey' });
    res.status(200).json(post);
  } catch (e) {
    res.status(400).send(e);
  }
});
router.delete('/posts/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.imageName) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: post.imageName,
        })
      );
    }
    await Saved.deleteMany({ post: post._id });
    await User.findOneAndUpdate(
      { _id: req.user._id },
      { $inc: { postsCnt: -1 } }
    );

    res.status(200).json(post);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/posts/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
    });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const like = new Like({ user: req.user._id, post: post._id });
    await like.save();
    await post.updateOne({ $inc: { likesCount: 1 } });
    res.status(201).json(like);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/posts/:id/unlike', auth, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
    });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const like = await Like.findOneAndDelete({
      user: req.user._id,
      post: post._id,
    });
    if (!like) {
      return res.status(404).json({ error: 'Like not found' });
    }
    await post.updateOne({ $inc: { likesCount: -1 } });
    res.status(201).json(like);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/posts/:id/likes', async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
    });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.status(200).json(post.likes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/posts/:id/comments', async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
    });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    // populate comments with user info only name and username
    await post.populate({
      path: 'comments',
      populate: { path: 'user', select: 'name username avatarKey' },
      options: {
        sort: { createdAt: -1 },
        skip: req.query.skip ? parseInt(req.query.skip, 10) : 0,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 10,
      },
    });
    res.status(200).json(post.comments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/posts/:id/comment', auth, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
    });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const comment = new Comment({
      ...req.body,
      user: req.user._id,
      post: post._id,
    });
    await comment.save();
    await post.updateOne({ $inc: { commentsCount: 1 } });
    await comment.populate({ path: 'user', select: 'name username avatarKey' });
    res.status(201).json(comment);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/posts/:id/comment/:commentId', auth, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
    });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const comment = await Comment.findOneAndDelete({
      _id: req.params.commentId,
      user: req.user._id,
      post: post._id,
    });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.status(200).json(comment);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/posts/:username/saved', auth, async (req, res) => {
  try {
    const skip = req.query.skip ? parseInt(req.query.skip, 10) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 3;

    // Fetch saved posts with user filtering and pagination
    const savedPosts = await Saved.find({ user: req.user._id })
      .populate({
        path: 'post',
        populate: { path: 'owner', select: 'name username avatarKey' },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // If there are no saved posts, return empty array
    if (!savedPosts.length) {
      return res.status(200).json([]);
    }

    // Process posts to attach image URLs and like/saved status
    // console.log(savedPosts);
    const enhancedPosts = await Promise.all(
      savedPosts.map(async (savedItem) => {
        const post = savedItem.post.toObject();

        if (post.imageName) {
          post.imageUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({
              Bucket: process.env.BUCKET_NAME,
              Key: post.imageName,
            }),
            { expiresIn: 60 * 10 } // 10 minutes
          );
        }

        const [like] = await Promise.all([
          Like.findOne({ post: post._id, user: req.user._id }),
        ]);

        // Attach isLiked and isSaved properties
        post.isLiked = !!like;
        post.isSaved = true;

        return post;
      })
    );

    // Return the enhanced posts
    res.status(200).json(enhancedPosts);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

router.post('/posts/:id/save', auth, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
    });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const saved = new Saved({ user: req.user._id, post: post._id });
    await saved.save();
    res.status(201).json(saved);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/posts/:id/unsave', auth, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
    });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const saved = await Saved.findOneAndDelete({
      user: req.user._id,
      post: post._id,
    });
    if (!saved) {
      return res.status(404).json({ error: 'Saved not found' });
    }
    res.status(200).json(saved);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
